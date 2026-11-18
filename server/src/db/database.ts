import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_FILE || './data/warung_hebat.db';
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath);

// Enable WAL mode for high concurrent read/write performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    -- Tabel Pengguna (Owner & Kasir)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'kasir',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- Tabel Kategori
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- Tabel Supplier
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- Tabel Produk
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      barcode TEXT UNIQUE,
      name TEXT NOT NULL,
      category_id TEXT,
      buy_price REAL NOT NULL DEFAULT 0,
      sell_price REAL NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      min_stock INTEGER NOT NULL DEFAULT 5,
      unit TEXT NOT NULL DEFAULT 'pcs',
      image_uri TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    -- Tabel Barang Masuk
    CREATE TABLE IF NOT EXISTS stock_in (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      supplier_id TEXT,
      quantity INTEGER NOT NULL,
      buy_price REAL NOT NULL,
      note TEXT,
      user_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Tabel Transaksi Penjualan
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      invoice_number TEXT UNIQUE NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      discount REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      grand_total REAL NOT NULL DEFAULT 0,
      payment_amount REAL NOT NULL DEFAULT 0,
      change_amount REAL DEFAULT 0,
      payment_method TEXT DEFAULT 'cash',
      customer_name TEXT,
      note TEXT,
      user_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Tabel Detail Transaksi
    CREATE TABLE IF NOT EXISTS transaction_items (
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

    -- Tabel Riwayat Perubahan Harga
    CREATE TABLE IF NOT EXISTS price_history (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      old_buy_price REAL,
      new_buy_price REAL,
      old_sell_price REAL,
      new_sell_price REAL,
      changed_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (changed_by) REFERENCES users(id)
    );

    -- Tabel Pengaturan Toko
    CREATE TABLE IF NOT EXISTS store_settings (
      id TEXT PRIMARY KEY DEFAULT 'default',
      store_name TEXT DEFAULT 'Warung Hebat',
      address TEXT,
      phone TEXT,
      footer_note TEXT DEFAULT 'Terima kasih telah berbelanja!',
      tax_percentage REAL DEFAULT 0,
      logo_uri TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- Tabel Lisensi Perangkat (Token Generator Log)
    CREATE TABLE IF NOT EXISTS device_licenses (
      id TEXT PRIMARY KEY,
      android_id TEXT UNIQUE NOT NULL,
      token TEXT NOT NULL,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- Seed data default pengaturan toko & kategori jika belum ada
    INSERT OR IGNORE INTO store_settings (id, store_name, footer_note)
    VALUES ('default', 'Warung Hebat', 'Terima kasih telah berbelanja!');

    INSERT OR IGNORE INTO categories (id, name) VALUES ('cat-1', 'Makanan');
    INSERT OR IGNORE INTO categories (id, name) VALUES ('cat-2', 'Minuman');
    INSERT OR IGNORE INTO categories (id, name) VALUES ('cat-3', 'Snack');
    INSERT OR IGNORE INTO categories (id, name) VALUES ('cat-4', 'Rokok');
    INSERT OR IGNORE INTO categories (id, name) VALUES ('cat-5', 'Kebutuhan Rumah');
    INSERT OR IGNORE INTO categories (id, name) VALUES ('cat-6', 'Lainnya');
  `);

  console.log('✅ SQLite Database ready:', dbPath);
}
