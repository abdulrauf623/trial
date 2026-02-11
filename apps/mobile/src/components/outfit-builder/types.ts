import { BuilderWardrobeItem } from '@fashion/shared';

export interface BuilderCanvasItem {
  id: string;
  wardrobeItemId: string;
  wardrobeItem: BuilderWardrobeItem;
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  scale: number;
  rotation: number; // degrees
  zIndex: number;
  mirror: boolean;
  labelText?: string | null;
  labelVisible: boolean;
}
