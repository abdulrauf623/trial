export interface FormalityInput {
  category?: string | null;
  subcategory?: string | null;
  material?: string | null;
  tags?: string[];
}

export interface SeasonInput {
  category?: string | null;
  material?: string | null;
  textureTags?: string[];
}

/**
 * Deterministic heuristic for mapping garment metadata to a 1-5 formality score.
 * 1 = ultra casual, 5 = formal/tailored evening.
 */
export function deriveFormalityScore(input: FormalityInput): number {
  const category = normalize(input.category);
  const subcategory = normalize(input.subcategory);
  const material = normalize(input.material);
  const tags = (input.tags || []).map(normalize);

  let score = 3;

  if (containsAny(category, ['hoodie', 'sweatpants', 'jogger', 'sneaker', 'tshirt', 'tee'])) score -= 1;
  if (containsAny(category, ['blazer', 'trouser', 'loafer', 'oxford', 'coat', 'dress'])) score += 1;

  if (containsAny(subcategory, ['tailored', 'suit', 'oxford', 'pencil', 'slacks', 'loafer'])) score += 1;
  if (containsAny(subcategory, ['distressed', 'cargo', 'graphic', 'track', 'athletic'])) score -= 1;

  if (containsAny(material, ['wool', 'silk', 'linen', 'cashmere'])) score += 1;
  if (containsAny(material, ['jersey', 'fleece', 'denim'])) score -= 0.5;

  if (tags.includes('formal') || tags.includes('business')) score += 1;
  if (tags.includes('casual') || tags.includes('athletic')) score -= 1;

  return clamp(Math.round(score), 1, 5);
}

/**
 * Rule-based season inference from category/material/texture without ML.
 */
export function inferSeasonTags(input: SeasonInput): string[] {
  const category = normalize(input.category);
  const material = normalize(input.material);
  const texture = (input.textureTags || []).map(normalize).join(' ');

  const seasons = new Set<string>();

  if (containsAny(category, ['coat', 'puffer', 'parka', 'boot']) || containsAny(material, ['wool', 'cashmere', 'fleece'])) {
    seasons.add('winter');
    seasons.add('fall');
  }

  if (containsAny(category, ['shorts', 'tank', 'sandal']) || containsAny(material, ['linen', 'cotton'])) {
    seasons.add('summer');
    seasons.add('spring');
  }

  if (texture.includes('knit') || texture.includes('corduroy')) {
    seasons.add('fall');
    seasons.add('winter');
  }

  if (seasons.size === 0) {
    seasons.add('spring');
    seasons.add('summer');
    seasons.add('fall');
  }

  return Array.from(seasons);
}

function normalize(value?: string | null): string {
  return (value || '').toLowerCase().trim();
}

function containsAny(value: string, needles: string[]): boolean {
  return needles.some((needle) => value.includes(needle));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
