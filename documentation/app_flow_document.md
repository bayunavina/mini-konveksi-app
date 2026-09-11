# App Flow Document — ERP Konveksi

Dokumen ini menjelaskan alur pengguna (user flow) dalam aplikasi **ERP Konveksi**, dari autentikasi hingga seluruh alur bisnis inti (produksi, inventory, transfer, QC, finance, payroll).

---

## 1. Onboarding & Autentikasi

### Sign-In (Email/Password)
1. Pengguna membuka halaman utama `/` (landing page) → diarahkan atau memilih **Sign In**.
2. Mengisi email & password pada `/sign-in`.
3. Permintaan dikirim melalui Better Auth endpoint `POST /api/auth/*` (sign-in-email, trusted origins dari `.env`).
4. Validasi sukses → sesi (cookie Secure/HttpOnly) dibuat → pengguna diarahkan ke dashboard sesuai role:
   - `SUPERADMIN` / `ADMIN` → `/dashboard/admin`
   - `GUDANG` → `/dashboard/gudang`
   - `QC` → `/dashboard/qc`
   - `KARYAWAN` → `/dashboard/karyawan`
5. Gagal (kredensial salah) → pesan error inline di form.

### Login PIN (Karyawan)
- Karyawan produksi dapat login cepat menggunakan **PIN** melalui `/api/auth/pin-login` → langsung masuk ke dashboard karyawan.

### Proteksi Route
- `middleware.ts` memeriksa sesi untuk semua route `/dashboard*`. Pengguna tanpa sesi diarahkan ke `/sign-in?callbackUrl=...`.
- Role check: `canAccess(pathname, role)` (dari `lib/rbac.ts`). Jika role tidak diizinkan → dialihkan ke dashboard role-nya.
- Pengguna yang sudah login membuka `/sign-in` → diarahkan balik ke `/dashboard`.

### Logout
- Tombol logout → menghapus sesi → kembali ke halaman sign-in.

---

## 2. Dashboard per Role

### Admin / Superadmin (`/dashboard/admin`)
Panel kontrol manajemen: ringkasan produksi, stok, keuangan, HPP, dan rantingan akses ke semua modul:
- Produksi (Job Order), Inventory, Transfer, QC Reports, Employees, Finance, Balance, Assets, QR Generator, Settings, Log Aktivitas, Panduan.

### Gudang (`/dashboard/gudang`)
- Stok barang jadi & bahan, transfer barang masuk/keluar/finished, scan transfer.
- Karyawan gudang hanya memiliki akses menu inventory & transfer (sesuai RBAC).

### QC (`/dashboard/qc`)
- Overview QC, buat laporan QC, scan hasil produksi, input reject.

### Karyawan Produksi (`/dashboard/karyawan`)
- Melihat job order yang di-assign, mencatat **progress** (qty selesai/reject), mengirim **request QC**, melihat riwayat upah.

---

## 3. Alur Produksi (Inti Bisnis)

```
Pembuatan JO → Assign → Progress → Request QC → QC Report → Stok Jadi + Salary
```

1. **Buat Job Order** (`/dashboard/produksi`): admin memilih produk, target qty, tim, due date, nomor JO unik + QR.
2. **Assign Produksi**: admin/tim leader menugaskan ke karyawan (`production_assignments`) dengan `targetQty`, `ratePerUnit`, dan status (`ASSIGNED`).
3. **Progress Produksi**: karyawan mencatat `production_progress` (qtyCompleted, qtyRejected). Assignment memperbarui completed/rejected/accepted qty dan `pendingQty`.
4. **Request QC**: saat job selesai, karyawan/assignee menekan **request QC** (`/api/production/request-qc`) → kalkulasi upah pending.
5. **QC Inspection**: QC staff scan/inspect hasil → **QC Report** (`successQty`, `rejectQty`, notes). Reject dicatat di `rejects` (reason, status, resolution).
6. **Barang Jadi**: barang lolos masuk stok barang jadi (`inventory_stock`/`inventory_movements` type `QC_COMPLETE`).
7. **Upah**: qty accepted dihitung × rate per unit → `production_salary` / `production_logs` (per minggu & tahun) untuk payroll.

---

## 4. Alur Inventory & Transfer

### Master & Stok
- Admin mengelola **Master SKU**, **Produk**, **Gudang**, **Supplier**.
- **Material Lots**: bahan baku masuk per lot (nomor lot, QR code, qty, status `AVAILABLE`, `isReadyForProduction`).
- Stok per gudang per produk (`inventory_stock`) dengan `reservedQty`.
- Setiap perubahan stok tercatat di `inventory_movements` (IN, OUT, ADJUSTMENT, QC_COMPLETE, REJECT).

