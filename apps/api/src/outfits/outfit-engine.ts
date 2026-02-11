import { OutfitRecommendation, StyleProfile } from '@fashion/shared';

export interface EngineGarment {
  id: string;
  userId: string;
  imageUrl: string;
  removedBgUrl: string | null;
  category: string;
  subcategory: string | null;
  colors: string[];
  patternType: string | null;
  textureTags: string[];
  formalityScore: number;
  seasonTags: string[];
  brand: string | null;
  silhouetteTag: string | null;
  tags: string[];
  createdAt: string;
}

export interface OutfitConstraints {
  occasionTag?: string;
  seasonTag?: string;
  limit?: number;
}

interface OutfitCandidate {
  garments: EngineGarment[];
  occasionTag: string;
  seasonTag: string;
}

const NEUTRALS = new Set(['black', 'navy', 'grey', 'gray', 'beige', 'white', 'olive', 'brown', 'cream']);

export function generateCandidateOutfits(
  garments: EngineGarment[],
  styleProfile: StyleProfile,
  constraints: OutfitConstraints = {},
): Array<OutfitRecommendation> {
  const bySlot = splitBySlot(garments);
  const tops = bySlot.top.slice(0, 16);
  const bottoms = bySlot.bottom.slice(0, 16);
  const shoes = bySlot.shoes.slice(0, 12);
  const onepieces = bySlot.onepiece.slice(0, 14);
  const outerwear = bySlot.outerwear.slice(0, 10);
  const midlayers = bySlot.midlayer.slice(0, 10);
  const accessories = bySlot.accessory.slice(0, 10);

  if (shoes.length === 0) {
    return [];
  }

  const hasTwoPieceBase = tops.length > 0 && bottoms.length > 0;
  const hasOnePieceBase = onepieces.length > 0;

  if (!hasTwoPieceBase && !hasOnePieceBase) {
    return [];
  }

  const season = (constraints.seasonTag || inferPreferredSeason(styleProfile)).toLowerCase();
  const occasion = constraints.occasionTag || inferOccasion(styleProfile);
  const candidates: OutfitCandidate[] = [];
  const maxCandidates = 700;

  if (hasTwoPieceBase) {
    for (const top of tops) {
      for (const bottom of bottoms) {
        for (const shoe of shoes) {
          if (candidates.length >= maxCandidates) break;

          const base = [top, bottom, shoe];
          const layeringMode = normalizeLayeringMode(styleProfile.climate);

          if (layeringMode === 'hot') {
            candidates.push({ garments: maybeAddAccessory(base, accessories, styleProfile), seasonTag: season, occasionTag: occasion });
            continue;
          }

          if (layeringMode === 'cold') {
            if (outerwear.length > 0) {
              for (const outer of outerwear.slice(0, 4)) {
                const withOuter = [...base, outer];
                const withMid = maybeAddMidlayer(withOuter, midlayers, styleProfile);
                candidates.push({ garments: maybeAddAccessory(withMid, accessories, styleProfile), seasonTag: season, occasionTag: occasion });
              }
            } else {
              candidates.push({ garments: maybeAddAccessory(base, accessories, styleProfile), seasonTag: season, occasionTag: occasion });
            }
            continue;
          }

          // Mild climate defaults to 2 layers optionally.
          candidates.push({ garments: maybeAddAccessory(base, accessories, styleProfile), seasonTag: season, occasionTag: occasion });
          for (const outer of outerwear.slice(0, 2)) {
            candidates.push({
              garments: maybeAddAccessory([...base, outer], accessories, styleProfile),
              seasonTag: season,
              occasionTag: occasion,
            });
          }
        }
      }
    }
  }

  if (hasOnePieceBase) {
    for (const onepiece of onepieces) {
      for (const shoe of shoes) {
        if (candidates.length >= maxCandidates) break;

        const base = [onepiece, shoe];
        const layeringMode = normalizeLayeringMode(styleProfile.climate);

        if (layeringMode === 'hot') {
          candidates.push({ garments: maybeAddAccessory(base, accessories, styleProfile), seasonTag: season, occasionTag: occasion });
          continue;
        }

        if (layeringMode === 'cold') {
          if (outerwear.length > 0) {
            for (const outer of outerwear.slice(0, 4)) {
              const withOuter = [...base, outer];
              candidates.push({ garments: maybeAddAccessory(withOuter, accessories, styleProfile), seasonTag: season, occasionTag: occasion });
            }
          } else {
            candidates.push({ garments: maybeAddAccessory(base, accessories, styleProfile), seasonTag: season, occasionTag: occasion });
          }
          continue;
        }

        candidates.push({ garments: maybeAddAccessory(base, accessories, styleProfile), seasonTag: season, occasionTag: occasion });
        for (const outer of outerwear.slice(0, 2)) {
          candidates.push({
            garments: maybeAddAccessory([...base, outer], accessories, styleProfile),
            seasonTag: season,
            occasionTag: occasion,
          });
        }
      }
    }
  }

  const ranked = candidates
    .map((candidate) => {
      const score = scoreOutfit(candidate.garments, styleProfile, candidate);
      const explanations = explainOutfit(candidate.garments, styleProfile, candidate);
      const formalityScore = average(candidate.garments.map((g) => g.formalityScore));
      const colorPalette = Array.from(
        new Set(candidate.garments.flatMap((g) => normalizeColors(g.colors)).slice(0, 6)),
      );
      const silhouetteTag = inferSilhouetteTag(candidate.garments);

      return {
        garmentIds: candidate.garments.map((g) => g.id),
        occasionTag: candidate.occasionTag,
        seasonTag: candidate.seasonTag,
        formalityScore,
        colorPalette,
        silhouetteTag,
        explanations,
        score,
      } as OutfitRecommendation;
    })
    .filter((outfit) => outfit.score > 35)
    .sort((a, b) => b.score - a.score);

  const limit = constraints.limit ?? 10;
  return ranked.slice(0, limit);
}

