# Warung Hebat - Aplikasi Manajemen Inventori Warung

Aplikasi manajemen inventori warung berbasis React Native Expo yang berjalan sepenuhnya offline dengan fitur lengkap untuk mengelola operasional warung sehari-hari.

## Fitur Utama

### 🔐 Autentikasi & Role
- Register dan Login admin
- 2 Role: **Owner** (akses penuh) dan **Kasir** (akses terbatas)
- Owner bisa mengelola pengguna (aktifkan/nonaktifkan akun)

### 📦 Manajemen Produk
- CRUD produk dengan kategori
- Barcode scanner untuk input produk
- Satuan fleksibel (pcs, kg, liter, pack, dll)
- Alert stok minimum

### 📥 Barang Masuk
- Catat stok masuk via scan barcode
- Input manual atau scan
- Catat supplier dan harga beli
- Otomatis update stok produk

### 🛒 Transaksi Jual (POS/Kasir)
- Scan barcode untuk tambah item
- Pencarian produk cepat
- Keranjang belanja dengan edit quantity
- Diskon per transaksi
- Quick pay buttons
- Hitung kembalian otomatis

### 🧾 Print Invoice
- Cetak struk via system print (support Bluetooth printer)
- Format thermal receipt 58mm
- Integrasi Bluetooth thermal printer
- Generate PDF struk

### 📊 Laporan
- Laporan harian (30 hari terakhir)
- Laporan bulanan (12 bulan terakhir)
- Laporan tahunan
- Ringkasan pendapatan & jumlah transaksi

### 💾 Export / Import Data
- Export semua data ke JSON
- Import/restore dari file backup
- Share file backup via apps lain

### ⚙️ Fitur Tambahan
- **Dashboard** - Ringkasan penjualan hari ini & bulan ini
- **Manajemen Supplier** - Catat data supplier
- **Stok Minimum Alert** - Peringatan saat stok menipis
- **Pengaturan Toko** - Nama, alamat, telepon, catatan struk
- **Kelola Pengguna** - Aktifkan/nonaktifkan akun (Owner only)

## Tech Stack

- **React Native** + **Expo** (SDK 52)
- **expo-sqlite** - Database lokal offline
- **expo-camera** - Barcode scanner
- **expo-print** - Print invoice
- **expo-file-system** + **expo-sharing** - Export/Import
- **@react-navigation** - Navigasi
- **TypeScript** - Type safety

## Instalasi & Menjalankan

```bash
# Install dependencies
npm install

# Jalankan di development
npx expo start

# Jalankan di Android
npx expo start --android

# Jalankan di iOS
npx expo start --ios
```

## Struktur Project

```
src/
├── components/       # Komponen UI reusable
├── constants/        # Theme, colors, spacing
├── contexts/         # React Context (Auth, Cart)
├── database/         # SQLite schema & connection
├── navigation/       # React Navigation setup
├── screens/          # Semua screen/halaman
│   ├── auth/         # Login & Register
│   ├── home/         # Dashboard
│   ├── pos/          # Kasir, Checkout, Receipt
│   ├── products/     # Daftar & Tambah Produk
│   ├── reports/      # Laporan
│   ├── settings/     # Pengaturan, Export/Import
│   └── stockin/      # Barang Masuk
├── services/         # Printer service
├── types/            # TypeScript interfaces
└── utils/            # Helper functions
```

## Integrasi Bluetooth Printer

Untuk print langsung ke thermal printer Bluetooth:

1. Pair printer dari Settings HP
2. Gunakan `PrinterService.printReceipt()` untuk print via system dialog
3. Untuk direct Bluetooth printing, lihat dokumentasi di `src/services/PrinterService.ts`

## Database Schema

Aplikasi menggunakan SQLite dengan tabel:
- `users` - Data pengguna
- `categories` - Kategori produk
- `suppliers` - Data supplier
- `products` - Data produk
- `stock_in` - Riwayat barang masuk
- `transactions` - Header transaksi
- `transaction_items` - Detail item transaksi
- `price_history` - Riwayat perubahan harga
- `store_settings` - Pengaturan toko

## Build Production

```bash
# Build APK Android
npx expo build:android

# Atau menggunakan EAS Build
npx eas build --platform android --profile production
```
