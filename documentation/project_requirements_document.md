# Project Requirements Document: ERP Konveksi

---

## 1. Gambaran Proyek

**ERP Konveksi** adalah sistem ERP (Enterprise Resource Planning) berbasis web untuk mengelola bisnis produksi konveksi (garment/apparel). Sistem mencakup seluruh alur bisnis: dari penerimaan bahan baku, manajemen stok per gudang, pembuatan **Job Order (JO)**, penugasan produksi ke karyawan, **Quality Control (QC)**, transfer barang antar gudang, perhitungan **HPP (Harga Pokok Produksi)** per jo, hingga **penggajian** dan administrasi keuangan.

Aplikasi dibangun sebagai **full-stack Next.js 15** (App Router) dengan **PostgreSQL 16** sebagai database, menggunakan **Drizzle ORM** untuk akses data dan **Better Auth** untuk autentikasi. UI dibuat dengan **shadcn/ui + Tailwind CSS v4** dan menyediakan dashboard per-role yang berbeda untuk masing-masing pengguna.

### Tujuan Utama
1. Digitalisasi seluruh proses produksi konveksi (dari bahan baku hingga barang jadi).
2. Kontrol stok per gudang secara real-time dengan QR/barcode tracking.
3. Transparansi biaya produksi (HPP) per Job Order.
4. Perhitungan upah karyawan berbasis target & satuan (rate per unit).
5. Pengawasan kualitas (QC) dengan pencatatan reject dan resolusi.
6. Laporan keuangan (kas masuk/keluar, kasbon/advance, saldo).

---

## 2. In-Scope vs. Out-of-Scope

### In-Scope (Versi 1)

**Autentikasi & RBAC**
- Sign-in dengan email/password, login PIN (karyawan), session management.
- Peran (role): `SUPERADMIN`, `ADMIN`, `GUDANG`, `QC`, `KARYAWAN`.
- Proteksi route (halaman & API) berbasis role via `middleware.ts` + `lib/rbac.ts`.

**Master Data**
- Master SKU (`master_skus`), Produk (`products`), Supplier, Gudang (`warehouses`).
- Cost Categories untuk HPP (code: `BBL`, `ACC`, `TKL`, `TKL-P`, `OVP`, `PKG`, `GTL`, `LST`, `SEWA`, `MTC`, `BPJS`, `KON`, `ADM`, `MKT`).

**Inventory**
- Material Lots (lot bahan baku dengan QR code & nomor lot).
- Stok per gudang per produk (`inventory_stock`), reserved qty.
- Riwayat pergerakan stok (`inventory_movements`) — IN, OUT, ADJUSTMENT, QC_COMPLETE, REJECT.
- Audit stok.

**Produksi**
- Job Order (JO): nomor JO unik + QR, target qty, due date, status (DRAFT → …).
- Production Assignment: penugasan ke tim/employee dengan target & rate per unit.
- Production Progress: log progres (completed/rejected) pekerjaan.
- Produksi dari material (konversi bahan baku → produk jadi) dan production logs per minggu/tahun.

**Quality Control (QC)**
- QC Reports per JO: success qty, reject qty, notes.
- Pencatatan reject (`rejects`) dengan reason, status, resolution.
- Alur *request QC* → *scan hasil* → laporan QC.

**Transfer Barang**
- Transfer IN / OUT / finished antar gudang (incoming/outgoing/barang jadi).
- Transfer items + foto dokumentasi (`transfer_photos`).

**Finance & Payroll**
- Transaksi keuangan (INCOME/EXPENSE).
- Job Order Costs: estimasi vs aktual HPP per JO per kategori biaya.
- Salaries (periodic), Production Salary (berbasis assignment), Salary Components (komponen gaji), salary claims.
- Advances/Kasbon dengan riwayat pembayaran.

**HR**
- Employees (dengan PIN & QR), Teams, komponen gaji.
- Upah per unit (borongan), slip gaji.

**Assets**
- Pencatatan aset (mesin, peralatan, dll) + maintenance schedule.

**Notifikasi**
- Email (SMTP Gmail) dan push notification (Firebase FCM).
- Preferensi notifikasi per-user (`notification_preferences`), push subscriptions, notifikasi in-app.

