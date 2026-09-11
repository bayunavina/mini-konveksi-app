# Tech Stack Document

Dokumen ini menjelaskan teknologi yang digunakan pada **ERP Konveksi (Mini Konveksi App)**. Ditulis dalam bahasa sederhana agar semua orang — teknis maupun non-teknis — memahami mengapa setiap teknologi dipilih dan bagaimana mendukung aplikasi.

---

## 1. Teknologi Frontend

Frontend adalah apa yang dilihat dan digunakan pengguna. Untuk proyek ini digunakan:

- **Next.js 15 (App Router + Turbopack)**
  - Framework React yang menangani routing (file-based), server-side rendering, API routes, dan build produksi (`output: 'standalone'`).
  - Turbopack mempercepat dev server dan produksi build.
- **React 18**
  - Library utama untuk membangun UI berbasis komponen.
- **TypeScript 5 (strict mode)**
  - Superset JavaScript dengan tipe statis — mencegah error sejak masa development.
- **shadcn/ui + Radix UI primitives**
  - Komponen UI yang dapat disalin/disesuaikan, berbasis primitives Radix (dialog, dropdown, table, dsb). Konfigurasi ada di `components.json`.
- **Tailwind CSS v4**
  - Utility-first CSS untuk styling cepat dan konsisten. Di-load via `globals.css` + `@tailwindcss/postcss`.
- **Pendukung UI**
  - **Framer Motion (`motion`)** — animasi.
  - **next-themes** — dark mode.
  - **Lucide, Tabler Icons, Heroicons, HugeIcons** — ikon.
  - **Recharts** — grafik/dashboard.
  - **Sonner** — toast notification.
  - **Embla Carousel** — carousel.

Kombinasi ini memberikan struktur jelas (routing folder), keamanan kode (TypeScript), styling fleksibel (Tailwind), serta UI modern dan konsisten (shadcn/ui).

---

## 2. Teknologi Backend

Backend menangani data, akun pengguna, dan logika bisnis di balik layar:

- **Next.js API Routes**
  - Kode server-side (`route.ts`) berada satu proyek dengan frontend di `app/api/`.
- **Node.js Runtime**
  - Runtime JavaScript untuk menjalankan API routes.
- **Better Auth 1.x**
  - Library autentikasi modern (session-based): sign-in email/password, session cookie, dan hubungan dengan skema `user`, `session`, `account`, `verification` di `db/schema/auth.ts`.
  - Karyawan dapat login via **PIN** (`/api/auth/pin-login`).
- **bcrypt**
  - Hashing password sebelum disimpan di database.
- **Drizzle ORM + drizzle-kit**
  - TypeScript-first ORM untuk PostgreSQL; schema terpusat di `db/schema/` (`auth.ts`, `app.ts`, `index.ts`), migrasi di `drizzle/`.
- **Modul bisnis (API routes)**
  - Produksi (`job-orders`, `production`), inventory (`inventory`, `material-lots`, `products`), transfer, QC, finance (`transactions`, `advances`, `salaries`), HR, aset, notifikasi, backup.
- **Layanan integrasi**
  - **Nodemailer + Resend** — email via SMTP Gmail.
  - **Firebase Admin (`firebase-admin`)** — FCM push notification.

Backend dipisah secara fungsional per modul bisnis, dengan validasi via **zod** dan RBAC via **`lib/rbac.ts` + `lib/constants.ts`**.

---

## 3. Database & Data

- **PostgreSQL 16** (`postgres:16-alpine` di Docker) — database relasional utama.
- **Drizzle ORM** — mapping objek TypeScript ke tabel; query aman (typed).
- **Struktur tabel utama** (dari `db/schema/app.ts`):
  - Master: `master_skus`, `products`, `warehouses`, `suppliers`, `cost_categories`, `teams`, `employees`.
  - Inventory: `inventory`, `material_lots`, `inventory_stock`, `inventory_movements`.
  - Produksi: `job_orders`, `production_assignments`, `production_progress`, `production_from_materials`, `production_logs`, `production_salary`.
  - QC: `qc_reports`, `rejects`.
  - Transfer: `transfers`, `transfer_items`, `transfer_photos`.
  - Finance: `transactions`, `job_order_costs`, `advances`, `salaries`, `salary_components`.
  - Aset: `assets`, `asset_maintenance`.
  - Notifikasi: `notifications`, `notification_preferences`, `push_subscriptions`.
  - Sistem: `app_settings`.
