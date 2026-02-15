export type ClothingCategory =
  | 'outerwear'
  | 'top'
  | 'pants'
  | 'shorts'
  | 'skirt'
  | 'shoes'
  | 'accessory';

export type ClothingItem = {
  id: string;
  imageUri: string;
  category: ClothingCategory;
  aspectRatio: number;
};

export type LayoutItem = {
  item: ClothingItem;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  zIndex: number;
};

export type OutfitSurface = {
  width: number;
  height: number;
};

const CATEGORY_KEYWORDS: Array<{ category: ClothingCategory; needles: string[] }> = [
  { category: 'outerwear', needles: ['outerwear', 'coat', 'jacket', 'blazer', 'hoodie', 'cardigan'] },
  { category: 'top', needles: ['top', 'shirt', 'tee', 'tshirt', 'sweater', 'blouse', 'tank', 'polo'] },
  { category: 'pants', needles: ['pants', 'trouser', 'jean', 'bottom'] },
  { category: 'shorts', needles: ['shorts'] },
  { category: 'skirt', needles: ['skirt'] },
  { category: 'shoes', needles: ['shoe', 'sneaker', 'heel', 'boot', 'loafer', 'sandal'] },
  { category: 'accessory', needles: ['accessory', 'bag', 'belt', 'hat', 'cap', 'jewel', 'watch', 'scarf'] },
];

export function normalizeClothingCategory(rawCategory: string | null | undefined): ClothingCategory {
  const source = (rawCategory || '').trim().toLowerCase();
  for (const entry of CATEGORY_KEYWORDS) {
    if (entry.needles.some((needle) => source.includes(needle))) {
      return entry.category;
    }
  }
  return 'top';
}

const DEFAULT_ASPECT_RATIOS: Record<ClothingCategory, number> = {
  outerwear: 0.76,
  top: 0.76,
  pants: 0.66,
  shorts: 0.9,
  skirt: 0.9,
  shoes: 1.35,
  accessory: 1.05,
};

export function defaultAspectRatioForCategory(category: ClothingCategory): number {
  return DEFAULT_ASPECT_RATIOS[category];
}

