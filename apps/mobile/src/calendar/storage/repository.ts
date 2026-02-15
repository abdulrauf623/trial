import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';

const DB_NAME = 'wardrobe_assets.db';
const TABLE_NAME = 'wardrobe_wear_logs';

let dbPromise: Promise<SQLiteDatabase> | null = null;

interface MonthCountRow {
  date_key: string;
  count: number;
}

async function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await openDatabaseAsync(DB_NAME);
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
          id TEXT PRIMARY KEY NOT NULL,
          date_key TEXT NOT NULL,
          asset_id TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
      `);
      await db.execAsync(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_${TABLE_NAME}_date_asset ON ${TABLE_NAME}(date_key, asset_id);`,
      );
      await db.execAsync(
        `CREATE INDEX IF NOT EXISTS idx_${TABLE_NAME}_date ON ${TABLE_NAME}(date_key);`,
      );
      return db;
    })();
  }
  return dbPromise;
}

export const wearLogRepository = {
  async listAssetIdsForDate(dateKey: string): Promise<string[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<{ asset_id: string }>(
      `
      SELECT asset_id
      FROM ${TABLE_NAME}
      WHERE date_key = ?
      ORDER BY created_at ASC;
      `,
      dateKey,
    );
    return rows.map((row) => row.asset_id);
  },

  async setWorn(dateKey: string, assetId: string, worn: boolean): Promise<void> {
    const db = await getDb();
    if (worn) {
      await db.runAsync(
        `
        INSERT OR IGNORE INTO ${TABLE_NAME} (id, date_key, asset_id, created_at)
        VALUES (?, ?, ?, ?);
        `,
        createWearLogId(dateKey, assetId),
        dateKey,
        assetId,
        Date.now(),
      );
      return;
    }

    await db.runAsync(
      `DELETE FROM ${TABLE_NAME} WHERE date_key = ? AND asset_id = ?;`,
      dateKey,
      assetId,
    );
  },

  async listMonthCounts(startDateKey: string, endDateKey: string): Promise<Record<string, number>> {
    const db = await getDb();
    const rows = await db.getAllAsync<MonthCountRow>(
      `
      SELECT date_key, COUNT(*) as count
      FROM ${TABLE_NAME}
      WHERE date_key >= ? AND date_key <= ?
      GROUP BY date_key;
      `,
      startDateKey,
      endDateKey,
    );

    return rows.reduce<Record<string, number>>((accumulator, row) => {
      accumulator[row.date_key] = row.count;
      return accumulator;
    }, {});
  },
};

function createWearLogId(dateKey: string, assetId: string): string {
  return `wear_${dateKey}_${assetId}`;
}
