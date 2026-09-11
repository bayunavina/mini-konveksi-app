# Backend Structure Document — ERP Konveksi

Dokumen ini menjelaskan arsitektur backend, database, dan infrastruktur **ERP Konveksi**. Ditulis dengan bahasa sederhana agar siapa pun memahami bagaimana backend diatur dan mendukung aplikasi.

---

## 1. Arsitektur Backend

- **Framework & Pola**
  - Backend memakai **Next.js API Routes** — kode server berada di `app/api/` satu proyek dengan frontend.
  - Pola berlapis:
    1. **API Layer** (`app/api/**/route.ts`) — menerima request HTTP (GET/POST/PUT/DELETE).
    2. **Service/Business Logic Layer** — validasi (zod), RBAC/permission, logika bisnis (status assignment, perhitungan upah, pergerakan stok).
    3. **Data Access Layer** — **Drizzle ORM** dengan schema terpusat (`db/schema/`).

- **Modularitas**
  - Kode dikelompokkan per modul bisnis: `job-orders`, `production/*`, `inventory/*`, `transfers`, `qc`, `salaries`, `advances`, `transactions`, `assets`, `employees`, `notifications`, dll.

- **Skalabilitas**
  - API routes stateless → dapat diskala horizontal. Container app adalah `output: 'standalone'` Node server di Docker.
  - PostgreSQL menyimpan state; volume Docker `postgres_data` menjaga durabilitas.

- **Maintainability**
  - Schema database tunggal (`db/schema/app.ts` + `db/schema/auth.ts`) + migrasi Drizzle.
  - RBAC terpusat (`lib/rbac.ts`, `lib/constants.ts`) untuk halaman & API.

---

## 2. Manajemen Database

- **Pilihan DB**: **PostgreSQL 16** (`postgres:16-alpine`), container bernama `postgres` (port 5432) + `postgres-dev` (profile dev, port 5433).
- **Akses data**: **Drizzle ORM** — TypeScript-first; query aman/typed; pool koneksi via `pg` (`db/index.ts`).
- **Migrasi**: direktori `drizzle/` berisi SQL migrations (13+ file) + generated `schema.ts`/`relations.ts`. Alur: `db:generate` → `db:migrate` (atau `db:push` untuk cepat).
- **Seed**: `npm run seed:admin` membuat superadmin default; script seed lain di `scripts/`.

---

## 3. Skema Database

### Auth (Better Auth — `db/schema/auth.ts`)
- `user`: id, name, email (unique), emailVerified, image.
- `session`: token (unique), expiresAt, ipAddress, userAgent, userId → cascade.
- `account`: provider credentials (password hashed via bcrypt disimpan di `account.password`).
- `verification`: token verifikasi.

### Bisnis (`db/schema/app.ts`)

**Master Data**
- `master_skus` — kode, nama, kategori, unit, harga.
- `products` — SKU produk, kategori, min stock, source (MANUAL/seeded).
- `warehouses` — kode/nama gudang.
- `suppliers` — supplier bahan baku.
- `teams` — tim produksi (leader, active).
- `employees` — karyawan: name, PIN, QR code, role, team, employment type, base salary, rate per unit.
- `cost_categories` — kode + nama kategori biaya (`BBL`, `ACC`, ...).

**Inventory**
- `inventory` — stok per produk per gudang + lot & lokasi.
- `material_lots` — lot bahan baku: nomor lot, QR, qty, initialQty, status, isReadyForProduction, supplier.
- `inventory_stock` — stok real-time + `reservedQty`.
- `inventory_movements` — riwayat semua pergerakan (IN/OUT/ADJUSTMENT/QC_COMPLETE/REJECT).

**Produksi**
- `job_orders` — JO: nomor unik + QR, product, team, qc employee, target/completed/rejected qty, status (`DRAFT`, dll), due date.
- `production_assignments` — penugasan ke employee: targetQty, completed/rejected/accepted/pending qty, ratePerUnit, status (`ASSIGNED`), qcRequestedAt, timestamps.
- `production_progress` — log progres per assignment (qtyCompleted, qtyRejected).
- `production_from_materials` — konversi bahan (lot) → produk.
- `production_logs` — output terindividu per minggu/tahun (periodWeek, periodYear).
- `production_salary` — ringkasan upah per assignment/periode.

**QC**
- `qc_reports` — per JO/employee: successQty, rejectQty, notes.
- `rejects` — reject per JO/produk/QC report: qty, reason, status (`PENDING`), resolution, resolvedBy.

**Transfer**
- `transfers` — nomor transfer, type (`INCOMING`/`OUTGOING`/`FINISHED`), from/to warehouse, status.
- `transfer_items` — item transfer (product, sku code/name, qty, unit).
- `transfer_photos` — foto dokumentasi (up to 10, 5MB) per transfer.

**Finance**
- `transactions` — INCOME/EXPENSE, kategori, amount, reference, jobOrderId.
- `job_order_costs` — biaya per JO per kategori: type (DIRECT/INDIRECT), estimated & actual amount → **HPP**.
- `advances` — kasbon: amount, purpose, status, paidAmount, paymentHistory (JSON), approvedBy.
- `salaries` — gaji periodik: baseSalary, totalAllowances/Deductions, totalSalary, status.
- `salary_components` — komponen gaji dinamis (amount/percentage/formula).

**Aset & Maintenance**
- `assets` — kode, nama, kategori (MACHINE/EQUIPMENT/FURNITURE/VEHICLE/OTHER), nilai, status.
- `asset_maintenance` — jadwal maintenance: type, dates, technician, cost, status.

**Notifikasi & Pengaturan**
- `notifications` — notifikasi in-app per employee/actor.
- `notification_preferences` — pref per user (email/push/sms untuk order-complete, transfer-in/out, low-stock).
- `push_subscriptions` — token FCM per perangkat.
- `app_settings` — key/value pengaturan aplikasi.