- **Migrasi**: satu direktori (`drizzle/`) dengan repeatable SQL migrations; dipicu via script `db:generate`, `db:migrate`, `db:push`.

---

## 4. Autentikasi & Otorisasi (RBAC)

- **Better Auth**: sesi berbasis cookie (Secure/HttpOnly), tabel `session`.
- **Role**: `SUPERADMIN`, `ADMIN`, `GUDANG`, `QC`, `KARYAWAN`.
- **RBAC route**: `middleware.ts` memeriksa sesi lalu `canAccess(pathname, role)` dari `lib/rbac.ts` — halaman tanpa izin diarahkan ke dashboard role-nya.
- **Permissions API**: `lib/constants.ts` mendefinisikan `PERMISSION` (mis. `BARANG_MASUK_CREATE`, `TRANSFER_SCAN`) dan mapping `ROLE_PERMISSIONS`; dicek dengan `requirePermission`.

---

## 5. Infrastructure, Deployment & CI/CD

Infrastruktur mencakup hosting dan cara perubahan dikirim ke produksi:

- **Docker (multi-stage build)**
  - `Dockerfile` membangun image `node:20-alpine` (`base` → `deps` → `builder` → `runner`) dengan output `.next/standalone`, jalan sebagai user non-root `nextjs`.
- **Docker Compose**
  - Service: `postgres` (PostgreSQL 16 + volume), `app` (Next.js), `nginx` (reverse proxy), `postgres-dev` (profile `dev`, port 5433).
- **Nginx + SSL**
  - Nginx container atau host sebagai reverse proxy; SSL via **Let's Encrypt (Certbot)** dengan auto-renew cron.
- **deploy.sh (Ubuntu Server)**
  - Skrip produksi: install dependensi (Docker, Nginx, Certbot), clone GitHub / build lokal, generate `.env` interaktif, build image, dan setup SSL.
- **Git & GitHub**
  - Version control & hosting remote; repo menjadi sumber kode untuk deployment (GitHub Clone).
- **Script npm**
  - `db:*` (up/down/dev/migrate/studio), `docker:*` (build/up/down/logs), `deploy`, `seed:admin`, `dev`, `build`, `start`.

---

## 6. Keamanan & Performa

Keamanan:
- Password tidak disimpan plaintext — di-hash dengan **bcrypt**.
- Sesi cookie Secure + HttpOnly; PIN login untuk karyawan.
- RBAC halaman + API; permission granular (create/view/terima/delete/scan).
- HTTPS di production (Nginx + Certbot); secrets hanya di `.env`.
- `.env` di-`chmod 600` oleh deploy.sh; `.dockerignore` mengecualikan `.env*` dari image.

Performa:
- Build produksi via Turbopack + `output: 'standalone'`.
- SSR untuk halaman data; kode di-split per route oleh Next.js.
- State management server untuk query (TanStack Query) mengurangi pemanggilan API berulang.

---

## 7. Ringkasan Tech Stack

| Layer | Teknologi |
| --- | --- |
| Frontend | Next.js 15, React 18, TypeScript, Tailwind v4, shadcn/ui, TanStack Query |
| Backend | Next.js API Routes, Node.js, Drizzle ORM, Better Auth, bcrypt |
| Database | PostgreSQL 16 |
| Integrasi | Nodemailer/SMTP, Firebase FCM, QR (bwip-js/zxing/html5-qrcode), PDF (jsPDF/xlsx) |
| Infrastruktur | Docker (`node:20-alpine`), Docker Compose, Nginx, Let's Encrypt |
| Deploy | `deploy.sh` (Ubuntu), clone GitHub / build lokal |
| Kualitas | ESLint (eslint-config-next), TypeScript strict |

Stack ini memadukan ekosistem Next.js yang modern dengan ORM typed (Drizzle) dan autentikasi mudah (Better Auth), menghasilkan ERP konveksi yang aman, cepat, dan mudah di-deploy ke VPS/Ubuntu.