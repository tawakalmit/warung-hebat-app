import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { generateId } from '../utils/helpers.js';
import { authenticate, requireOwner, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Semua rute produk mewajibkan login aktif
router.use(authenticate);

// GET /api/products (Bisa diakses Kasir & Owner)
router.get('/', (req: AuthRequest, res: Response) => {
  const { search, category_id, only_in_stock } = req.query;

  let query = 'SELECT * FROM products WHERE is_active = 1';
  const params: any[] = [];

  if (search) {
    query += ' AND (name LIKE ? OR barcode LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (category_id) {
    query += ' AND category_id = ?';
    params.push(category_id);
  }

  if (only_in_stock === 'true') {
    query += ' AND stock > 0';
  }

  query += ' ORDER BY name ASC';

  const products = db.prepare(query).all(...params);
  return res.json({ success: true, data: products });
});

// GET /api/products/:id
router.get('/:id', (req: AuthRequest, res: Response) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
  }
  return res.json({ success: true, data: product });
});

// POST /api/products (Owner Only)
router.post('/', requireOwner, (req: AuthRequest, res: Response) => {
  const { barcode, name, category_id, buy_price, sell_price, stock, min_stock, unit, image_uri } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ success: false, message: 'Nama produk wajib diisi' });
  }

  if (sell_price === undefined || parseFloat(sell_price) <= 0) {
    return res.status(400).json({ success: false, message: 'Harga jual harus lebih dari 0' });
  }

  // Cek barcode unik jika ada
  if (barcode && barcode.trim()) {
    const existing = db.prepare('SELECT id FROM products WHERE barcode = ? AND is_active = 1').get(barcode.trim());
    if (existing) {
      return res.status(400).json({ success: false, message: 'Barcode sudah digunakan oleh produk lain' });
    }
  }

  const id = generateId();
  db.prepare(`
    INSERT INTO products (id, barcode, name, category_id, buy_price, sell_price, stock, min_stock, unit, image_uri, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    id,
    barcode?.trim() || null,
    name.trim(),
    category_id || null,
    parseFloat(buy_price) || 0,
    parseFloat(sell_price),
    parseInt(stock) || 0,
    parseInt(min_stock) || 5,
    unit || 'pcs',
    image_uri || null
  );

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  return res.status(201).json({ success: true, message: 'Produk berhasil ditambahkan', data: product });
});

// PUT /api/products/:id (Owner Only)
router.put('/:id', requireOwner, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { barcode, name, category_id, buy_price, sell_price, stock, min_stock, unit, image_uri } = req.body;

  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
  }

  if (barcode && barcode.trim()) {
    const duplicate = db.prepare('SELECT id FROM products WHERE barcode = ? AND id != ? AND is_active = 1').get(barcode.trim(), id);
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'Barcode sudah digunakan oleh produk lain' });
    }
  }

  // Catat riwayat harga jika harga berubah
  const newBuy = parseFloat(buy_price) || 0;
  const newSell = parseFloat(sell_price) || 0;
  if (existing.buy_price !== newBuy || existing.sell_price !== newSell) {
    db.prepare(`
      INSERT INTO price_history (id, product_id, old_buy_price, new_buy_price, old_sell_price, new_sell_price, changed_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(generateId(), id, existing.buy_price, newBuy, existing.sell_price, newSell, req.user!.id);
  }

  db.prepare(`
    UPDATE products 
    SET barcode=?, name=?, category_id=?, buy_price=?, sell_price=?, stock=?, min_stock=?, unit=?, image_uri=?, updated_at=datetime('now','localtime')
    WHERE id=?
  `).run(
    barcode?.trim() || null,
    name.trim(),
    category_id || null,
    newBuy,
    newSell,
    parseInt(stock) || 0,
    parseInt(min_stock) || 5,
    unit || 'pcs',
    image_uri || null,
    id
  );

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  return res.json({ success: true, message: 'Produk berhasil diperbarui', data: updated });
});

// DELETE /api/products/:id (Owner Only - Soft Delete)
router.delete('/:id', requireOwner, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const result = db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(id);

  if (result.changes === 0) {
    return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
  }

  return res.json({ success: true, message: 'Produk berhasil dihapus' });
});

export default router;
