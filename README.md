# 🚀 Shopify QR Code & Smart Discount App

Aplikasi Shopify kustom berbasis **React Router v7** dan **Shopify App Bridge** untuk mengelola, mencetak, dan menganalisis QR Code produk toko dengan dukungan penyimpanan **Shopify Metaobjects**, **Auto-Apply Discount Code**, **Bulk Export ZIP**, dan **Printable Sticker Sheet (Siap Cetak Label)**.

---

## 🌟 Fitur Utama (Features)

1. **Metaobject-Powered QR Codes:**
   - Seluruh data QR Code disimpan secara native di Shopify Metaobjects (`$app:qrcode`), tidak memerlukan database server eksternal untuk menyimpan data bisnis.
   - Terintegrasi langsung dengan Shopify GraphQL API.
2. **Auto-Apply Discount Code (Smart Scan):**
   - Saat customer memindai QR Code, kode diskon yang ditentukan akan otomatis diaplikasikan ke halaman keranjang/checkout (`/discount/{code}?redirect=...`).
3. **Polaris IndexFilters & Quick Tabs:**
   - Filter cepat menggunakan tab: *All*, *Cart Checkout*, *Product Page*, dan *With Discount* lengkap dengan counter jumlah item.
   - Pencarian real-time berdasarkan judul QR, nama produk terkait, atau kode diskon.
   - Filter berdasarkan tipe destinasi dan status diskon.
   - Sorting: Paling baru, paling lama, scan terbanyak, dan abjad judul (A-Z).
4. **Bulk Export ZIP:**
   - Download seluruh QR Code atau item yang dipilih dalam format arsip `.zip` berisi file gambar PNG siap pakai.
5. **Printable Sticker Sheet (Siap Print Label):**
   - Modal cetak label stiker fisik dengan layout grid yang teroptimasi untuk cetak kertas stiker/label (`@media print` CSS dan `window.print()`).
6. **Scan Analytics:**
   - Pelacakan jumlah pemindaian (scans counter) yang otomatis bertambah setiap kali ada pembeli yang memindai QR Code.

---

## 💻 Prasyarat Sistem (Prerequisites)

Sebelum menjalankan aplikasi di laptop/komputer Anda, pastikan telah menginstal:

- **Node.js**: Versi `v20.19.0` hingga `v22.x` (atau Node 22 LTS / 26 LTS).
- **npm**: Versi `10.x` atau lebih baru.
- **Shopify Partner Account**: Akun gratis di [Shopify Partners](https://partners.shopify.com/).
- **Development Store**: Toko uji coba (Development Store) yang sudah memiliki beberapa contoh produk.
- **Git**: Terpasang di laptop Anda.

---

## 🛠️ Panduan Instalasi & Menjalankan Aplikasi

Ikuti langkah-langkah mudah berikut untuk menjalankan project ini di komputer Anda:

### Langkah 1: Clone Repository
```bash
git clone https://github.com/Supermans21/exp-scaffold-app.git
cd exp-scaffold-app
```

### Langkah 2: Install Dependensi
```bash
npm install
```

### Langkah 3: Setup Database Sesi Lokal (Prisma)
Aplikasi menggunakan SQLite lokal hanya untuk menyimpan token sesi otentikasi merchant. Jalankan perintah:
```bash
npm run setup
```
*(Perintah ini akan menjalankan Prisma Client generate dan migrasi tabel Session).*

### Langkah 4: Menghubungkan ke Toko / Akun Partner Anda

#### Opsi A: Jika Anda sudah terdaftar di Partner Org yang sama (`MansDev Studio`)
Anda dapat langsung menjalankan aplikasi ke toko uji coba default:
```bash
npm run dev
```

#### Opsi B: Jika Anda ingin menghubungkan ke Akun Partner / Toko Dev Anda Sendiri
Jalankan konfigurasi interaktif Shopify CLI:
```bash
npm run config:link
```
Ikuti instruksi di terminal untuk memilih Partner Organization Anda dan buat aplikasi baru atau pilih aplikasi yang sudah ada. Konfigurasi `shopify.app.toml` akan otomatis terbarui.

---

### Langkah 5: Menjalankan Server Development

#### 🌐 Metode 1: Standar dengan Cloudflare Quick Tunnel (Rekomendasi)
```bash
# Menjalankan langsung ke toko default:
npm run dev

# ATAU memilih toko pengembangan lain secara interaktif:
npm run dev:any
```
- Terminal akan memunculkan prompt untuk login ke akun Shopify Partner (jika belum).
- Tekan **`P`** di terminal untuk membuka URL instalasi aplikasi di browser toko Anda.
- Klik **Install App** di admin toko Shopify.

#### 🔒 Metode 2: Menggunakan Localhost SSL (Solusi jika Cloudflare Tunnel Error/Blokir)
Jika koneksi internet Anda mengalami masalah saat meminta tunnel Cloudflare (*e.g., failed to request quick tunnel: context deadline exceeded*), Anda dapat menjalankan via localhost SSL:
```bash
# Menjalankan via localhost ke toko default:
npm run dev:local

# ATAU via localhost untuk toko mana saja:
npm run dev:local:any
```

---

## 📂 Struktur Folder Proyek

```plaintext
exp-scaffold-app/
├── app/
│   ├── models/
│   │   └── QRCode.server.js      # Logika Metaobjects GraphQL, validasi, generator gambar QR & URL diskon
│   ├── routes/
│   │   ├── app._index.jsx         # Halaman utama Admin: Search, Filter, Quick Tabs, Bulk ZIP, Sticker Sheet & Table
│   │   ├── app.qrcodes.$id.jsx    # Halaman pembuatan & edit QR Code (ResourcePicker produk, destinasi, diskon)
│   │   ├── app.jsx                # Layout admin dengan AppProvider
│   │   ├── qrcodes.$id.jsx        # Halaman publik preview QR Code
│   │   └── qrcodes.$id.scan.jsx   # Endpoint publik saat QR discan (penambahan hitung scan & redirect URL)
│   ├── db.server.js               # Koneksi database Prisma
│   └── shopify.server.js          # Inisialisasi SDK Shopify App & Webhook handlers
├── prisma/
│   ├── schema.prisma              # Skema model Prisma (Session)
│   └── migrations/                # Riwayat migrasi SQLite
├── shopify.app.toml               # Konfigurasi App, Scopes, dan Definisi Metaobjects ($app:qrcode)
├── react-router.config.js         # Konfigurasi origin CORS untuk React Router singleFetchAction
├── package.json                   # Script eksekusi dan dependensi
└── README.md                      # Dokumentasi proyek
```

---

## ⚙️ Daftar Script yang Tersedia di `package.json`

| Perintah | Deskripsi |
| :--- | :--- |
| `npm run dev` | Menjalankan server dev dengan Cloudflare tunnel ke toko default (`qr-oman-dev.myshopify.com`). |
| `npm run dev:any` | Menjalankan server dev interaktif (pilih development store sesuka Anda). |
| `npm run dev:local` | Menjalankan server dev menggunakan SSL localhost (tanpa Cloudflare tunnel). |
| `npm run dev:local:any` | Menjalankan server dev menggunakan SSL localhost untuk toko apa saja. |
| `npm run setup` | Menyiapkan Prisma Client dan migrasi database SQLite untuk sesi. |
| `npm run build` | Melakukan compile dan bundle produksi dengan React Router & Vite. |
| `npm run start` | Menjalankan server dalam mode produksi setelah build. |
| `npm run config:link` | Menghubungkan proyek ini ke Partner App baru di Shopify Partners Dashboard. |
| `npm run deploy` | Menerapkan konfigurasi app dan ekstensi ke Shopify Partners. |

---

## 🧩 Cara Menguji Fitur Aplikasi

1. **Membuat QR Code Baru:**
   - Buka aplikasi di Shopify Admin toko Anda.
   - Klik tombol **"Create QR code"** di kanan atas.
   - Masukkan judul, pilih produk toko menggunakan Shopify Resource Picker.
   - Tentukan destinasi (*Product page* atau *Cart / Checkout*).
   - *(Opsional)* Masukkan **Discount Code** yang aktif di toko Anda (misal: `HEMAT10`).
   - Klik **Save**.
2. **Menguji Pindai (Scan):**
   - Di daftar QR Code, klik tombol **"Test ↗"** pada salah satu baris.
   - Anda akan diarahkan ke toko dengan diskon otomatis terpasang dan produk langsung masuk ke keranjang/checkout!
   - Kolom **Scans** pada baris QR tersebut akan otomatis bertambah 1.
3. **Menguji Filter & Search:**
   - Ketik nama produk di search box: hasil akan memfilter secara instan.
   - Klik tab **Cart Checkout** atau **With Discount** untuk melihat pengelompokan instan.
4. **Menguji Bulk Export ZIP:**
   - Centang beberapa atau seluruh QR code di tabel.
   - Klik **Download ZIP (Selected/All)**. File zip berisi gambar PNG siap cetak akan otomatis terunduh.
5. **Menguji Cetak Label Stiker:**
   - Centang QR code yang ingin dicetak, lalu klik **Print Stickers (Selected/All)**.
   - Modal lembar stiker akan muncul. Klik **🖨️ Print Now** untuk membuka dialog cetak printer bawaan browser Anda.

---

## 💡 Troubleshooting & FAQ

### 1. Muncul error saat menjalankan `npm run dev`: *Cloudflare tunnel error: context deadline exceeded*
- **Penyebab:** Jaringan/ISP Anda memblokir koneksi ke Cloudflare Quick Tunnel (`api.trycloudflare.com`) atau server Cloudflare sedang lambat.
- **Solusi:** Jalankan menggunakan opsi localhost:
  ```bash
  npm run dev:local
  ```

### 2. Muncul error: *Bad Request (singleFetchAction)* saat menyimpan form
- **Penyebab:** Fitur Single Fetch React Router 7 memeriksa header Origin saat form disubmit dari dalam iframe Shopify Admin.
- **Solusi:** Hal ini telah diatasi secara permanen di file `react-router.config.js` dengan menyertakan domain `admin.shopify.com`, `*.myshopify.com`, dan `*.trycloudflare.com` dalam `allowedActionOrigins`.

### 3. Muncul error *EPERM: operation not permitted* pada file Prisma di Windows
- **Penyebab:** Ada proses Node latar belakang yang masih mengunci file binary SQLite/Prisma DLL.
- **Solusi:** Buka PowerShell dan matikan proses Node lama:
  ```powershell
  taskkill /F /IM node.exe
  ```

### 4. Peringatan *Node.js experimental-require-module*
- **Solusi:** Seluruh script di `package.json` sudah dilengkapi dengan flag `NODE_OPTIONS=--no-experimental-require-module` via `cross-env`, sehingga berjalan stabil di Windows, macOS, dan Linux.

---

## 📄 Lisensi
Proyek ini dilisensikan di bawah [MIT License](LICENSE.md).
