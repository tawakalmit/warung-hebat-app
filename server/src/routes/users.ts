import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { hashPassword, generateId } from '../utils/helpers.js';
import { authenticate, requireOwner, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Semua rute user memerlukan autentikasi dan peran Owner
router.use(authenticate, requireOwner);

// Get all users
router.get('/', (req: AuthRequest, res: Response) => {
  const users = db.prepare(`
    SELECT id, username, name, role, is_active, created_at 
    FROM users 
    ORDER BY role ASC, created_at DESC
  `).all();

  return res.json({ success: true, data: users });
});

// Create new user (Owner or Kasir)
router.post('/', (req: AuthRequest, res: Response) => {
  const { username, password, name, role } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ success: false, message: 'Semua field wajib diisi' });
  }

  const trimmedUsername = username.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(trimmedUsername);
  if (existing) {
    return res.status(400).json({ success: false, message: 'Username sudah digunakan' });
  }

  const id = generateId();
  const hashedPassword = hashPassword(password);
  const targetRole = role === 'owner' ? 'owner' : 'kasir';

  db.prepare(`
    INSERT INTO users (id, username, password, name, role, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(id, trimmedUsername, hashedPassword, name.trim(), targetRole);

  const newUser = db.prepare('SELECT id, username, name, role, is_active, created_at FROM users WHERE id = ?').get(id);
  return res.status(201).json({
    success: true,
    message: `Akun ${targetRole} berhasil didaftarkan`,
    data: newUser,
  });
});

// Toggle user status
router.patch('/:id/status', (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (req.user?.id === id) {
    return res.status(400).json({ success: false, message: 'Tidak bisa mengubah status akun sendiri' });
  }

  const target = db.prepare('SELECT id, is_active FROM users WHERE id = ?').get(id) as any;
  if (!target) {
    return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
  }

  const newStatus = target.is_active === 1 ? 0 : 1;
  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(newStatus, id);

  return res.json({
    success: true,
    message: `Akun berhasil ${newStatus === 1 ? 'diaktifkan' : 'dinonaktifkan'}`,
    data: { id, is_active: newStatus },
  });
});

// Delete user
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (req.user?.id === id) {
    return res.status(400).json({ success: false, message: 'Tidak bisa menghapus akun sendiri' });
  }

  // Cek apakah user memiliki riwayat transaksi
  const txCount = (db.prepare('SELECT COUNT(*) as count FROM transactions WHERE user_id = ?').get(id) as any).count;
  if (txCount > 0) {
    // Jika ada transaksi, nonaktifkan saja agar data integritas transaksi tetap utuh
    db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(id);
    return res.json({
      success: true,
      message: 'Pengguna memiliki riwayat transaksi sehingga akun dinonaktifkan (bukan dihapus).',
    });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return res.json({ success: true, message: 'Pengguna berhasil dihapus permanen' });
});

export default router;
