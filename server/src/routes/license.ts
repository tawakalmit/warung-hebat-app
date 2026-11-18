import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';
import { generateId } from '../utils/helpers.js';
import { generateTokenNode, formatDeviceId, cleanToken } from '../utils/license.js';

const router = Router();

const DEFAULT_ADMIN_KEY = process.env.ADMIN_LICENSE_SECRET || 'warungadmin2026';

function checkAdminAuth(req: Request): boolean {
  const authKey =
    req.headers['x-admin-key'] ||
    req.body?.adminKey ||
    req.query?.adminKey;

  return authKey === DEFAULT_ADMIN_KEY;
}

// 1. Endpoint API: Generate Token
router.post('/generate', (req: Request, res: Response) => {
  const { androidId, note, adminKey } = req.body;

  if (adminKey !== DEFAULT_ADMIN_KEY && req.headers['x-admin-key'] !== DEFAULT_ADMIN_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Kunci otorisasi admin (PIN) salah atau tidak valid.',
    });
  }

  if (!androidId || androidId.trim().length < 4) {
    return res.status(400).json({
      success: false,
      message: 'Android ID wajib diisi minimal 4 karakter.',
    });
  }

  const cleanId = androidId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const token = generateTokenNode(cleanId);
  const formattedId = formatDeviceId(cleanId);

  try {
    const id = generateId();
    db.prepare(`
      INSERT INTO device_licenses (id, android_id, token, note, created_at)
      VALUES (?, ?, ?, ?, datetime('now','localtime'))
      ON CONFLICT(android_id) DO UPDATE SET 
        token = excluded.token,
        note = excluded.note,
        created_at = excluded.created_at
    `).run(id, cleanId, token, note?.trim() || null);

    return res.json({
      success: true,
      message: 'Token aktivasi permanen berhasil dibuat.',
      data: {
        androidId: cleanId,
        formattedAndroidId: formattedId,
        token,
        note: note?.trim() || null,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('License generate error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menyimpan lisensi ke database: ' + error.message,
    });
  }
});

