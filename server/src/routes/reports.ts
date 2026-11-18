import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// GET /api/reports/dashboard-stats
router.get('/dashboard-stats', (req: AuthRequest, res: Response) => {
  const today = new Date().toISOString().split('T')[0];
  const monthStart = today.slice(0, 7) + '-01';

  const todayStats = db.prepare(`
    SELECT COALESCE(SUM(grand_total), 0) as total, COUNT(*) as count 
    FROM transactions WHERE date(created_at) = date(?)
  `).get(today) as any;

  const monthStats = db.prepare(`
    SELECT COALESCE(SUM(grand_total), 0) as total, COUNT(*) as count 
    FROM transactions WHERE date(created_at) >= date(?)
  `).get(monthStart) as any;

  const totalProducts = (db.prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1').get() as any).count;
  const lowStockCount = (db.prepare('SELECT COUNT(*) as count FROM products WHERE stock <= min_stock AND is_active = 1').get() as any).count;

  return res.json({
    success: true,
    data: {
      todaySales: todayStats?.total || 0,
      todayTransactions: todayStats?.count || 0,
      monthSales: monthStats?.total || 0,
      monthTransactions: monthStats?.count || 0,
      totalProducts,
      lowStockCount,
    },
  });
});

// GET /api/reports/daily (30 hari terakhir)
router.get('/daily', (req: AuthRequest, res: Response) => {
  const daily = db.prepare(`
    SELECT date(created_at) as date, SUM(grand_total) as total, COUNT(*) as count
    FROM transactions 
    WHERE created_at >= date('now', '-30 days')
    GROUP BY date(created_at) 
    ORDER BY date DESC
  `).all();

  return res.json({ success: true, data: daily });
});

// GET /api/reports/monthly (12 bulan terakhir)
router.get('/monthly', (req: AuthRequest, res: Response) => {
  const monthly = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, SUM(grand_total) as total, COUNT(*) as count
    FROM transactions 
    WHERE created_at >= date('now', '-12 months')
    GROUP BY strftime('%Y-%m', created_at) 
    ORDER BY month DESC
  `).all();

  return res.json({ success: true, data: monthly });
});

// GET /api/reports/yearly
router.get('/yearly', (req: AuthRequest, res: Response) => {
  const yearly = db.prepare(`
    SELECT strftime('%Y', created_at) as month, SUM(grand_total) as total, COUNT(*) as count
    FROM transactions 
    GROUP BY strftime('%Y', created_at) 
    ORDER BY month DESC
  `).all();

  return res.json({ success: true, data: yearly });
});

export default router;
