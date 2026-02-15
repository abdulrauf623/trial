import * as FileSystem from 'expo-file-system/legacy';
import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';
import { Image } from 'react-native';
import { CATEGORY_CANONICAL_HEIGHT, normalizeWardrobeCategory } from '../constants';
import { WardrobeAsset, WardrobeAssetPrepareInput, WardrobeBBox, WardrobePoint } from '../types';

const STORAGE_ROOT = `${FileSystem.documentDirectory}wardrobe-assets`;
const PROCESSED_DIR = `${STORAGE_ROOT}/processed`;
const THUMB_DIR = `${STORAGE_ROOT}/thumb`;
const TEMP_DIR = `${STORAGE_ROOT}/tmp`;
const ALPHA_THRESHOLD = 18;
const CROP_PADDING_RATIO = 0.12;
const THUMB_MAX = 256;

interface RawImageSize {
  width: number;
  height: number;
}

interface MaskMetrics {
  bbox: WardrobeBBox;
  anchor: WardrobePoint;
  centerOfMass: WardrobePoint;
  method: 'fallback';
}

interface CropRegion {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

interface ManipulatedImageResult {
  uri: string;
  width: number;
  height: number;
}

interface PreparedCandidate {
  resized: ManipulatedImageResult;
  metrics: MaskMetrics;
  cropRegion: CropRegion;
}

export async function prepareWardrobeAsset(input: WardrobeAssetPrepareInput): Promise<WardrobeAsset> {
  await ensureStorageDirs();

  const normalizedCategory = normalizeWardrobeCategory(input.categoryHint);
  const sourceCandidates = Array.from(
    new Set(
      [input.processedInputUri, input.originalUri].filter(
        (uri): uri is string => Boolean(uri && uri.trim()),
      ),
    ),
  );

  let prepared: PreparedCandidate | null = null;
  let lastError: unknown = null;

  for (const candidateUri of sourceCandidates) {
    try {
      prepared = await prepareCandidate(candidateUri, normalizedCategory);
      break;
    } catch (error) {
      lastError = error;
      console.log(`[WardrobePipeline] Source candidate failed, trying fallback: ${candidateUri}`);
    }
  }

  if (!prepared) {
    throw lastError instanceof Error
      ? lastError
      : new Error('Could not process any image source for wardrobe asset.');
  }

  const { resized, metrics, cropRegion } = prepared;

  const id = createAssetId();
  const processedOutputUri = `${PROCESSED_DIR}/${id}.png`;
  await FileSystem.copyAsync({ from: resized.uri, to: processedOutputUri });

  const thumbDimensions = getThumbDimensions(resized.width, resized.height, THUMB_MAX);
  const thumb = await manipulateAsync(
    resized.uri,
    [{ resize: thumbDimensions }],
    {
      format: SaveFormat.WEBP,
      compress: 0.85,
    },
  );
  const thumbOutputUri = `${THUMB_DIR}/${id}.webp`;
  await FileSystem.copyAsync({ from: thumb.uri, to: thumbOutputUri });

  const scaleX = resized.width / cropRegion.width;
  const scaleY = resized.height / cropRegion.height;

  const mappedBbox = {
    x: clamp((metrics.bbox.x - cropRegion.originX) * scaleX, 0, resized.width),
    y: clamp((metrics.bbox.y - cropRegion.originY) * scaleY, 0, resized.height),
    w: clamp(metrics.bbox.w * scaleX, 1, resized.width),
    h: clamp(metrics.bbox.h * scaleY, 1, resized.height),
  };

  const mappedAnchor = {
    x: clamp((metrics.anchor.x - cropRegion.originX) * scaleX, 0, resized.width),
    y: clamp((metrics.anchor.y - cropRegion.originY) * scaleY, 0, resized.height),
  };

  const mappedCenter = {
    x: clamp((metrics.centerOfMass.x - cropRegion.originX) * scaleX, 0, resized.width),
    y: clamp((metrics.centerOfMass.y - cropRegion.originY) * scaleY, 0, resized.height),
  };

  const timestamp = Date.now();

  return {
    id,
    createdAt: timestamp,
    updatedAt: timestamp,
    originalUri: input.originalUri,
    processedUri: processedOutputUri,
    thumbUri: thumbOutputUri,
    width: resized.width,
    height: resized.height,
    bbox: mappedBbox,
    anchor: mappedAnchor,
    centerOfMass: mappedCenter,
    category: normalizedCategory,
    sourceGarmentId: input.sourceGarmentId,
  };
}

async function ensureStorageDirs() {
  const directories = [STORAGE_ROOT, PROCESSED_DIR, THUMB_DIR, TEMP_DIR];
  await Promise.all(
    directories.map(async (uri) => {
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(uri, { intermediates: true });
      }
    }),
  );
}

