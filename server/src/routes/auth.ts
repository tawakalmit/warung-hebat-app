import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';
import { hashPassword, comparePassword, generateToken, generateId } from '../utils/helpers.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Check if at least one owner account exists
router.get('/check-owner', (req: Request, res: Response) => {
  try {
    const owner = db
      .prepare("SELECT id FROM users WHERE role = 'owner' LIMIT 1")
      .get();

    return res.json({
      success: true,
      hasOwner: !!owner,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Gagal memeriksa akun owner',
    });
  }
});

// Login
router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username dan password wajib diisi' });
  }

  const user = db
    .prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)')
    .get(username.trim()) as any;

  if (!user) {
    return res.status(401).json({ success: false, message: 'Username atau password salah' });
  }

  if (user.is_active !== 1) {
    return res.status(403).json({ success: false, message: 'Akun Anda dinonaktifkan oleh Owner' });
  }

  // Cek kecocokan password (mendukung hash bcrypt baru atau fallback hash lama)
  const isMatch = comparePassword(password, user.password) || user.password === password;
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Username atau password salah' });
  }

  const token = generateToken({
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
  });

  const { password: _, ...safeUser } = user;
  return res.json({
    success: true,
    message: 'Login berhasil',
    token,
    user: safeUser,
  });
});

// Register (Jika belum ada user, user pertama otomatis Owner. Jika sudah ada, bisa daftarkan akun baru)
router.post('/register', (req: Request, res: Response) => {
  const { username, password, name, role } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ success: false, message: 'Nama, username, dan password wajib diisi' });
  }

  const trimmedUsername = username.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(trimmedUsername);
  if (existing) {
    return res.status(400).json({ success: false, message: 'Username sudah digunakan' });
  }

  // Cek apakah ini user pertama di sistem
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
  const userRole = userCount === 0 ? 'owner' : (role === 'owner' ? 'owner' : 'kasir');

  const id = generateId();
  const hashedPassword = hashPassword(password);

  db.prepare(`
    INSERT INTO users (id, username, password, name, role, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(id, trimmedUsername, hashedPassword, name.trim(), userRole);

  const newUser = { id, username: trimmedUsername, name: name.trim(), role: userRole, is_active: 1 };
  const token = generateToken({ id, username: trimmedUsername, role: userRole, name: name.trim() });

  return res.status(201).json({
    success: true,
    message: `Registrasi berhasil sebagai ${userRole === 'owner' ? 'Owner' : 'Kasir'}`,
    token,
    user: newUser,
  });
});

// Get Current User Profile
router.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  return res.json({
    success: true,
    user: req.user,
  });
});

export default router;
