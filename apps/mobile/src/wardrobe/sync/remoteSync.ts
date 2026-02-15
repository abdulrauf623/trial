import { UserGarment } from '@fashion/shared';
import { api } from '../../services/api';
import { prepareWardrobeAsset } from '../pipeline/prepareAsset';
import { wardrobeAssetRepository } from '../storage/repository';

export interface SyncRemoteWardrobeOptions {
  limit?: number;
}

export interface SyncRemoteWardrobeResult {
  created: number;
  updated: number;
  skipped: number;
}

export async function syncRemoteGarmentsToLocal(
  options: SyncRemoteWardrobeOptions = {},
): Promise<SyncRemoteWardrobeResult> {
  const limit = options.limit ?? 200;
  const [remoteResponse, existingLocal] = await Promise.all([
    api.listUserGarments(undefined, limit),
    wardrobeAssetRepository.listAll(),
  ]);

  const existingBySource = new Map(
    existingLocal
      .filter((asset) => Boolean(asset.sourceGarmentId))
      .map((asset) => [asset.sourceGarmentId as string, asset]),
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const garment of remoteResponse.garments) {
    const cutoutUri = garment.removedBgUrl || garment.processedUrl;
    if (garment.status !== 'ready' || !cutoutUri) {
      skipped += 1;
      continue;
    }

    const existing = existingBySource.get(garment.id);
    const remoteUpdatedAt = parseIsoToMs(garment.updatedAt);
    if (existing && existing.updatedAt >= remoteUpdatedAt) {
      skipped += 1;
      continue;
    }

    try {
      const localAsset = await buildLocalAssetFromRemote(garment, cutoutUri);
      localAsset.id = existing?.id || `remote_${garment.id}`;
      localAsset.sourceGarmentId = garment.id;
      localAsset.createdAt = existing?.createdAt || parseIsoToMs(garment.createdAt);
      localAsset.updatedAt = remoteUpdatedAt;
      await wardrobeAssetRepository.upsert(localAsset);

      if (existing) {
        updated += 1;
      } else {
        created += 1;
      }
    } catch (error) {
      skipped += 1;
      console.log('[WardrobeSync] Failed to sync remote garment');
    }
  }

  return { created, updated, skipped };
}

async function buildLocalAssetFromRemote(garment: UserGarment, cutoutUri: string) {
  return prepareWardrobeAsset({
    originalUri: garment.originalUrl || cutoutUri,
    processedInputUri: cutoutUri,
    categoryHint: garment.category,
    sourceGarmentId: garment.id,
  });
}

function parseIsoToMs(value?: string | null): number {
  if (!value) return Date.now();
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}