### Transfer Barang
1. Admin/gudang membuat transfer (`/dashboard/transfer/new`) → tipe **INCOMING** (barang masuk), **OUTGOING** (barang keluar), atau **FINISHED** (barang jadi).
2. Transfer mencatat item (`transfer_items`) + foto dokumentasi (`transfer_photos`, max 10 × 5MB).
3. Status transfer: `PENDING` → scanner/verifikasi menerima barang (scan QR / approval).
4. Pergerakan stok tercatat otomatis; notifikasi (email/push) dikirim ke pihak terkait sesuai `notification_preferences`.

---

## 5. Alur Quality Control

- QC staff membuka `/dashboard/qc` → tinjau daftar JO yang menunggu QC (`requestQc`).
- **Create QC Report** (`/api/qc/reports`): success/reject qty + notes.
- **Scan**: QC scan barcode hasil (`/dashboard/qc/scan`) untuk input reject/good.
- **Reject**: dictatat di `rejects`, dengan status (`PENDING` → resolved) dan resolution.
- Reject memengaruhi stok (inventory movement `REJECT`) dan perhitungan upah (qty rejected tidak dihitung).

---

## 6. Alur Finance & Payroll

### Transaksi Keuangan
- Admin input **INCOME/EXPENSE** (`/api/transactions`), categorisasi, referensi (JO, dll).
- **Cost Categories** & **Job Order Costs**: estimasi vs aktual per JO per kategori biaya (`BBL`, `ACC`, `TKL`, `TKL-P`, `OVP`, `PKG`, `GTL`, `LST`, `SEWA`, `MTC`, `BPJS`, `KON`, `ADM`, `MKT`) → perhitungan **HPP** (Harga Pokok Produksi).

### Payroll
- **Gaji periodik** (`salaries`): period, base salary, allowances, deductions, status `PENDING` → `PAID`.
- **Production Salary** (`production_salary`): total upah dari qty accepted × rate per unit, per periode.
- **Salary Components** (`salary_components`): komponen dinamis (tunjangan, potongan) dengan tipe hitung (amount/percentage/formula).
- **Salary Claims** (`admin/salary-claims`): klaim gaji karyawan + approve/sync.

### Kasbon (Advances)
- Karyawan mengajukan kasbon (`advances`): amount, purpose, status `PENDING`.
- Riwayat pembayaran (`paymentHistory`), approved by, paidAt.

---

## 7. Alur Aset

- Admin mengelola **Aset** (mesin, peralatan, furniture, kendaraan) dengan kode unik, nilai pembelian, status.
- **Maintenance schedule** (`asset_maintenance`): tipe, jadwal, teknisi, biaya, status.
- Umumnya digunakan untuk biaya MTC (service & penyusutan mesin) dalam HPP.

---

## 8. Notifikasi

- **Email**: SMTP (Gmail App Password) untuk order complete, transfer in/out, low stock.
- **Push**: Firebase FCM (`push_subscriptions` per token perangkat).
- **In-app**: tabel `notifications` untuk notifikasi internal per employee.
- Pengguna mengatur preferensi di `notification_preferences` (email/push/SMS per event).

---

## 9. Maintenance Mode

- Jika cookie `maintenance=true` aktif, semua halaman (kecuali `/maintenance`, `/dashboard/settings`, dan API) diarahkan ke halaman maintenance.
- Admin settings tetap dapat diakses saat maintenance — dikontrol di `middleware.ts`.

---

## 10. Error States & Alternate Paths

- **Kredensial salah** → pesan error inline di form sign-in.
- **Route terproteksi tanpa sesi** → redirect ke `/sign-in` dengan `callbackUrl`.
- **Role tidak diizinkan** → redirect ke dashboard role masing-masing; API mengembalikan `403 Forbidden`.
- **Database tidak tersedia** → container restart (`restart: unless-stopped`); dep check Postgres health (`pg_isready`).
- **Nginx/SSL gagal** → deploy.sh tetap memampukan akses via HTTP dan memberi instruksi manual `certbot --nginx`.

---

## 11. Kesimpulan

Alur aplikasi menghubungkan seluruh siklus bisnis konveksi: **JO → produksi → QC → stok & transfer → penjualan → keuangan → payroll**. Setiap role memiliki dashboard & izin tersendiri, dan setiap langkah dicatat (inventory movements, production progress, QC reports) sehingga menghasilkan jejak audit penuh untuk operasional, HPP, dan penggajian yang akurat.