// 2. Endpoint API: List Generated Licenses
router.get('/list', (req: Request, res: Response) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({
      success: false,
      message: 'Kunci otorisasi admin tidak valid.',
    });
  }

  try {
    const list = db.prepare('SELECT * FROM device_licenses ORDER BY created_at DESC LIMIT 100').all();
    return res.json({
      success: true,
      data: list,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// 3. Endpoint API: Delete License Record
router.delete('/:id', (req: Request, res: Response) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ success: false, message: 'Akses ditolak' });
  }

  try {
    db.prepare('DELETE FROM device_licenses WHERE id = ?').run(req.params.id);
    return res.json({ success: true, message: 'Catatan lisensi berhasil dihapus' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Web Portal Admin (Single Page HTML Responsif)
router.get('/admin-ui', (req: Request, res: Response) => {
  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Warung Hebat - License Generator</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #1E88E5;
      --primary-dark: #1565C0;
      --bg: #F4F6F9;
      --surface: #FFFFFF;
      --text: #1E293B;
      --text-muted: #64748B;
      --border: #E2E8F0;
      --success: #10B981;
      --success-bg: #ECFDF5;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 24px 16px;
    }
    .container {
      max-width: 680px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
    }
    .logo-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #E0F2FE;
      color: var(--primary);
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 12px;
    }
    h1 {
      font-size: 26px;
      font-weight: 800;
      color: #0F172A;
    }
    p.sub {
      font-size: 14px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .card {
      background: var(--surface);
      border-radius: 16px;
      padding: 24px;
      border: 1px solid var(--border);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      margin-bottom: 24px;
    }
    .form-group {
      margin-bottom: 16px;
    }
    label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #334155;
      margin-bottom: 6px;
    }
    input[type="text"], input[type="password"] {
      width: 100%;
      padding: 12px 14px;
      border: 1.5px solid var(--border);
      border-radius: 10px;
      font-size: 15px;
      font-family: inherit;
      transition: all 0.2s;
    }
    input[type="text"]:focus, input[type="password"]:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(30, 136, 229, 0.15);
    }
    .mono-input {
      font-family: 'JetBrains Mono', monospace !important;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    button.btn-primary {
      width: 100%;
      background: var(--primary);
      color: white;
      border: none;
      padding: 14px;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
    }
    button.btn-primary:hover {
      background: var(--primary-dark);
      transform: translateY(-1px);
    }
    /* Token Card */
    .token-card {
      display: none;
      background: #0F172A;
      color: white;
      border-radius: 16px;
      padding: 24px;
      margin-top: 24px;
      position: relative;
      overflow: hidden;
      border: 1px solid #334155;
    }
    .token-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      border-bottom: 1px dashed #334155;
      padding-bottom: 12px;
    }
    .token-title {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 1px;
      color: #94A3B8;
      text-transform: uppercase;
    }
    .token-badge {
      background: #0284C7;
      color: white;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 20px;
    }
    .token-digits {
      font-family: 'JetBrains Mono', monospace;
      font-size: 24px;
      font-weight: 700;
      text-align: center;
      padding: 16px 8px;
      letter-spacing: 2px;
      color: #38BDF8;
      background: #1E293B;
      border-radius: 10px;
      margin-bottom: 16px;
      user-select: all;
    }
    .token-meta {
      font-size: 12px;
      color: #94A3B8;
      margin-bottom: 16px;
      line-height: 1.6;
    }
    .token-actions {
      display: flex;
      gap: 10px;
    }
    .btn-action {
      flex: 1;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      text-decoration: none;
    }
    .btn-copy {
      background: #38BDF8;
      color: #0F172A;
    }
    .btn-wa {
      background: #22C55E;
      color: white;
    }
    /* Table History */
    .history-card {
      margin-top: 24px;
    }
    .history-title {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th, td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    th {
      font-weight: 700;
      color: var(--text-muted);
      background: #F8FAFC;
    }
    td.mono {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
    }
    .toast {
      display: none;
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #0F172A;
      color: white;
      padding: 10px 20px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
      z-index: 99;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">⚡ WARUNG HEBAT LICENSE PORTAL</div>
      <h1>Generator Token Lisensi Perangkat</h1>
      <p class="sub">Hasilkan 20 digit token aktivasi permanen (mirip token listrik PLN) berdasarkan Android ID</p>
    </div>

    <div class="card">
      <div class="form-group">
        <label for="adminKey">Kunci Rahasia Admin (PIN)</label>
        <input type="password" id="adminKey" placeholder="Masukkan PIN Admin..." value="warungadmin2026">
      </div>

      <div class="form-group">
        <label for="androidId">Android ID Perangkat Pengguna (16 Karakter)</label>
        <input type="text" id="androidId" class="mono-input" placeholder="Contoh: 2306236B3BA9F49B atau 2306-236B-3BA9-F49B">
      </div>

      <div class="form-group">
        <label for="note">Catatan Pengguna / Nama Toko (Opsional)</label>
        <input type="text" id="note" placeholder="Contoh: Warung Bu Siti - Kasir 1">
      </div>

      <button class="btn-primary" onclick="generateToken()">
        <span>⚡ Generate Token 20 Digit</span>
      </button>

      <!-- Token Result Box -->
      <div id="tokenCard" class="token-card">
        <div class="token-header">
          <span class="token-title">TOKEN AKTIVASI RESMI</span>
          <span class="token-badge">PERMANEN (LIFETIME)</span>
        </div>
        <div id="tokenDigits" class="token-digits">0000 - 0000 - 0000 - 0000 - 0000</div>
        <div id="tokenMeta" class="token-meta">
          ID Perangkat: <strong id="metaId">-</strong><br>
          Catatan: <span id="metaNote">-</span>
        </div>
        <div class="token-actions">
          <button class="btn-action btn-copy" onclick="copyToken()">📋 Salin Token</button>
          <a id="btnWa" class="btn-action btn-wa" href="#" target="_blank">💬 Kirim WhatsApp</a>
        </div>
      </div>
    </div>

    <div class="card history-card">
      <div class="history-title">Riwayat Token yang Dibuat</div>
      <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Android ID</th>
              <th>Token</th>
              <th>Catatan</th>
            </tr>
          </thead>
          <tbody id="historyBody">
            <tr><td colspan="4" style="text-align:center; color:#94A3B8;">Memuat data riwayat...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <div id="toast" class="toast">Token berhasil disalin ke clipboard!</div>

  <script>
    let currentToken = '';
    let currentAndroidId = '';

    // Load saved PIN from localStorage
    const savedPin = localStorage.getItem('warung_admin_pin');
    if (savedPin) {
      document.getElementById('adminKey').value = savedPin;
    }

    async function generateToken() {
      const adminKey = document.getElementById('adminKey').value.trim();
      const rawAndroidId = document.getElementById('androidId').value.trim();
      const note = document.getElementById('note').value.trim();

      if (!adminKey) {
        alert('Harap masukkan PIN Admin.');
        return;
      }
      if (!rawAndroidId) {
        alert('Harap masukkan Android ID pengguna.');
        return;
      }

      localStorage.setItem('warung_admin_pin', adminKey);

      try {
        const response = await fetch('/api/license/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminKey, androidId: rawAndroidId, note })
        });

        const data = await response.json();
        if (!data.success) {
          alert('Gagal: ' + data.message);
          return;
        }

        currentToken = data.data.token;
        currentAndroidId = data.data.formattedAndroidId || data.data.androidId;

        document.getElementById('tokenDigits').innerText = currentToken;
        document.getElementById('metaId').innerText = currentAndroidId;
        document.getElementById('metaNote').innerText = data.data.note || '-';
        document.getElementById('tokenCard').style.display = 'block';

        // Prepare WhatsApp message
        const waMsg = 'Halo! Berikut adalah Token Aktivasi Permanen aplikasi Warung Hebat untuk perangkat Anda (ID: ' + currentAndroidId + '):\\n\\n*' + currentToken + '*\\n\\nMasukkan token ini ke aplikasi untuk langsung menggunakannya. Terima kasih!';
        document.getElementById('btnWa').href = 'https://wa.me/?text=' + encodeURIComponent(waMsg);

        // Refresh History
        loadHistory();
      } catch (err) {
        alert('Terjadi kesalahan: ' + err.message);
      }
    }

    function copyToken() {
      if (!currentToken) return;
      navigator.clipboard.writeText(currentToken);
      showToast('Token ' + currentToken + ' berhasil disalin!');
    }

    function showToast(msg) {
      const toast = document.getElementById('toast');
      toast.innerText = msg;
      toast.style.display = 'block';
      setTimeout(() => { toast.style.display = 'none'; }, 2500);
    }

    async function loadHistory() {
      const adminKey = document.getElementById('adminKey').value.trim();
      if (!adminKey) return;

      try {
        const res = await fetch('/api/license/list', {
          headers: { 'x-admin-key': adminKey }
        });
        const data = await res.json();
        const tbody = document.getElementById('historyBody');

        if (!data.success || !data.data || data.data.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#94A3B8;">Belum ada riwayat token.</td></tr>';
          return;
        }

        tbody.innerHTML = data.data.map(item => \`
          <tr>
            <td>\${item.created_at || '-'}</td>
            <td class="mono">\${item.android_id}</td>
            <td class="mono" style="font-weight:700; color:#0284C7;">\${item.token}</td>
            <td>\${item.note || '-'}</td>
          </tr>
        \`).join('');
      } catch (err) {
        console.error('History load error:', err);
      }
    }

    // Load initial history
    loadHistory();
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(html);
});

export default router;
