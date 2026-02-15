import { estimateGarmentBounds } from './layoutSolver';
import { LayoutItem, OutfitSurface } from './types';

export type ShadowSpec = {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  blur: number;
  opacity: number;
};

export function buildShadowSpec(layout: LayoutItem, surface: OutfitSurface): ShadowSpec {
  const bounds = estimateGarmentBounds(layout.item, surface, layout.scale);
  const footprintScale = layout.item.category === 'shoes' ? 0.82 : 0.88;
  const width = bounds.width * footprintScale;
  const height = bounds.height * footprintScale;
  const magnitude = Math.max(bounds.width, bounds.height) * 0.03;
  const x = layout.x - width / 2 + magnitude * 0.9;
  const y = layout.y - height / 2 + magnitude * 1.1;
  const radius = Math.max(8, Math.min(width, height) * 0.24);
  const blur = Math.max(8, Math.min(28, Math.max(width, height) * 0.08));

  return {
    x,
    y,
    width,
    height,
    radius,
    blur,
    opacity: 0.15,
  };
}

