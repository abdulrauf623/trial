import { create } from 'zustand';
import { ClothingItem, LayoutItem, OutfitSurface } from './types';

type OutfitLayoutCacheState = {
  layoutByKey: Record<string, LayoutItem[]>;
  setLayout: (key: string, layout: LayoutItem[]) => void;
  clearLayouts: () => void;
};

export const useOutfitLayoutStore = create<OutfitLayoutCacheState>((set) => ({
  layoutByKey: {},
  setLayout: (key, layout) =>
    set((state) => ({
      layoutByKey: {
        ...state.layoutByKey,
        [key]: layout,
      },
    })),
  clearLayouts: () => set({ layoutByKey: {} }),
}));

export function buildLayoutCacheKey(items: ClothingItem[], surface: OutfitSurface): string {
  if (surface.width <= 0 || surface.height <= 0 || items.length === 0) {
    return 'empty';
  }

  const dimensions = `${Math.round(surface.width)}x${Math.round(surface.height)}`;
  const normalizedItems = [...items]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((item) => `${item.id}:${item.category}:${item.aspectRatio.toFixed(3)}`)
    .join('|');

  return `${dimensions}::${normalizedItems}`;
}

