# Warung Hebat - Backend REST API Server

Backend REST API untuk aplikasi **Warung Hebat**, dirancang khusus untuk berjalan di server Anda (**`friday`**) dengan dukungan database SQLite terpusat, autentikasi JWT, sistem peran (*Role-Based Access Control*), dan siap dihubungkan ke domain **Cloudflare**.

---

## 🚀 Fitur Utama Backend

1. **Database Relasional Terpusat**:
   - Menggunakan **SQLite** (`better-sqlite3`) dengan mode **WAL (Write-Ahead Logging)** yang super cepat, ringan, dan aman dari *data corruption*.
   - Data tersimpan persisten di `./data/warung_hebat.db`.
2. **Autentikasi & Otorisasi Lengkap**:
   - Enkripsi password menggunakan `bcryptjs`.
   - Autentikasi sesi menggunakan JWT Bearer Token (`30 hari`).
   - Proteksi Role:
     - **Owner**: Akses penuh (tambah/edit/hapus produk, kelola pengguna/kasir, lihat laporan omzet, ubah profil toko, ekspor/impor).
     - **Kasir**: Melayani transaksi POS, scan barcode, lihat stok, cetak struk (otomatis mencatat nama kasir).
3. **Transaksi Penjualan Atomic (ACID)**:
   - Pengurangan stok dan pencatatan transaksi dieksekusi secara atomic dalam satu transaksi database.
4. **Siap Di-deploy**:
   - Mendukung **Docker & Docker Compose** atau **Node.js (PM2 / Systemd)**.
   - Siap diekspos ke publik menggunakan **Cloudflare Tunnel** dengan HTTPS otomatis.

---

## 🛠️ Cara Deploy di Server `friday`

### Opsi 1: Menggunakan Docker Compose (Paling Direkomendasikan & Bersih)

1. Salin folder `server/` ke server `friday`:
   ```bash
   scp -r server user@friday:~/warung-hebat-server
   ```
2. Masuk ke server `friday`:
   ```bash
   ssh user@friday
   cd ~/warung-hebat-server
   ```
3. Jalankan container:
   ```bash
   docker compose up -d --build
   ```
4. Cek status:
   ```bash
   curl http://localhost:3000/health
   ```
   *Data database akan tersimpan aman di folder `./data/` dan logo toko di `./uploads/`.*

---

### Opsi 2: Menggunakan Node.js Langsung (+ PM2)

1. Masuk ke direktori server:
   ```bash
   cd server
   ```
2. Install dependensi & build:
   ```bash
   npm install
   npm run build
   ```
3. Jalankan menggunakan **PM2** agar otomatis restart jika server reboot:
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name "warung-hebat-api"
   pm2 save
   pm2 startup
   ```

---

## 🌐 Menghubungkan ke Domain Cloudflare (Cloudflare Tunnel)

Agar server `friday` dapat diakses dari HP Kasir dan Owner di mana saja lewat internet dengan aman (HTTPS otomatis, tanpa perlu *port-forwarding* di router):

### Cara Praktis dengan Cloudflare Tunnel:

1. Di server `friday`, install `cloudflared`:
   - **Ubuntu/Debian**:
     ```bash
     curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
     sudo dpkg -i cloudflared.deb
     ```
   - **Atau via Docker**:
     Sudah tersedia image resmi `cloudflare/cloudflared`.

2. Buka **[Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com)**:
   - Masuk ke menu **Networks** → **Tunnels** → Klik **Create a Tunnel**.
   - Beri nama tunnel (misal: `friday-tunnel`).
   - Ikuti perintah instalasi konektor yang ditampilkan di layar untuk server `friday`.
   - Di tab **Public Hostname**:
     - Subdomain: `api-warung` (atau yang Anda inginkan)
     - Domain: `domain-anda.com`
     - Service Type: `HTTP`
     - URL: `localhost:3000`
   - Klik **Save Tunnel**.

3. **Selesai!** API Anda sekarang aktif secara publik di:
   ```text
   https://api-warung.domain-anda.com
   ```
   *Semua koneksi terenkripsi SSL Cloudflare tanpa ada port router yang terbuka.*

---

## 📋 Daftar Rute REST API

### 1. Autentikasi (`/api/auth`)
| Method | Endpoint | Akses | Keterangan |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Publik | Login pengguna, mengembalikan token JWT |
| `POST` | `/api/auth/register` | Publik | Registrasi akun baru (user pertama otomatis Owner) |
| `GET` | `/api/auth/me` | Authenticated | Profil pengguna yang sedang login |

### 2. Kelola Pengguna (`/api/users`)
| Method | Endpoint | Akses | Keterangan |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users` | Owner | Daftar semua akun kasir & owner |
| `POST` | `/api/users` | Owner | Tambah akun kasir/owner baru |
| `PATCH`| `/api/users/:id/status` | Owner | Toggle aktif / nonaktif akun |
| `DELETE`| `/api/users/:id` | Owner | Hapus pengguna |

### 3. Produk & Kategori (`/api/products` & `/api/categories`)
| Method | Endpoint | Akses | Keterangan |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/products` | Kasir & Owner | Ambil daftar produk (filter search & kategori) |
| `GET` | `/api/products/:id` | Kasir & Owner | Detail produk |
| `POST` | `/api/products` | Owner Only | Tambah produk baru |
| `PUT` | `/api/products/:id` | Owner Only | Edit produk & harga |
| `DELETE`| `/api/products/:id` | Owner Only | Hapus produk (soft delete) |
| `GET` | `/api/categories` | Kasir & Owner | Daftar kategori produk |
| `POST` | `/api/categories` | Owner Only | Tambah kategori |

### 4. Transaksi Penjualan (`/api/transactions`)
| Method | Endpoint | Akses | Keterangan |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/transactions` | Kasir & Owner | Riwayat transaksi |
| `GET` | `/api/transactions/:id` | Kasir & Owner | Detail struk transaksi & nama kasir |
| `POST` | `/api/transactions` | Kasir & Owner | **Checkout Atomic**: kurangi stok & buat invoice |

### 5. Barang Masuk (`/api/stock-in`)
| Method | Endpoint | Akses | Keterangan |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/stock-in` | Kasir & Owner | Riwayat barang masuk |
| `POST` | `/api/stock-in` | Kasir & Owner | Catat barang masuk & otomatis tambah stok |

### 6. Laporan (`/api/reports`)
| Method | Endpoint | Akses | Keterangan |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/reports/dashboard-stats` | Kasir & Owner | Statistik omzet hari ini & bulan ini |
| `GET` | `/api/reports/daily` | Kasir & Owner | Grafik laporan 30 hari terakhir |
| `GET` | `/api/reports/monthly` | Kasir & Owner | Grafik laporan 12 bulan terakhir |

### 7. Pengaturan Toko & Backup (`/api/settings` & `/api/export-import`)
| Method | Endpoint | Akses | Keterangan |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/settings` | Kasir & Owner | Profil toko & logo |
| `PUT` | `/api/settings` | Owner Only | Edit nama toko, alamat, footer struk |
| `POST` | `/api/settings/logo` | Owner Only | Upload logo warung |
| `GET` | `/api/export-import/export` | Owner Only | Download backup lengkap format JSON |
| `POST` | `/api/export-import/import` | Owner Only | Restore data dari backup JSON |
