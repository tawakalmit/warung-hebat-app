import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/helpers.js';
import { db } from '../db/database.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    name: string;
    role: 'owner' | 'kasir';
    is_active: number;
  };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Autentikasi diperlukan. Token tidak ditemukan.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);
    
    // Periksa status terkini pengguna di database
    const user = db.prepare('SELECT id, username, name, role, is_active FROM users WHERE id = ?').get(decoded.id) as any;
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Pengguna tidak ditemukan' });
    }

    if (user.is_active !== 1) {
      return res.status(403).json({ success: false, message: 'Akun Anda telah dinonaktifkan oleh Owner.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token tidak valid atau telah kedaluwarsa' });
  }
}

export function requireOwner(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'owner') {
    return res.status(403).json({
      success: false,
      message: 'Akses ditolak: Operasi ini hanya boleh dilakukan oleh akun dengan peran Owner.',
    });
  }
  next();
}

export function requireActive(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.is_active !== 1) {
    return res.status(403).json({
      success: false,
      message: 'Akses ditolak: Akun Anda tidak aktif.',
    });
  }
  next();
}
