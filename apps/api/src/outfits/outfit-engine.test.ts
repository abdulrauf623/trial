import test from 'node:test';
import assert from 'node:assert/strict';
import { StyleProfile } from '@fashion/shared';
import { EngineGarment, generateCandidateOutfits, scoreOutfit } from './outfit-engine';

function buildProfile(overrides: Partial<StyleProfile> = {}): StyleProfile {
  return {
    userId: '11111111-1111-1111-1111-111111111111',
    contexts: ['Weekend casual'],
    dressCodes: ['Casual'],
    climate: 'Mixed',
    rainy: false,
    fitPreference: 'Regular',
    archetypes: ['Minimal', 'Classic'],
    riskLevel: 'Balanced',
    preferredNeutrals: ['Black', 'White', 'Grey'],
    likedColors: ['Blue'],
    avoidedColors: [],
    patternComfort: 'Some patterns',
    shoesPreference: ['Sneakers'],
    accessoriesLevel: 'Minimal',
    comfortConstraints: [],
    shoppingInterest: 'Balanced',
    budgetBand: 'Mid',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function garment(overrides: Partial<EngineGarment>): EngineGarment {
  return {
    id: 'g-1',
    userId: '11111111-1111-1111-1111-111111111111',
    imageUrl: 'https://example.com/item.jpg',
    removedBgUrl: null,
    category: 'top',
    subcategory: null,
    colors: ['black'],
    patternType: 'solid',
    textureTags: [],
    formalityScore: 3,
    seasonTags: ['fall', 'spring'],
    brand: null,
    silhouetteTag: null,
    tags: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

test('scoreOutfit penalizes avoided colors', () => {
  const profileWithAvoided = buildProfile({ avoidedColors: ['red'] });
  const profileNeutral = buildProfile({ avoidedColors: [] });
  const garments: EngineGarment[] = [
    garment({ id: 'top', category: 'top', colors: ['red'] }),
    garment({ id: 'bottom', category: 'pants', colors: ['black'] }),
    garment({ id: 'shoes', category: 'sneakers', colors: ['white'] }),
  ];

  const avoidedScore = scoreOutfit(garments, profileWithAvoided, { seasonTag: 'fall' });
  const baselineScore = scoreOutfit(garments, profileNeutral, { seasonTag: 'fall' });
  assert.ok(avoidedScore < baselineScore, `expected avoided score < baseline (${avoidedScore} vs ${baselineScore})`);
});

test('scoreOutfit penalizes patterns when solids-only is selected', () => {
  const profile = buildProfile({ patternComfort: 'Solids only' });
  const patterned: EngineGarment[] = [
    garment({ id: 'top', category: 'top', patternType: 'striped' }),
    garment({ id: 'bottom', category: 'pants', patternType: 'solid' }),
    garment({ id: 'shoes', category: 'sneakers', patternType: 'solid' }),
  ];
  const solids: EngineGarment[] = [
    garment({ id: 'top', category: 'top', patternType: 'solid' }),
    garment({ id: 'bottom', category: 'pants', patternType: 'solid' }),
    garment({ id: 'shoes', category: 'sneakers', patternType: 'solid' }),
  ];

  const patternedScore = scoreOutfit(patterned, profile);
  const solidsScore = scoreOutfit(solids, profile);
  assert.ok(patternedScore < solidsScore, `expected patterned score < solids score (${patternedScore} vs ${solidsScore})`);
});

test('scoreOutfit rewards cold-weather layering with outerwear', () => {
  const coldProfile = buildProfile({ climate: 'Cold' });
  const withoutOuterwear: EngineGarment[] = [
    garment({ id: 'top', category: 'top' }),
    garment({ id: 'bottom', category: 'pants' }),
    garment({ id: 'shoes', category: 'boots' }),
  ];
  const withOuterwear: EngineGarment[] = [
    ...withoutOuterwear,
    garment({ id: 'outer', category: 'coat', seasonTags: ['winter'] }),
  ];

  const baseScore = scoreOutfit(withoutOuterwear, coldProfile, { seasonTag: 'winter' });
  const layeredScore = scoreOutfit(withOuterwear, coldProfile, { seasonTag: 'winter' });
  assert.ok(layeredScore > baseScore, `expected layered score > base score (${layeredScore} vs ${baseScore})`);
});

test('generateCandidateOutfits returns ranked outfits with explanations', () => {
  const profile = buildProfile({ climate: 'Mild' });
  const garments: EngineGarment[] = [
    garment({ id: 'top-1', category: 'tshirt', colors: ['white'] }),
    garment({ id: 'bottom-1', category: 'jeans', colors: ['blue'] }),
    garment({ id: 'shoes-1', category: 'sneakers', colors: ['white'] }),
    garment({ id: 'outer-1', category: 'jacket', colors: ['black'] }),
  ];

  const outfits = generateCandidateOutfits(garments, profile, { limit: 5, occasionTag: 'Weekend casual' });
  assert.ok(outfits.length > 0, 'expected at least one generated outfit');
  assert.ok(outfits[0].garmentIds.length >= 3, 'expected top, bottom, and shoes in outfit');
  assert.ok(outfits[0].explanations.length > 0, 'expected explanation strings');
});

test('generateCandidateOutfits supports one-piece + shoes outfits', () => {
  const profile = buildProfile({ climate: 'Mild' });
  const garments: EngineGarment[] = [
    garment({ id: 'dress-1', category: 'dress', colors: ['black'], formalityScore: 4 }),
    garment({ id: 'shoes-1', category: 'heels', colors: ['black'], formalityScore: 4 }),
    garment({ id: 'outer-1', category: 'coat', colors: ['black'], formalityScore: 4 }),
  ];

  const outfits = generateCandidateOutfits(garments, profile, { seasonTag: 'fall', limit: 5 });
  assert.ok(outfits.length > 0, 'expected one-piece outfits to be generated');
  assert.ok(outfits.some((outfit) => outfit.garmentIds.includes('dress-1')), 'expected generated outfit to include dress');
});