**QR/Barcode**
- Generator QR & scanner (bahan baku, produk, JO, karyawan, transfer).

**Lainnya**
- Settings aplikasi, backup database, factory reset, maintenance mode.
- Log aktivitas, laporan balance per modul (stock, material lots, production, summary).
- HPP Dashboard.

### Out-of-Scope (Versi Awal / Fase Lanjutan)
- Multi-tenant (satu instalasi untuk satu usaha konveksi).
- E-commerce/penjualan online terintegrasi.
- Integrasi system akuntansi eksternal (QuickBooks, Accurate, dll).
- Report builder kustom tingkat lanjut.
- Mobile native app (web-app responsif sudah mencakup kebutuhan).

---

## 3. User Flow

### Alur Autentikasi
Pengguna (superadmin/admin) meng-input kredensial di `/sign-in`. Validasi via Better Auth (`POST /api/auth/*`). Berhasil → diarahkan ke dashboard sesuai role (`/dashboard/admin`, `/dashboard/gudang`, `/dashboard/qc`, `/dashboard/karyawan`). Karyawan dapat login via PIN (`/api/auth/pin-login`). Route `middleware.ts` memeriksa sesi dan izin role; pengguna tanpa sesi diarahkan ke `/sign-in`.

### Alur Produksi (Inti Bisnis)
1. Admin membuat **Job Order** (produk, target qty, tim, due date).
2. Job Order di-**assign** ke karyawan/penjahit (`production_assignments`) dengan target qty dan rate per unit.
3. Karyawan mencatat **progress** produksi (qty selesai / reject) via dashboard karyawan.
4. Setelah selesai, karyawan mengirim **request QC**.
5. QC melakukan **scan/inspection**, menghasilkan **QC Report** (success & reject qty) dan mencatat **reject**.
6. Barang yang lolos masuk ke stok barang jadi; hasil produksi dihitung untuk **salary**.

### Alur Inventory & Transfer
Gudang menerima bahan baku (incoming transfer) → bahan disimpan sebagai material lot per gudang. Barang keluar (outgoing) untuk produksi/kirim. Barang jadi di-transfer antar gudang (finished). Setiap pergerakan tercatat di `inventory_movements`.

### Alur Keuangan & HPP
Admin menginput transaksi keuangan (INCOME/EXPENSE). Setiap JO dicatat **cost estimasi vs aktual** per kategori (BBL, TKL, dll) untuk menghitung HPP. Kasbon karyawan dicatat sebagai advance dengan status & riwayat pembayaran.

---

## 4. Fitur Inti

### Modul (sesuai struktur `app/api/` dan `app/dashboard/`)

| Modul | Endpoint Utama (`app/api/`) | Dashboard |
| --- | --- | --- |
| Auth & Users | `auth/*`, `create-user`, `user-role`, `setup-admin` | `settings`, `sign-in` |
| Admin | `admin/salary-claims` | `admin` |
| Produksi | `job-orders`, `production/*`, `production-logs` | `produksi`, `karyawan` |
| Inventory | `inventory/*`, `products`, `master-skus`, `material-lots` | `inventory` |
| Transfer | `transfers`, `transfer-items`, `transfers/photos` | `transfer` |
| QC | `qc/*`, `qc-reports`, `rejects` | `qc`, `qc-reports` |
| Finance | `transactions`, `cost-categories`, `advances`, `balance/*`, `hpp-dashboard` | `finance`, `balance` |
| Payroll | `salaries`, `admin/salary-claims` | `finance` |
| HR | `employees`, `teams`, `employees-with-password` | `employees` |
| Assets | `assets`, `assets/maintenance` | `assets` |
| Notifikasi | `notifications`, `push` | — |
| Master | `warehouses`, `suppliers`, `master-skus` | — |
| Tool | `backup`, `factory-reset`, `seed`, `settings` | `settings` |

### Fitur Keamanan
- Session-based auth (Better Auth), login email/password + PIN karyawan.
- RBAC di halaman (`canAccess`) dan API (`checkPermission` / `requirePermission`).
- Permission granular untuk transfer (create/view/terima/delete/scan) di `lib/constants.ts`.

---

## 5. Tech Stack & Tools

