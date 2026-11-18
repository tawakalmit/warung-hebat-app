import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { authenticate, requireOwner, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireOwner);

// GET /api/export-import/export (Owner Only)
router.get('/export', (req: AuthRequest, res: Response) => {
  try {
    const users = db.prepare('SELECT id, username, name, role, is_active, created_at FROM users').all();
    const categories = db.prepare('SELECT * FROM categories').all();
    const suppliers = db.prepare('SELECT * FROM suppliers').all();
    const products = db.prepare('SELECT * FROM products').all();
    const stockIn = db.prepare('SELECT * FROM stock_in').all();
    const transactions = db.prepare('SELECT * FROM transactions').all();
    const transactionItems = db.prepare('SELECT * FROM transaction_items').all();
    const storeSettings = db.prepare('SELECT * FROM store_settings').all();

    const backup = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      server: 'Warung Hebat REST API',
      data: {
        users,
        categories,
        suppliers,
        products,
        stock_in: stockIn,
        transactions,
        transaction_items: transactionItems,
        store_settings: storeSettings,
      },
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=warung_hebat_cloud_backup_${new Date().toISOString().split('T')[0]}.json`);
    return res.json(backup);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Gagal mengekspor data: ' + error.message });
  }
});

// POST /api/export-import/import (Owner Only - Restore Data)
router.post('/import', (req: AuthRequest, res: Response) => {
  const { data } = req.body;

  if (!data) {
    return res.status(400).json({ success: false, message: 'Format data backup tidak valid' });
  }

  const restoreTransaction = db.transaction(() => {
    if (data.categories && Array.isArray(data.categories)) {
      const stmt = db.prepare('INSERT OR REPLACE INTO categories (id, name, description, created_at) VALUES (?, ?, ?, ?)');
      for (const item of data.categories) {
        stmt.run(item.id, item.name, item.description || null, item.created_at);
      }
    }

    if (data.suppliers && Array.isArray(data.suppliers)) {
      const stmt = db.prepare('INSERT OR REPLACE INTO suppliers (id, name, phone, address, created_at) VALUES (?, ?, ?, ?, ?)');
      for (const item of data.suppliers) {
        stmt.run(item.id, item.name, item.phone || null, item.address || null, item.created_at);
      }
    }

    if (data.products && Array.isArray(data.products)) {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO products (id, barcode, name, category_id, buy_price, sell_price, stock, min_stock, unit, image_uri, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const item of data.products) {
        stmt.run(
          item.id,
          item.barcode || null,
          item.name,
          item.category_id || null,
          item.buy_price || 0,
          item.sell_price || 0,
          item.stock || 0,
          item.min_stock || 5,
          item.unit || 'pcs',
          item.image_uri || null,
          item.is_active ?? 1,
          item.created_at,
          item.updated_at
        );
      }
    }
  });

  try {
    restoreTransaction();
    return res.json({ success: true, message: 'Data backup berhasil di-restore ke server' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Gagal merestore data: ' + error.message });
  }
});

export default router;