export function scoreOutfit(
  garments: EngineGarment[],
  styleProfile: StyleProfile,
  constraints: { occasionTag?: string; seasonTag?: string } = {},
): number {
  const profile = normalizeProfile(styleProfile);
  const colors = garments.flatMap((g) => normalizeColors(g.colors));
  const uniqueColors = Array.from(new Set(colors));
  const patterned = garments.filter((g) => isPatterned(g.patternType));
  const accents = uniqueColors.filter((c) => !isNeutral(c, profile));
  const avoidedHits = uniqueColors.filter((c) => profile.avoidedColors.includes(c));

  let score = 50;

  // 1) Color harmony component.
  if (avoidedHits.length > 0) {
    score -= avoidedHits.length * 18;
  }

  if (profile.riskLevel === 'safe') {
    score += accents.length <= 1 ? 16 : -14;
    score += uniqueColors.length <= 3 ? 8 : -8;
  } else if (profile.riskLevel === 'balanced') {
    score += accents.length <= 2 ? 10 : -8;
  } else {
    score += accents.length <= 3 ? 8 : -6;
  }

  // 2) Pattern control component.
  if (profile.patternComfort === 'solids only') {
    score += patterned.length === 0 ? 12 : -24;
  } else if (profile.patternComfort === 'some patterns') {
    score += patterned.length <= 1 ? 8 : -12;
  } else {
    if (patterned.length <= 2) {
      score += 8;
      if (patterned.length === 2) {
        const distinctPatterns = new Set(patterned.map((g) => (g.patternType || '').toLowerCase())).size;
        score += distinctPatterns > 1 ? 4 : -4;
      }
    } else {
      score -= 10;
    }
  }

  // 3) Layering vs climate component.
  const layerMode = normalizeLayeringMode(profile.climate);
  const outfitLayerCount = garments.length;
  if (layerMode === 'hot') score += outfitLayerCount <= 3 ? 8 : -10;
  if (layerMode === 'mild') score += outfitLayerCount >= 3 ? 6 : 2;
  if (layerMode === 'cold') {
    const hasOuterwear = garments.some((g) => slotOf(g) === 'outerwear');
    score += hasOuterwear ? 12 : -16;
  }

  // 4) Texture depth component.
  const textureCount = new Set(garments.flatMap((g) => g.textureTags.map((t) => t.toLowerCase()))).size;
  const allBasics = patterned.length === 0 && textureCount === 0;
  if (allBasics) score -= 6;
  if (textureCount >= 1) score += 6;

  // 5) Dress-code/formality component.
  const avgFormality = average(garments.map((g) => g.formalityScore));
  const workOrFormalContext =
    profile.contexts.includes('work') ||
    profile.dressCodes.includes('business casual') ||
    profile.dressCodes.includes('smart casual') ||
    profile.dressCodes.includes('formal');

  if (workOrFormalContext) {
    if (profile.dressCodes.includes('formal')) {
      score += avgFormality >= 4 ? 14 : -18;
      const sneakers = garments.find((g) => slotOf(g) === 'shoes' && containsAny(g.category, ['sneaker']));
      if (sneakers && !profile.shoesPreference.includes('sneakers')) score -= 10;
    } else {
      score += avgFormality >= 3 ? 10 : -12;
    }
  }

  // 6) Silhouette balancing component.
  const top = garments.find((g) => slotOf(g) === 'top');
  const bottom = garments.find((g) => slotOf(g) === 'bottom');
  const topOversized = isOversized(top);
  const bottomWide = isWide(bottom);

  if (topOversized && bottomWide && profile.fitPreference !== 'oversized') {
    score -= 9;
  } else if (top && bottom) {
    score += 5;
  }

  // 7) Preference/comfort constraints component.
  for (const liked of profile.likedColors) {
    if (uniqueColors.includes(liked)) score += 2;
  }

  for (const constraint of profile.comfortConstraints) {
    if (constraint.includes('no heels') && garments.some((g) => slotOf(g) === 'shoes' && containsAny(g.subcategory || g.category, ['heel']))) {
      score -= 14;
    }
    if (constraint.includes('heavy layers') && garments.length > 3) {
      score -= 8;
    }
    if (constraint.includes('hate skinny jeans') && garments.some((g) => containsAny(g.subcategory, ['skinny']))) {
      score -= 10;
    }
    if (constraint.includes('tight collars') && garments.some((g) => containsAny(g.subcategory, ['turtleneck', 'collar']))) {
      score -= 8;
    }
  }

  // 8) Seasonal relevance component.
  const targetSeason = (constraints.seasonTag || inferPreferredSeason(styleProfile)).toLowerCase();
  const seasonalHits = garments.filter((g) => g.seasonTags.map((s) => s.toLowerCase()).includes(targetSeason)).length;
  score += seasonalHits >= 2 ? 6 : 0;

  return Math.round(clamp(score, 0, 100));
}

