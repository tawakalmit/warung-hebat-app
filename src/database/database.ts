import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL, SEED_DATA_SQL } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync('warung_hebat.db');

  // Enable WAL mode for better performance
  await db.execAsync('PRAGMA journal_mode = WAL;');

  // Create tables
  await db.execAsync(CREATE_TABLES_SQL);

  // Seed default data
  await db.execAsync(SEED_DATA_SQL);

  // Migrations - add logo_uri column if not exists
  try {
    await db.execAsync(`ALTER TABLE store_settings ADD COLUMN logo_uri TEXT;`);
  } catch {
    // Column already exists, ignore
  }

  // Migration: recreate transaction_items without FK on product_id
  // This allows manual items (product_id = NULL) to be inserted
  await migrateTransactionItems(db);

  // Enable foreign keys AFTER migrations
  await db.execAsync('PRAGMA foreign_keys = ON;');

  return db;
}

/**
 * Migrasi transaction_items: hapus FK constraint pada product_id
 * agar bisa insert item manual (product_id NULL).
 * 
 * SQLite tidak support DROP CONSTRAINT, jadi kita recreate tabel.
 */
async function migrateTransactionItems(database: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // Check if migration needed by looking at table info
    const tableInfo = await database.getAllAsync<{ name: string; notnull: number }>(
      `PRAGMA table_info(transaction_items)`
    );
    
    const productIdCol = tableInfo.find(col => col.name === 'product_id');
    
    // If product_id is NOT NULL (notnull=1), we need to migrate
    if (productIdCol && productIdCol.notnull === 1) {
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS transaction_items_new (
          id TEXT PRIMARY KEY,
          transaction_id TEXT NOT NULL,
          product_id TEXT,
          product_name TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          price REAL NOT NULL,
          discount REAL DEFAULT 0,
          subtotal REAL NOT NULL,
          FOREIGN KEY (transaction_id) REFERENCES transactions(id)
        );
        
        INSERT OR IGNORE INTO transaction_items_new 
          SELECT * FROM transaction_items;
        
        DROP TABLE transaction_items;
        
        ALTER TABLE transaction_items_new RENAME TO transaction_items;
      `);
    }
  } catch (error) {
    // If migration fails (e.g., table doesn't exist yet), that's fine
    console.log('Migration check:', error);
  }
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}
