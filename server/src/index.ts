import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './db/database.js';

// Import Routes
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import productsRouter from './routes/products.js';
import categoriesRouter from './routes/categories.js';
import suppliersRouter from './routes/suppliers.js';
import stockInRouter from './routes/stockin.js';
import transactionsRouter from './routes/transactions.js';
import reportsRouter from './routes/reports.js';
import settingsRouter from './routes/settings.js';
import exportImportRouter from './routes/exportImport.js';
import licenseRouter from './routes/license.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inisialisasi Database SQLite
initDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads folder (untuk logo toko)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health Check Endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    app: 'Warung Hebat REST API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/stock-in', stockInRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/export-import', exportImportRouter);
app.use('/api/license', licenseRouter);
app.get('/license-admin', (req: Request, res: Response) => {
  res.redirect('/api/license/admin-ui');
});

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, message: `Rute [${req.method}] ${req.url} tidak ditemukan` });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Terjadi kesalahan internal pada server',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Warung Hebat Server berjalan di http://localhost:${PORT}`);
  console.log(`📡 Health Check: http://localhost:${PORT}/health`);
});
