import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { generateId } from '../utils/helpers.js';
import { authenticate, requireOwner, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// GET /api/suppliers
router.get('/', (req: AuthRequest, res: Response) => {
  const suppliers = db.prepare('SELECT * FROM suppliers ORDER BY name ASC').all();
  return res.json({ success: true, data: suppliers });
});

// POST /api/suppliers (Owner Only)
router.post('/', requireOwner, (req: AuthRequest, res: Response) => {
  const { name, phone, address } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Nama supplier wajib diisi' });
  }

  const id = generateId();
  db.prepare('INSERT INTO suppliers (id, name, phone, address) VALUES (?, ?, ?, ?)').run(
    id,
    name.trim(),
    phone?.trim() || null,
    address?.trim() || null
  );

  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
  return res.status(201).json({ success: true, message: 'Supplier berhasil ditambahkan', data: supplier });
});

// DELETE /api/suppliers/:id (Owner Only)
router.delete('/:id', requireOwner, (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM suppliers WHERE id = ?').run(req.params.id);
  return res.json({ success: true, message: 'Supplier berhasil dihapus' });
});

export default router;
