import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { generateId } from '../utils/helpers.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// GET /api/stock-in
router.get('/', (req: AuthRequest, res: Response) => {
  const stockIns = db.prepare(`
    SELECT s.*, p.name as product_name, p.barcode as product_barcode, sup.name as supplier_name, u.name as user_name
    FROM stock_in s
    LEFT JOIN products p ON s.product_id = p.id
    LEFT JOIN suppliers sup ON s.supplier_id = sup.id
    LEFT JOIN users u ON s.user_id = u.id
    ORDER BY s.created_at DESC
    LIMIT 100
  `).all();

  return res.json({ success: true, data: stockIns });
});

// POST /api/stock-in (Input Barang Masuk & Update Stok Otomatis)
router.post('/', (req: AuthRequest, res: Response) => {
  const { product_id, supplier_id, quantity, buy_price, note } = req.body;

  const qty = parseInt(quantity);
  const price = parseFloat(buy_price);

  if (!product_id || isNaN(qty) || qty <= 0) {
    return res.status(400).json({ success: false, message: 'Produk dan kuantitas valid wajib diisi' });
  }

  const product = db.prepare('SELECT id, buy_price FROM products WHERE id = ?').get(product_id) as any;
  if (!product) {
    return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
  }

  const stockInId = generateId();

  const executeStockIn = db.transaction(() => {
    // 1. Simpan riwayat barang masuk
    db.prepare(`
      INSERT INTO stock_in (id, product_id, supplier_id, quantity, buy_price, note, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      stockInId,
      product_id,
      supplier_id || null,
      qty,
      price || product.buy_price,
      note?.trim() || null,
      req.user!.id
    );

    // 2. Tambah stok produk
    db.prepare(`
      UPDATE products 
      SET stock = stock + ?, buy_price = ?, updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(qty, price > 0 ? price : product.buy_price, product_id);
  });

  try {
    executeStockIn();
    return res.status(201).json({ success: true, message: 'Barang masuk berhasil dicatat' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Gagal menyimpan barang masuk' });
  }
});

export default router;
