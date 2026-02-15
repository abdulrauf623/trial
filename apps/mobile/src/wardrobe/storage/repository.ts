import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';
import { createEmptyWardrobeAssetsByCategory } from '../constants';
import { WardrobeAsset, WardrobeAssetsByCategory } from '../types';

const DB_NAME = 'wardrobe_assets.db';
const TABLE_NAME = 'wardrobe_assets';

let dbPromise: Promise<SQLiteDatabase> | null = null;

interface WardrobeAssetRow {
  id: string;
  created_at: number;
  updated_at: number;
  original_uri: string;
  processed_uri: string;
  thumb_uri: string;
  width: number;
  height: number;
  bbox_json: string;
  anchor_json: string;
  center_json: string;
  category: WardrobeAsset['category'];
  dominant_color: string | null;
  source_garment_id: string | null;
}

export interface WardrobeAssetRepository {
  listAll(): Promise<WardrobeAsset[]>;
  listByCategory(): Promise<WardrobeAssetsByCategory>;
  upsert(asset: WardrobeAsset): Promise<void>;
  deleteById(id: string): Promise<void>;
  deleteBySourceGarmentId(sourceGarmentId: string): Promise<void>;
}

async function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await openDatabaseAsync(DB_NAME);
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
          id TEXT PRIMARY KEY NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          original_uri TEXT NOT NULL,
          processed_uri TEXT NOT NULL,
          thumb_uri TEXT NOT NULL,
          width INTEGER NOT NULL,
          height INTEGER NOT NULL,
          bbox_json TEXT NOT NULL,
          anchor_json TEXT NOT NULL,
          center_json TEXT NOT NULL,
          category TEXT NOT NULL,
          dominant_color TEXT,
          source_garment_id TEXT
        );
      `);
      await db.execAsync(
        `CREATE INDEX IF NOT EXISTS idx_${TABLE_NAME}_category ON ${TABLE_NAME}(category);`,
      );
      await db.execAsync(
        `CREATE INDEX IF NOT EXISTS idx_${TABLE_NAME}_source_garment ON ${TABLE_NAME}(source_garment_id);`,
      );
      return db;
    })();
  }

  return dbPromise;
}

function mapRowToAsset(row: WardrobeAssetRow): WardrobeAsset {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    originalUri: row.original_uri,
    processedUri: row.processed_uri,
    thumbUri: row.thumb_uri,
    width: row.width,
    height: row.height,
    bbox: JSON.parse(row.bbox_json),
    anchor: JSON.parse(row.anchor_json),
    centerOfMass: JSON.parse(row.center_json),
    category: row.category,
    dominantColor: row.dominant_color || undefined,
    sourceGarmentId: row.source_garment_id || undefined,
  };
}

export const wardrobeAssetRepository: WardrobeAssetRepository = {
  async listAll() {
    const db = await getDb();
    const rows = await db.getAllAsync<WardrobeAssetRow>(
      `
      SELECT
        id,
        created_at,
        updated_at,
        original_uri,
        processed_uri,
        thumb_uri,
        width,
        height,
        bbox_json,
        anchor_json,
        center_json,
        category,
        dominant_color,
        source_garment_id
      FROM ${TABLE_NAME}
      ORDER BY updated_at DESC;
      `,
    );
    return rows.map(mapRowToAsset);
  },

  async listByCategory() {
    const grouped: WardrobeAssetsByCategory = createEmptyWardrobeAssetsByCategory();
    const assets = await this.listAll();
    assets.forEach((asset) => {
      grouped[asset.category].push(asset);
    });
    return grouped;
  },

  async upsert(asset) {
    const db = await getDb();
    await db.runAsync(
      `
      INSERT INTO ${TABLE_NAME} (
        id,
        created_at,
        updated_at,
        original_uri,
        processed_uri,
        thumb_uri,
        width,
        height,
        bbox_json,
        anchor_json,
        center_json,
        category,
        dominant_color,
        source_garment_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        updated_at = excluded.updated_at,
        original_uri = excluded.original_uri,
        processed_uri = excluded.processed_uri,
        thumb_uri = excluded.thumb_uri,
        width = excluded.width,
        height = excluded.height,
        bbox_json = excluded.bbox_json,
        anchor_json = excluded.anchor_json,
        center_json = excluded.center_json,
        category = excluded.category,
        dominant_color = excluded.dominant_color,
        source_garment_id = excluded.source_garment_id;
      `,
      asset.id,
      asset.createdAt,
      asset.updatedAt,
      asset.originalUri,
      asset.processedUri,
      asset.thumbUri,
      asset.width,
      asset.height,
      JSON.stringify(asset.bbox),
      JSON.stringify(asset.anchor),
      JSON.stringify(asset.centerOfMass),
      asset.category,
      asset.dominantColor ?? null,
      asset.sourceGarmentId ?? null,
    );
  },

  async deleteById(id) {
    const db = await getDb();
    await db.runAsync(`DELETE FROM ${TABLE_NAME} WHERE id = ?;`, id);
  },

  async deleteBySourceGarmentId(sourceGarmentId) {
    const db = await getDb();
    await db.runAsync(`DELETE FROM ${TABLE_NAME} WHERE source_garment_id = ?;`, sourceGarmentId);
  },
};