export function explainOutfit(
  garments: EngineGarment[],
  styleProfile: StyleProfile,
  constraints: { occasionTag?: string; seasonTag?: string } = {},
): string[] {
  const profile = normalizeProfile(styleProfile);
  const colors = Array.from(new Set(garments.flatMap((g) => normalizeColors(g.colors))));
  const accents = colors.filter((c) => !isNeutral(c, profile));
  const patterned = garments.filter((g) => isPatterned(g.patternType));
  const explanations: string[] = [];

  if (accents.length <= 1) {
    explanations.push('Balanced palette: neutrals lead with a controlled accent.');
  } else {
    explanations.push('Color contrast adds visual energy while keeping key anchors neutral.');
  }

  if (patterned.length === 0) {
    explanations.push('Solid-heavy mix keeps the outfit versatile and easy to style.');
  } else if (patterned.length === 1) {
    explanations.push('Single patterned piece creates focus without overwhelming the look.');
  } else {
    explanations.push('Multiple patterns work because the palette stays coordinated.');
  }

  const layerMode = normalizeLayeringMode(profile.climate);
  if (layerMode === 'cold' && garments.some((g) => slotOf(g) === 'outerwear')) {
    explanations.push('Layering is climate-appropriate with an outerwear anchor.');
  } else if (layerMode === 'hot') {
    explanations.push('Lightweight build suits warm weather and improves comfort.');
  } else {
    explanations.push('Layer balance supports mild weather transitions.');
  }

  const avgFormality = average(garments.map((g) => g.formalityScore));
  explanations.push(`Formality sits around ${avgFormality}/5, aligned with ${constraints.occasionTag || inferOccasion(styleProfile)} use.`);

  const top = garments.find((g) => slotOf(g) === 'top');
  const bottom = garments.find((g) => slotOf(g) === 'bottom');
  if (top && bottom) {
    if (isOversized(top) && !isWide(bottom)) {
      explanations.push('Silhouette is balanced: volume up top with a cleaner bottom line.');
    } else if (isWide(bottom) && !isOversized(top)) {
      explanations.push('Silhouette is balanced: wide bottom paired with a cleaner top.');
    }
  }

  return Array.from(new Set(explanations)).slice(0, 5);
}

function splitBySlot(garments: EngineGarment[]) {
  const slots = {
    top: [] as EngineGarment[],
    bottom: [] as EngineGarment[],
    shoes: [] as EngineGarment[],
    onepiece: [] as EngineGarment[],
    outerwear: [] as EngineGarment[],
    midlayer: [] as EngineGarment[],
    accessory: [] as EngineGarment[],
  };

  for (const garment of garments) {
    const slot = slotOf(garment);
    if (slot === 'unknown') continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (slots as any)[slot].push(garment);
  }

  return slots;
}

