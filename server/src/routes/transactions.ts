import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { generateId, generateInvoiceNumber } from '../utils/helpers.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// GET /api/transactions
router.get('/', (req: AuthRequest, res: Response) => {
  const { limit = '50', offset = '0', start_date, end_date } = req.query;

  let query = `
    SELECT t.*, u.name as cashier_name 
    FROM transactions t 
    LEFT JOIN users u ON t.user_id = u.id 
    WHERE 1=1
  `;
  const params: any[] = [];

  if (start_date) {
    query += ' AND date(t.created_at) >= date(?)';
    params.push(start_date);
  }
  if (end_date) {
    query += ' AND date(t.created_at) <= date(?)';
    params.push(end_date);
  }

  query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit as string) || 50, parseInt(offset as string) || 0);

  const transactions = db.prepare(query).all(...params);
  return res.json({ success: true, data: transactions });
});

// GET /api/transactions/:id
router.get('/:id', (req: AuthRequest, res: Response) => {
  const transaction = db.prepare(`
    SELECT t.*, u.name as cashier_name 
    FROM transactions t 
    LEFT JOIN users u ON t.user_id = u.id 
    WHERE t.id = ?
  `).get(req.params.id);

  if (!transaction) {
    return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
  }

  const items = db.prepare('SELECT * FROM transaction_items WHERE transaction_id = ?').all(req.params.id);

  return res.json({
    success: true,
    data: {
      ...transaction,
      items,
    },
  });
});

// POST /api/transactions (Checkout Baru - Diproses Atomic)
router.post('/', (req: AuthRequest, res: Response) => {
  const {
    items = [], // array { product_id, product_name, quantity, price, discount, subtotal }
    total_amount,
    discount = 0,
    grand_total,
    payment_amount,
    change_amount = 0,
    payment_method = 'cash',
    customer_name,
    note,
  } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Keranjang belanja tidak boleh kosong' });
  }

  const payment = parseFloat(payment_amount) || 0;
  const total = parseFloat(grand_total) || 0;

  if (payment < total) {
    return res.status(400).json({ success: false, message: 'Nominal pembayaran kurang' });
  }

  const transactionId = generateId();
  const invoiceNumber = generateInvoiceNumber();

  // Eksekusi transaksi database secara ATOMIC
  const executeCheckout = db.transaction(() => {
    // 1. Simpan Header Transaksi
    db.prepare(`
      INSERT INTO transactions (
        id, invoice_number, total_amount, discount, tax, grand_total, 
        payment_amount, change_amount, payment_method, customer_name, note, user_id
      ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      transactionId,
      invoiceNumber,
      parseFloat(total_amount) || total,
      parseFloat(discount) || 0,
      total,
      payment,
      parseFloat(change_amount) || (payment - total),
      payment_method,
      customer_name?.trim() || null,
      note?.trim() || null,
      req.user!.id
    );

    // 2. Simpan Item & Kurangi Stok
    for (const item of items) {
      const itemId = generateId();
      const qty = parseInt(item.quantity) || 1;
      const price = parseFloat(item.price) || 0;
      const itemSubtotal = parseFloat(item.subtotal) || (qty * price);

      db.prepare(`
        INSERT INTO transaction_items (
          id, transaction_id, product_id, product_name, quantity, price, discount, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        itemId,
        transactionId,
        item.product_id || null,
        item.product_name,
        qty,
        price,
        parseFloat(item.discount) || 0,
        itemSubtotal
      );

      // Jika produk terdaftar di database, kurangi stoknya
      if (item.product_id) {
        db.prepare(`
          UPDATE products 
          SET stock = stock - ?, updated_at = datetime('now','localtime')
          WHERE id = ?
        `).run(qty, item.product_id);
      }
    }

    return {
      transactionId,
      invoiceNumber,
      grandTotal: total,
      payment,
      change: payment - total,
    };
  });

  try {
    const result = executeCheckout();
    return res.status(201).json({
      success: true,
      message: 'Transaksi berhasil disimpan',
      data: result,
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Gagal memproses transaksi' });
  }
});

export default router;
