import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { generateId } from '../utils/helpers.js';
import { authenticate, requireOwner, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// GET /api/categories
router.get('/', (req: AuthRequest, res: Response) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
  return res.json({ success: true, data: categories });
});

// POST /api/categories (Owner Only)
router.post('/', requireOwner, (req: AuthRequest, res: Response) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Nama kategori wajib diisi' });
  }

  const id = generateId();
  db.prepare('INSERT INTO categories (id, name, description) VALUES (?, ?, ?)').run(
    id,
    name.trim(),
    description?.trim() || null
  );

  const newCat = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  return res.status(201).json({ success: true, message: 'Kategori berhasil ditambahkan', data: newCat });
});

// DELETE /api/categories/:id (Owner Only)
router.delete('/:id', requireOwner, (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  return res.json({ success: true, message: 'Kategori berhasil dihapus' });
});

export default router;