function slotOf(garment: EngineGarment): 'top' | 'bottom' | 'shoes' | 'onepiece' | 'outerwear' | 'midlayer' | 'accessory' | 'unknown' {
  const value = `${garment.category} ${garment.subcategory || ''}`.toLowerCase();

  if (containsAny(value, ['dress', 'jumpsuit', 'romper', 'overall'])) return 'onepiece';
  if (containsAny(value, ['shoe', 'sneaker', 'boot', 'loafer', 'heel', 'sandal'])) return 'shoes';
  if (containsAny(value, ['coat', 'jacket', 'blazer', 'parka', 'outerwear'])) return 'outerwear';
  if (containsAny(value, ['hoodie', 'knit', 'sweater', 'cardigan', 'vest'])) return 'midlayer';
  if (containsAny(value, ['pant', 'trouser', 'jean', 'skirt', 'short'])) return 'bottom';
  if (containsAny(value, ['bag', 'belt', 'watch', 'hat', 'scarf', 'accessory', 'jewelry'])) return 'accessory';
  if (containsAny(value, ['top', 'shirt', 'tee', 'tshirt', 'blouse', 'tank'])) return 'top';

  return 'unknown';
}

function normalizeProfile(profile: StyleProfile) {
  return {
    contexts: lower(profile.contexts),
    dressCodes: lower(profile.dressCodes),
    riskLevel: profile.riskLevel.toLowerCase(),
    preferredNeutrals: lower(profile.preferredNeutrals),
    likedColors: lower(profile.likedColors),
    avoidedColors: lower(profile.avoidedColors),
    patternComfort: profile.patternComfort.toLowerCase(),
    shoesPreference: lower(profile.shoesPreference),
    fitPreference: profile.fitPreference.toLowerCase(),
    comfortConstraints: lower(profile.comfortConstraints),
    climate: profile.climate,
  };
}

function inferPreferredSeason(profile: StyleProfile): string {
  const climate = profile.climate.toLowerCase();
  if (climate === 'cold') return 'winter';
  if (climate === 'hot') return 'summer';
  if (climate === 'mild') return 'spring';
  return 'fall';
}

function inferOccasion(profile: StyleProfile): string {
  return profile.contexts[0] || 'Weekend casual';
}

function normalizeLayeringMode(climate: string): 'hot' | 'mild' | 'cold' {
  const normalized = climate.toLowerCase();
  if (normalized === 'hot') return 'hot';
  if (normalized === 'cold') return 'cold';
  return 'mild';
}

function maybeAddAccessory(base: EngineGarment[], accessories: EngineGarment[], profile: StyleProfile): EngineGarment[] {
  const normalizedLevel = profile.accessoriesLevel.toLowerCase();
  if (normalizedLevel === 'none' || accessories.length === 0) return base;
  if (normalizedLevel === 'minimal') return [...base, accessories[0]];
  return [...base, ...accessories.slice(0, 2)];
}

function maybeAddMidlayer(base: EngineGarment[], midlayers: EngineGarment[], profile: StyleProfile): EngineGarment[] {
  if (profile.riskLevel.toLowerCase() === 'safe' || midlayers.length === 0) return base;
  return [...base, midlayers[0]];
}

function normalizeColors(colors: string[]): string[] {
  return colors.map((c) => c.toLowerCase().trim()).filter(Boolean);
}

function isNeutral(color: string, profile: ReturnType<typeof normalizeProfile>): boolean {
  return profile.preferredNeutrals.includes(color) || NEUTRALS.has(color);
}

function isPatterned(patternType?: string | null): boolean {
  const normalized = (patternType || '').toLowerCase();
  if (!normalized) return false;
  return !containsAny(normalized, ['solid', 'none']);
}

function inferSilhouetteTag(garments: EngineGarment[]): string {
  const top = garments.find((g) => slotOf(g) === 'top');
  const bottom = garments.find((g) => slotOf(g) === 'bottom');

  if (isOversized(top) && isWide(bottom)) return 'volume-on-volume';
  if (isOversized(top) && !isWide(bottom)) return 'oversized-top-balanced-bottom';
  if (isWide(bottom) && !isOversized(top)) return 'clean-top-wide-bottom';
  return 'balanced';
}

function isOversized(garment?: EngineGarment) {
  if (!garment) return false;
  const value = `${garment.silhouetteTag || ''} ${garment.subcategory || ''}`.toLowerCase();
  return containsAny(value, ['oversized', 'boxy', 'relaxed']);
}

function isWide(garment?: EngineGarment) {
  if (!garment) return false;
  const value = `${garment.silhouetteTag || ''} ${garment.subcategory || ''}`.toLowerCase();
  return containsAny(value, ['wide', 'relaxed', 'loose']);
}

function containsAny(value: string | null | undefined, needles: string[]): boolean {
  const normalized = (value || '').toLowerCase();
  return needles.some((needle) => normalized.includes(needle));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

function lower(values: string[]): string[] {
  return values.map((v) => v.toLowerCase());
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
