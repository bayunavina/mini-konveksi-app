# App Flowchart — ERP Konveksi (Mini Konveksi App)

Berikut flowchart alur utama aplikasi dalam format Mermaid.

## 1. Autentikasi & RBAC

```mermaid
flowchart TD
  Start[Landing Page /] -->|Sign In| SignIn[Sign-In via Email/Password]
  Start -->|Login PIN| PinLogin[Login PIN Karyawan]

  SignIn -->|Success| CheckRole{Deteksi Role}
  PinLogin --> CheckRole

  CheckRole -->|SUPERADMIN/ADMIN| AdminDash[/dashboard/admin]
  CheckRole -->|GUDANG| GudangDash[/dashboard/gudang]
  CheckRole -->|QC| QCDash[/dashboard/qc]
  CheckRole -->|KARYAWAN| KaryawanDash[/dashboard/karyawan]

  CheckRole -->|Akses route lain| Middleware{Middleware: canAccess?}
  Middleware -->|Tidak diizinkan| Redirect[Redirect ke dashboard role]
  Middleware -->|Diizinkan| Route[Akses Halaman]

  SignIn -->|Gagal| SignIn
  Route -.- Auth[Session cookie - Better Auth]
```

## 2. Alur Produksi (Inti)

```mermaid
flowchart TD
  BuatJO[Admin: Buat Job Order] --> Assign[Assign Produksi ke Tim/Karyawan]
  Assign -->|targetQty + ratePerUnit| Progress[Karyawan: Catat Progress]

  Progress --> RequestQC[Request QC]
  RequestQC --> QC[QC Staff: Scan & Inspeksi]

  QC -->|Lolos| StokJadi[Update Stok Barang Jadi<br/>inventory_movements: QC_COMPLETE]
  QC -->|Reject| Reject[Catat Reject<br/>rejects + movement REJECT]

  StokJadi --> Salary[Hitung Upah: qty accepted × rate<br/>production_salary / production_logs]
  Reject --> Salary
```

## 3. Inventory & Transfer

```mermaid
flowchart TD
  Material[Bahan Baku Masuk per Lot] --> Stok[Stok per Gudang<br/>inventory_stock + movements]

  TransferBuat[Admin/Gudang: Buat Transfer] --> Tipe{Type}
  Tipe -->|INCOMING| Masuk[Barang Masuk]
  Tipe -->|OUTGOING| Keluar[Barang Keluar]
  Tipe -->|FINISHED| Jadi[Barang Jadi Transfer]

  Masuk --> Foto[Dokumentasi Foto<br/>transfer_photos]
  Keluar --> Foto
  Jadi --> Foto

  Foto --> Scan[Verifikasi via Scan] --> UpdateStok[Update Stok Antar Gudang]
  UpdateStok --> Notif[Notifikasi Email/Push]
```

## 4. Alur Keuangan & Payroll

```mermaid
flowchart TD
  Trans[Input Transaksi INCOME/EXPENSE] --> Cat[Laporan Keuangan]

  Cost[HPP: Job Order Costs<br/>estimasi vs aktual per kategori] --> HPP[Perhitungan HPP per JO<br/>BBL, ACC, TKL, TKL-P, OVP, PKG<br/>GTL, LST, SEWA, MTC, BPJS, KON, ADM, MKT]

  Salary[Salaries / Production Salary] -->|PENDING| Pay[Dibayar / PAID]
  Claim[Salary Claims] -->|Approve/Sync| Salary

  Kasbon[Advances / Kasbon] -->|PENDING| Bayar[Riwayat Pembayaran]
  Bayar -->|Lunas| Selesai[Status Selesai]
```

## 5. Service & Infrastruktur (Deployment)

```mermaid
flowchart LR
  User[Browser] -->|HTTPS 443| Nginx[Nginx Reverse Proxy]
  Nginx -->|proxy_pass| App[Next.js App :3000]
  App -->|Drizzle ORM| Postgres[(PostgreSQL 16<br/>postgres:5432)]

  Nginx -.->|Let's Encrypt SSL| Certbot[Certbot Auto-Renew]
  App -.->|SMTP| Email[Email Gmail]
  App -.->|FCM| Push[Firebase Push]
```

## 6. Ringkasan Siklus Bisnis End-to-End

```mermaid
flowchart LR
  Bahan[Bahan Baku] --> Inv[Inventory Gudang]
  Inv --> JO[Job Order]
  JO --> Prod[Produksi]
  Prod --> QC[QC]
  QC --> Finish[Barang Jadi / Transfer]
  Finish --> Jual[Penjualan]
  Jual --> Fin[Keuangan & HPP]
  Prod --> Payroll[Upah / Payroll]
  Fin --> Payroll
```