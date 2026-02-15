import { ClothingCategory, ClothingItem, LayoutItem, OutfitSurface } from './types';

type MainSlot = 'outerwear' | 'top' | 'bottom' | 'shoes';

type SlotConfig = {
  slot: MainSlot;
  items: ClothingItem[];
};

const BASE_WIDTH_RATIO: Record<ClothingCategory, number> = {
  outerwear: 0.36,
  top: 0.33,
  pants: 0.31,
  shorts: 0.27,
  skirt: 0.29,
  shoes: 0.24,
  accessory: 0.17,
};

const MAX_HEIGHT_RATIO: Record<ClothingCategory, number> = {
  outerwear: 0.44,
  top: 0.42,
  pants: 0.44,
  shorts: 0.28,
  skirt: 0.34,
  shoes: 0.2,
  accessory: 0.16,
};

const CATEGORY_SCALE: Record<ClothingCategory, number> = {
  outerwear: 1,
  top: 1,
  pants: 1,
  shorts: 1,
  skirt: 1,
  shoes: 1,
  accessory: 1,
};

const SURFACE_PADDING_RATIO = 0.08;
const ROTATION_RANGE_DEGREES = 8;

export function solveOutfitLayout(items: ClothingItem[], surface: OutfitSurface): LayoutItem[] {
  if (items.length === 0 || surface.width <= 0 || surface.height <= 0) {
    return [];
  }

  const categorized = categorizeItems(items);
  const slots = buildMainSlots(categorized);
  const accessories = categorized.accessories;

  const centerX = surface.width / 2;
  const centerY = surface.height / 2;
  const padding = surface.width * SURFACE_PADDING_RATIO;

  const mainLayouts: LayoutItem[] = [];

  if (slots.length > 0) {
    const averageWidth = calculateAverageWidth(items, surface);
    const interSlotGap = clamp(averageWidth * 0.12, 14, 28);
    const slotHeights = slots.map((slot) => estimateSlotHeight(slot.items, surface));
    const totalMainHeight = slotHeights.reduce((sum, value) => sum + value, 0);
    const totalGapHeight = interSlotGap * Math.max(0, slots.length - 1);
    let cursorY = centerY - (totalMainHeight + totalGapHeight) / 2;

    slots.forEach((slotConfig, slotIndex) => {
      const slotHeight = slotHeights[slotIndex];
      const slotCenterY = cursorY + slotHeight / 2;
      const slotItems = [...slotConfig.items].sort((a, b) => a.id.localeCompare(b.id));
      const middle = (slotItems.length - 1) / 2;

      slotItems.forEach((item, index) => {
        const bounds = estimateGarmentBounds(item, surface, CATEGORY_SCALE[item.category]);
        const offset = index - middle;
        const directionalSign = offset === 0 ? 0 : offset > 0 ? 1 : -1;
        const lateralGap = bounds.width * 0.66 + bounds.width * 0.14;
        const x = clamp(
          centerX + offset * lateralGap,
          padding + bounds.width / 2,
          surface.width - padding - bounds.width / 2,
        );
        const y = clamp(
          slotCenterY + Math.abs(offset) * bounds.height * 0.03,
          padding + bounds.height / 2,
          surface.height - padding - bounds.height / 2,
        );
        const seeded = seededNumber(`${slotConfig.slot}:${item.id}`);
        const rotation = clamp(
          (seeded * 2 - 1) * ROTATION_RANGE_DEGREES + directionalSign * 1.2,
          -ROTATION_RANGE_DEGREES,
          ROTATION_RANGE_DEGREES,
        );
        const zIndex = slotIndex * 10 + index;

        mainLayouts.push({
          item,
          x,
          y,
          scale: CATEGORY_SCALE[item.category],
          rotation,
          zIndex,
        });
      });

      cursorY += slotHeight + interSlotGap;
    });
  }

  const accessoryLayouts = layoutAccessories(accessories, surface, mainLayouts.length);

  return [...mainLayouts, ...accessoryLayouts].sort((a, b) => a.zIndex - b.zIndex);
}

