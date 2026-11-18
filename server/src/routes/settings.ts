import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { authenticate, requireOwner, AuthRequest } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

router.use(authenticate);

// Setup multer untuk upload logo toko
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `logo_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // max 2MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar yang diperbolehkan'));
    }
  },
});

// GET /api/settings (Bisa dibaca Kasir & Owner)
router.get('/', (req: AuthRequest, res: Response) => {
  const settings = db.prepare('SELECT * FROM store_settings WHERE id = ?').get('default');
  return res.json({ success: true, data: settings });
});

// PUT /api/settings (Owner Only)
router.put('/', requireOwner, (req: AuthRequest, res: Response) => {
  const { store_name, address, phone, footer_note, tax_percentage, logo_uri } = req.body;

  db.prepare(`
    UPDATE store_settings 
    SET store_name = ?, address = ?, phone = ?, footer_note = ?, tax_percentage = ?, logo_uri = ?, updated_at = datetime('now','localtime')
    WHERE id = 'default'
  `).run(
    store_name?.trim() || 'Warung Hebat',
    address?.trim() || null,
    phone?.trim() || null,
    footer_note?.trim() || 'Terima kasih telah berbelanja!',
    parseFloat(tax_percentage) || 0,
    logo_uri || null
  );

  const updated = db.prepare('SELECT * FROM store_settings WHERE id = ?').get('default');
  return res.json({ success: true, message: 'Pengaturan toko berhasil diperbarui', data: updated });
});

// POST /api/settings/logo (Owner Only - Upload Logo)
router.post('/logo', requireOwner, upload.single('logo'), (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Tidak ada file logo yang diunggah' });
  }

  const logoUrl = `/uploads/${req.file.filename}`;
  db.prepare(`
    UPDATE store_settings 
    SET logo_uri = ?, updated_at = datetime('now','localtime') 
    WHERE id = 'default'
  `).run(logoUrl);

  return res.json({
    success: true,
    message: 'Logo berhasil diunggah',
    logo_uri: logoUrl,
  });
});

export default router;
