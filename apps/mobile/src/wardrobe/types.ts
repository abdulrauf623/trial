export type WardrobeCategory =
  | 'tops'
  | 'bottoms'
  | 'outerwear'
  | 'shoes'
  | 'accessories'
  | 'unsorted';

export interface WardrobePoint {
  x: number;
  y: number;
}

export interface WardrobeBBox extends WardrobePoint {
  w: number;
  h: number;
}

export interface WardrobeAsset {
  id: string;
  createdAt: number;
  updatedAt: number;
  originalUri: string;
  processedUri: string;
  thumbUri: string;
  width: number;
  height: number;
  bbox: WardrobeBBox;
  anchor: WardrobePoint;
  centerOfMass: WardrobePoint;
  category: WardrobeCategory;
  dominantColor?: string;
  sourceGarmentId?: string;
}

export interface WardrobeAssetPrepareInput {
  originalUri: string;
  processedInputUri?: string;
  categoryHint?: string | null;
  sourceGarmentId?: string;
}

export type WardrobeAssetsByCategory = Record<WardrobeCategory, WardrobeAsset[]>;