- **Framework**: Next.js 15 (App Router, Turbopack, `output: 'standalone'`).
- **Language**: TypeScript 5 (strict mode).
- **UI**: React 18, shadcn/ui, Tailwind CSS v4, Radix UI primitives, Framer Motion, next-themes (dark mode).
- **Data Fetching**: TanStack Query, React Table.
- **Charting**: Recharts.
- **Backend**: Next.js API Routes (Node.js).
- **ORM**: Drizzle ORM + drizzle-kit (PostgreSQL 16).
- **Auth**: Better Auth 1.x (session, email).
- **Kriptografi**: bcrypt (password hashing).
- **QR/Barcode**: html5-qrcode, @zxing/browser, react-zxing, bwip-js, qrcode.react.
- **PDF/Excel**: jsPDF, jsPDF-autotable, xlsx, html-to-image, dom-to-image.
- **Email**: Nodemailer + Resend (SMTP Gmail App Password).
- **Push**: Firebase FCM.
- **Infrastruktur**: Docker (multi-stage), docker-compose (app + postgres + nginx), deploy.sh.

---

## 6. Non-Functional Requirements

- **Performance**: Build production via Turbopack; SSR/SSG untuk halaman; query DB dioptimasi dengan indexing & relation.
- **Security**:
  - HTTPS-only di production (Nginx + Let's Encrypt via `deploy.sh`).
  - Secrets via `.env` (tidak pernah di-commit).
  - Password di-hash (bcrypt); sesi HttpOnly/Secure cookie.
  - RBAC + permission check di middleware & API.
- **Scalability**: Arsitektur horizontal (stateless app) + PostgreSQL; CSS container untuk restart.
- **Usability**: UI responsif (mobile-first), dashboard per role, mode gelap.
- **Maintainability**: TypeScript strict, ESLint (eslint-config-next), Drizzle schema tunggal (`db/schema/`).

---

## 7. Constraint & Asumsi

- **Node.js** `>=20` (Docker image `node:20-alpine`).
- **PostgreSQL 16** (`postgres:16-alpine`).
- **Next.js 15** App Router, React 18, TypeScript 5.
- **Auth**: Better Auth dengan provider credentials (email+password) — memerlukan `BETTER_AUTH_SECRET`.
- **SMTP**: memakai Gmail App Password; push notif memakai Firebase service account.
- **Hosting**: Docker Compose di VPS/Ubuntu (bukan serverless), dengan `deploy.sh` untuk produksi + Nginx + SSL.
- **Browser**: Evergreen browsers modern; mobile-first.

---

## 8. Known Issues & Potential Pitfalls

- **Ketersediaan ENV**: auth/email/firebase yang tidak diset mengakibatkan fitur nonaktif → deploy.sh men-generate `.env` interaktif.
- **Migrasi & seed**: `db:generate`/`db:migrate` harus sinkron dengan schema; seed superadmin via `npm run seed:admin`.
- **Port conflict**: Docker memetakan 5432 (postgres), 3000 (app), 80/443 (nginx). Konflik port umum jadi kegagalan startup.
- **RBAC kompleks**: banyak aturan prefix di `lib/rbac.ts` — penambahan route baru harus didaftarkan eksplisit.
- **Keamanan kredensial default**: `docker-compose.yaml` memakai `konveksi_password` default — harus diganti di production (deploy.sh sudah generate password acak).
- **Kurangnya automated test**: test suite (unit/E2E) belum lengkap — direncanakan via TestSprite/Playwright.

---

## 9. Ringkasan

**ERP Konveksi** adalah sistem ERP khusus produksi garment yang mencakup: **produksi (Job Order & assignment), inventory & transfer stok, quality control, finance & HPP, payroll (upah borongan & kasbon), HR, aset, dan notifikasi**. Dibangun di atas Next.js 15 + PostgreSQL + Drizzle + Better Auth, dengan UI shadcn/Tailwind, dan di-deploy dengan Docker + Nginx + SSL (Let's Encrypt). Dokumen ini menjadi sumber kebenaran tunggal untuk dokumen teknis turunan: Tech Stack, Frontend Guidelines, Backend Structure, App Flow, App Flowchart, dan Security Guidelines.