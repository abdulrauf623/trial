import { WardrobeAssetsByCategory, WardrobeCategory } from './types';

export const WARDROBE_CATEGORY_ORDER: WardrobeCategory[] = [
  'tops',
  'bottoms',
  'outerwear',
  'shoes',
  'accessories',
  'unsorted',
];

export const WARDROBE_CATEGORY_LABELS: Record<WardrobeCategory, string> = {
  tops: 'Tops',
  bottoms: 'Bottoms',
  outerwear: 'Outerwear',
  shoes: 'Shoes',
  accessories: 'Accessories',
  unsorted: 'Unsorted',
};

export const CATEGORY_CANONICAL_HEIGHT: Record<WardrobeCategory, number> = {
  tops: 240,
  bottoms: 260,
  outerwear: 280,
  shoes: 160,
  accessories: 170,
  unsorted: 220,
};

export const CATEGORY_DISPLAY_HEIGHT: Record<WardrobeCategory, number> = {
  tops: 210,
  bottoms: 224,
  outerwear: 236,
  shoes: 150,
  accessories: 162,
  unsorted: 196,
};

const TOPS_KEYWORDS = ['top', 'tee', 'shirt', 'tshirt', 'sweater', 'blouse', 'dress', 'hoodie'];
const BOTTOMS_KEYWORDS = ['pant', 'bottom', 'jean', 'trouser', 'short', 'skirt', 'legging'];
const OUTERWEAR_KEYWORDS = ['outerwear', 'jacket', 'coat', 'blazer', 'cardigan'];
const SHOES_KEYWORDS = ['shoe', 'sneaker', 'boot', 'heel', 'loafer', 'sandal'];
const ACCESSORIES_KEYWORDS = ['accessory', 'bag', 'hat', 'belt', 'watch', 'scarf', 'glasses', 'jewel'];

export function normalizeWardrobeCategory(raw?: string | null): WardrobeCategory {
  if (!raw) return 'unsorted';
  const value = raw.trim().toLowerCase();

  if (value.includes('outerwear') || includesAny(value, OUTERWEAR_KEYWORDS)) return 'outerwear';
  if (value.includes('shoe') || includesAny(value, SHOES_KEYWORDS)) return 'shoes';
  if (value.includes('access') || includesAny(value, ACCESSORIES_KEYWORDS)) return 'accessories';
  if (value.includes('bottom') || includesAny(value, BOTTOMS_KEYWORDS)) return 'bottoms';
  if (value.includes('top') || includesAny(value, TOPS_KEYWORDS)) return 'tops';

  return 'unsorted';
}

function includesAny(value: string, keywords: string[]): boolean {
  return keywords.some((keyword) => value.includes(keyword));
}

export function createEmptyWardrobeAssetsByCategory(): WardrobeAssetsByCategory {
  return {
    tops: [],
    bottoms: [],
    outerwear: [],
    shoes: [],
    accessories: [],
    unsorted: [],
  };
}