---

## 4. API Design & Endpoints

Pendekatan **RESTful**, semua di bawah `/api`. Semua route dilindungi middleware (sesi) dan RBAC/permission (rol).

Ringkasan modul & endpoint:

| Modul | Prefix (`app/api/`) | Contoh Endpoint |
| --- | --- | --- |
| Auth | `auth/*` | `auth/pin-login`, `auth/get-session`, `auth/sign-in-email`, Better Auth `auth/[...all]` |
| Users | `users`, `create-user`, `create-or-update-user`, `user-role`, `setup-admin` | create, update role, setup superadmin |
| Admin | `admin/salary-claims` | `approve`, `sync` |
| Produksi | `job-orders/*`, `production/*`, `production-logs` | buat JO, `assign`, `progress`, `request-qc`, `summary`, `from-materials` |
| Inventory | `inventory/*`, `products`, `master-skus`, `material-lots`, `balance/stock` | `stock`, `movements`, `audit`, `summary` |
| Transfer | `transfers`, `transfers/photos`, `transfer-items` | create/list/get photo |
| QC | `qc/*`, `qc-reports`, `rejects` | `job-orders`, `reports`, create/get |
| Finance | `transactions`, `cost-categories`, `advances/*`, `salaries/*`, `balance/*`, `hpp-dashboard` | kasbon, payroll, HPP |
| HR | `employees/*`, `teams` | employees, teams |
| Assets | `assets/*`, `assets/maintenance` | CRUD + maintenance |
| Notifikasi | `notifications`, `push` | list, mark-read, subscribe FCM |
| Sistem | `settings`, `backup`, `factory-reset`, `seed`, `debug-session` | export backup, reset |

### Komunikasi
- Frontend mengirim JSON; backend merespons JSON dengan status code HTTP yang sesuai.
- Auth: cookie sesi (Better Auth) dikirim otomatis; middleware memvalidasi via `/api/debug-session2`.

---

## 5. RBAC & Otorisasi

- **Role**: `SUPERADMIN`, `ADMIN`, `GUDANG`, `QC`, `KARYAWAN`.
- **Route rules** (`lib/rbac.ts`): prefix → allowed roles; `canAccess()` memutuskan akses halaman.
- **Permission-based** (`lib/constants.ts`): `PERMISSION` enum (mis. `BARANG_MASUK_CREATE/VIEW/TERIMA/DELETE`, `BARANG_KELUAR_*`, `TRANSFER_SCAN`); `ROLE_PERMISSIONS` memetakan role → daftar permission; `requirePermission()` di API.
- **Middleware** (`middleware.ts`):
  - Sesi valid? → lanjut / redirect sign-in.
  - RBAC halaman: role diizinkan? → lanjut / redirect ke dashboard role.
  - API: `canAccess(pathname, role)` + mapping `API_PERMISSION_ROUTES` → `403 Forbidden` jika tidak diizinkan.

---

## 6. Hosting & Infrastruktur

- **VPS/Ubuntu** dengan Docker Compose sebagai target utama produksi.
- **Komponen**:
  - `postgres` (PostgreSQL 16) — volume `postgres_data`.
  - `app` — image multi-stage `node:20-alpine` (`.next/standalone`), non-root user `nextjs`, port 3000.
  - `nginx` — reverse proxy (port 80/443), mount config & Let's Encrypt certs.
  - `postgres-dev` — profile dev (port 5433).
- **Deploy**: `deploy.sh` (install deps, clone GitHub/build lokal, generate `.env`, build, Nginx, Certbot SSL, cron renew).
- **Degradasi**: `restart: unless-stopped` + healthcheck postgres (`pg_isready`) + `depends_on: condition: service_healthy`.

---

## 7. Keamanan Backend

- **Auth**: Better Auth sessions (cookie Secure/HttpOnly), email/password + PIN karyawan.
- **Password**: hashed `bcrypt`; tidak pernah plaintext.
- **RBAC**: di middleware (halaman) + permission check di API; response `403` konsisten.
- **Input**: validasi zod pada data masuk; typed query lewat Drizzle (cegah SQL injection).
- **Secrets**: hanya dari `.env`; `.gitignore`/`.dockerignore` mengecualikan `.env*`.
- **HTTPS**: Nginx + Let's Encrypt; enforce redirect HTTP→HTTPS di production.
- **Data**: `.env` di-`chmod 600`; `.dockerignore` mencegah secret masuk image.

---

## 8. Monitoring & Maintenance

- **Logging**: `docker compose logs -f` (app/postgres/nginx); logs container di-persist via `restart: unless-stopped`.
- **Health**: healthcheck PostgreSQL (`pg_isready`) + `docker compose ps`.
- **Backup**: endpoint `/api/backup` (export DB); `factory-reset` untuk reset dev.
- **Migrasi**: `npm run db:migrate`/`db:push` saat deploy; `db:generate` saat schema berubah.
- **Renewal SSL**: cron `certbot renew` otomatis (dengan pre/post-hook stop/start nginx).

---

## 9. Kesimpulan

Backend **ERP Konveksi** dibangun di atas Next.js API Routes + Node.js, PostgreSQL 16, dan Drizzle ORM, dengan arsitektur berlapis yang modular per modul bisnis (produksi, inventory, transfer, QC, finance, payroll, HR, aset). Keamanan dijaga oleh Better Auth (sesi) dan RBAC ganda (halaman + API dengan permission granular). Deployment ke Ubuntu production dilakukan via Docker Compose + Nginx + Let's Encrypt oleh `deploy.sh`, siap untuk operasional konveksi skala UKM.