# Plan for Running Mini Konveksi App

## Arsitektur Aplikasi

Aplikasi ini menggunakan **Next.js monorepo architecture** - frontend dan backend adalah satu server yang sama:

| Komponen | Lokasi | Port |
|----------|--------|------|
| Frontend (React) | `app/` | 3000 |
| Backend (API Routes) | `app/api/` | 3000 |
| Database (PostgreSQL) | Docker | 5432/5433 |

> **Tidak ada server terpisah** - Next.js menangani keduanya.

---

## Opsi Menjalankan Aplikasi

### Opsi 1: Development (Recommended)

```bash
# Terminal 1: Start Database PostgreSQL
npm run db:up

# Terminal 2: Start Next.js (Frontend + Backend)
npm run dev
```

### Opsi 2: Full Docker Stack

```bash
# Start semua (App + Database)
npm run docker:up

# View logs
npm run docker:logs
```

### Opsi 3: Dengan Development Database (port 5433)

```bash
# Terminal 1
npm run db:dev

# Terminal 2
npm run dev
```

---

## Diagram Alur

```
┌─────────────────────────────────────────────────────┐
│                  BROWSER (Port 3000)                │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│           NEXT.JS SERVER (npm run dev)              │
│  ┌─────────────────────┬─────────────────────┐    │
│  │     FRONTEND        │      BACKEND        │    │
│  │   (React Pages)     │   (API Routes)     │    │
│  │   app/page.tsx      │   app/api/*        │    │
│  └─────────────────────┴─────────────────────┘    │
└─────────────────────┬───────────────────────────────┘
                      │ DATABASE_URL
                      ▼
┌─────────────────────────────────────────────────────┐
│        POSTGRESQL (Docker - Port 5432/5433)        │
└─────────────────────────────────────────────────────┘
```

---

## Script yang Tersedia

| Script | Fungsi |
|--------|--------|
| `npm run db:up` | Start PostgreSQL (port 5432) |
| `npm run db:dev` | Start PostgreSQL dev (port 5433) |
| `npm run db:push` | Push schema ke database |
| `npm run dev` | Start Next.js dev server |
| `npm run docker:up` | Start full stack (app + db) |
| `npm run docker:down` | Stop all containers |

---

## Langkah Awal (First Time Setup)

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env

# 3. Start database
npm run db:up

# 4. Push database schema
npm run db:push

# 5. Start development server
npm run dev
```

Buka browser di **http://localhost:3000**

# User Admin
admin@konveksi.com
Admin123!

# user Karyawan
karyawan@konveksi.com
Karyawan123!

# User QC
qc@konveksi.com
QC123!

# User gudang
gudang@konveksi.com
Gudang123!

added 1 package, and audited 654 packages in 7s
167 packages are looking for funding
  run `npm fund` for details
14 vulnerabilities (7 moderate, 7 high)
To address issues that do not require attention, run:
  npm audit fix
To address all issues possible (including breaking changes), run:
  npm audit fix --force
Some issues need review, and may require choosing
a different dependency.
Run `npm audit` for details. 

Promp Update Next JS

# Prompt Deploy ke Versi Stabil
---
# DEPLOY PRODUCTION - Mini Konveksi ERP
## Langkah Pertama: Upgrade ke Versi Stabil
Jalankan command ini di terminal project:
```bash
# Stop dev server terlebih dahulu (Ctrl+C)
# Install versi stabil
npm install next@15 react@18 react-dom@18
# Install ulang dependencies untuk kompatibilitas
npm install
# Verifikasi versi
npm list next react react-dom