export function estimateGarmentBounds(
  item: ClothingItem,
  surface: OutfitSurface,
  scale = 1,
): { width: number; height: number } {
  const aspectRatio = clamp(item.aspectRatio || 0.75, 0.35, 2.2);
  const baseWidth = surface.width * BASE_WIDTH_RATIO[item.category];
  let width = baseWidth * clamp(scale, 0.2, 3);
  let height = width / aspectRatio;

  const maxHeight = surface.height * MAX_HEIGHT_RATIO[item.category];
  if (height > maxHeight) {
    const ratio = maxHeight / height;
    width *= ratio;
    height = maxHeight;
  }

  return {
    width,
    height,
  };
}

function categorizeItems(items: ClothingItem[]): {
  outerwear: ClothingItem[];
  tops: ClothingItem[];
  bottoms: ClothingItem[];
  shoes: ClothingItem[];
  accessories: ClothingItem[];
} {
  const outerwear: ClothingItem[] = [];
  const tops: ClothingItem[] = [];
  const bottoms: ClothingItem[] = [];
  const shoes: ClothingItem[] = [];
  const accessories: ClothingItem[] = [];

  for (const item of items) {
    if (item.category === 'outerwear') {
      outerwear.push(item);
      continue;
    }
    if (item.category === 'top') {
      tops.push(item);
      continue;
    }
    if (item.category === 'pants' || item.category === 'shorts' || item.category === 'skirt') {
      bottoms.push(item);
      continue;
    }
    if (item.category === 'shoes') {
      shoes.push(item);
      continue;
    }
    accessories.push(item);
  }

  return {
    outerwear,
    tops,
    bottoms,
    shoes,
    accessories,
  };
}

function buildMainSlots(categorized: ReturnType<typeof categorizeItems>): SlotConfig[] {
  const slots: SlotConfig[] = [];
  if (categorized.outerwear.length > 0) {
    slots.push({ slot: 'outerwear', items: categorized.outerwear });
  }
  if (categorized.tops.length > 0) {
    slots.push({ slot: 'top', items: categorized.tops });
  }
  if (categorized.bottoms.length > 0) {
    slots.push({ slot: 'bottom', items: categorized.bottoms });
  }
  if (categorized.shoes.length > 0) {
    slots.push({ slot: 'shoes', items: categorized.shoes });
  }
  return slots;
}

function estimateSlotHeight(items: ClothingItem[], surface: OutfitSurface): number {
  const heights = items.map((item) => estimateGarmentBounds(item, surface, CATEGORY_SCALE[item.category]).height);
  const tallest = heights.reduce((max, value) => Math.max(max, value), 0);
  return tallest * 1.06;
}

function calculateAverageWidth(items: ClothingItem[], surface: OutfitSurface): number {
  const total = items.reduce(
    (sum, item) => sum + estimateGarmentBounds(item, surface, CATEGORY_SCALE[item.category]).width,
    0,
  );
  return total / items.length;
}

function layoutAccessories(
  accessories: ClothingItem[],
  surface: OutfitSurface,
  startingZIndex: number,
): LayoutItem[] {
  if (accessories.length === 0) {
    return [];
  }

  const sorted = [...accessories].sort((a, b) => a.id.localeCompare(b.id));
  const centerX = surface.width / 2;
  const padding = surface.width * SURFACE_PADDING_RATIO;
  const layouts: LayoutItem[] = [];

  sorted.forEach((item, index) => {
    const bounds = estimateGarmentBounds(item, surface, CATEGORY_SCALE[item.category] * 0.95);
    const lane = Math.floor(index / 2);
    const side = index % 2 === 0 ? -1 : 1;
    const xAnchor = centerX + side * surface.width * 0.34;
    const laneStep = clamp(bounds.height * 0.9 + bounds.width * 0.14, 44, 114);
    const yBase = surface.height * 0.24 + lane * laneStep;
    const xNudge = side * ((lane % 3) * bounds.width * 0.08);

    const x = clamp(
      xAnchor + xNudge,
      padding + bounds.width / 2,
      surface.width - padding - bounds.width / 2,
    );
    const y = clamp(
      yBase,
      padding + bounds.height / 2,
      surface.height - padding - bounds.height / 2,
    );
    const seeded = seededNumber(`accessory:${item.id}`);
    const rotation = clamp((seeded * 2 - 1) * ROTATION_RANGE_DEGREES + side * 1.5, -8, 8);

    layouts.push({
      item,
      x,
      y,
      scale: CATEGORY_SCALE[item.category] * 0.95,
      rotation,
      zIndex: startingZIndex + index,
    });
  });

  return layouts;
}

function seededNumber(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10000) / 10000;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