async function prepareCandidate(
  sourceUri: string,
  normalizedCategory: WardrobeAsset['category'],
): Promise<PreparedCandidate> {
  const readableSourceUri = await ensureReadableLocalUri(sourceUri);
  const imageSize = await getImageSize(readableSourceUri);
  const metrics = await computeMaskMetrics(readableSourceUri, imageSize);
  const cropRegion = buildCropRegion(metrics.bbox, imageSize, CROP_PADDING_RATIO);

  const cropped = await manipulateAsync(
    readableSourceUri,
    [
      {
        crop: {
          originX: cropRegion.originX,
          originY: cropRegion.originY,
          width: cropRegion.width,
          height: cropRegion.height,
        },
      },
    ],
    {
      format: SaveFormat.PNG,
      compress: 1,
    },
  );

  const resized = await manipulateAsync(
    cropped.uri,
    [{ resize: { height: CATEGORY_CANONICAL_HEIGHT[normalizedCategory] } }],
    {
      format: SaveFormat.PNG,
      compress: 1,
    },
  );

  return {
    resized: {
      uri: resized.uri,
      width: resized.width,
      height: resized.height,
    },
    metrics,
    cropRegion,
  };
}

async function ensureReadableLocalUri(uri: string): Promise<string> {
  if (!isRemoteUri(uri)) {
    return uri;
  }

  const extension = inferImageExtension(uri);
  const destination = `${TEMP_DIR}/${createAssetId()}.${extension}`;
  const downloaded = await FileSystem.downloadAsync(uri, destination);
  return downloaded.uri;
}

async function getImageSize(uri: string): Promise<RawImageSize> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error),
    );
  });
}

async function computeMaskMetrics(uri: string, size: RawImageSize): Promise<MaskMetrics> {
  void uri;
  void ALPHA_THRESHOLD;

  // Expo Go does not expose low-level alpha pixel reads across all devices reliably.
  // Use deterministic full-frame bounds and top-center anchor until pixel scanning is added.
  const bbox: WardrobeBBox = { x: 0, y: 0, w: size.width, h: size.height };
  const anchor: WardrobePoint = { x: size.width / 2, y: 0 };
  const centerOfMass: WardrobePoint = { x: size.width / 2, y: size.height / 2 };

  return { bbox, anchor, centerOfMass, method: 'fallback' };
}

function buildCropRegion(bbox: WardrobeBBox, size: RawImageSize, paddingRatio: number): CropRegion {
  const padX = bbox.w * paddingRatio;
  const padY = bbox.h * paddingRatio;

  const originX = Math.floor(clamp(bbox.x - padX, 0, size.width - 1));
  const originY = Math.floor(clamp(bbox.y - padY, 0, size.height - 1));
  const maxWidth = size.width - originX;
  const maxHeight = size.height - originY;
  const width = Math.max(1, Math.floor(clamp(bbox.w + padX * 2, 1, maxWidth)));
  const height = Math.max(1, Math.floor(clamp(bbox.h + padY * 2, 1, maxHeight)));

  return {
    originX,
    originY,
    width,
    height,
  };
}

function getThumbDimensions(width: number, height: number, maxSize: number) {
  if (Math.max(width, height) <= maxSize) {
    return { width, height };
  }
  if (width >= height) {
    return { width: maxSize, height: Math.max(1, Math.round((height / width) * maxSize)) };
  }
  return { width: Math.max(1, Math.round((width / height) * maxSize)), height: maxSize };
}

function createAssetId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  const random = Math.random().toString(36).slice(2, 10);
  return `asset_${Date.now()}_${random}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isRemoteUri(uri: string): boolean {
  return uri.startsWith('http://') || uri.startsWith('https://');
}

function inferImageExtension(uri: string): 'png' | 'jpeg' | 'webp' {
  const cleanUri = uri.split('?')[0].toLowerCase();
  if (cleanUri.endsWith('.png')) return 'png';
  if (cleanUri.endsWith('.webp')) return 'webp';
  return 'jpeg';
}
