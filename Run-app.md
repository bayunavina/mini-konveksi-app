# Panduan Menjalankan ERP Konveksi

## Arsitektur Aplikasi

Aplikasi ini menggunakan **Next.js monorepo architecture** - frontend dan backend dalam satu server yang sama:

| Komponen              | Lokasi       | Port      |
| --------------------- | ------------ | --------- |
| Frontend (React)      | `app/`     | 3000      |
| Backend (API Routes)  | `app/api/` | 3000      |
| Database (PostgreSQL) | Docker       | 5432/5433 |

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

| Script                  | Fungsi                           |
| ----------------------- | -------------------------------- |
| `npm run db:up`       | Start PostgreSQL (port 5432)     |
| `npm run db:down`     | Stop PostgreSQL                  |
| `npm run db:dev`      | Start PostgreSQL dev (port 5433) |
| `npm run db:push`     | Push schema ke database          |
| `npm run db:migrate`  | Jalankan migration database      |
| `npm run db:studio`   | Buka database GUI (Drizzle)      |
| `npm run dev`         | Start Next.js dev server         |
| `npm run build`       | Build untuk produksi             |
| `npm run start`       | Start production server          |
| `npm run lint`        | Jalankan ESLint                  |
| `npm run docker:up`   | Start full stack (app + db)      |
| `npm run docker:down` | Stop all containers              |
| `npm run docker:logs` | Lihat logs container             |
| `npm run seed:admin`  | Seed akun superadmin             |

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

# 5. Seed superadmin
npm run seed:admin

# 6. Start development server
npm run dev
```

Buka browser di **http://localhost:3000**

---

## Akun Default

### Superadmin

- Email: `erpkonveksi@gmail.com`
- Password: `erpkonveksi123!`

### Karyawan

- Email: `karyawan@konveksi.com`
- Password: `Karyawan123!`

### User QC

- Email: `qc@konveksi.com`
- Password: `QC123!`

### User Gudang

- Email: `gudang@konveksi.com`
- Password: `Gudang123!`

> Akun di atas disediakan oleh script seed (`scripts/seed.ts`). Gunakan `npm run seed:admin` jika akun superadmin ingin dibuat ulang/direset, dan tambahkan user lain melalui menu **Settings → Users** di dashboard.

---

## Deploy Produksi

### Opsi 1: Deploy Manual

```bash
# Build & start full stack (app + database)
npm run deploy
# atau
npm run docker:up
```

> Sebelum deploy, pastikan `.env` sudah diisi dengan nilai produksi (`DATABASE_URL`, `BETTER_AUTH_SECRET`, dll). Kredensial database produksi di `docker-compose.yaml` menggunakan `konveksi_user` / `konveksi_password` / `konveksi_db`.

### Opsi 2: Deploy via Script (Ubuntu Server)

Script `deploy.sh` mengotomatiskan seluruh proses: install dependensi, clone dari GitHub (atau build lokal), generate `.env`, build Docker, setup Nginx reverse proxy, dan SSL (Let's Encrypt).

```bash
# Dari dalam repo
sudo ./deploy.sh

# Atau clone script ke server lain
scp deploy.sh user@server:/tmp/
ssh user@server "sudo /tmp/deploy.sh"
```

**Yang dilakukan script:**

| Langkah                | Deskripsi                                                                  |
| ---------------------- | -------------------------------------------------------------------------- |
| 1. Pre-flight check    | Auto-install Docker, Docker Compose, Git, Nginx, Certbot jika belum ada    |
| 2. Pilih mode          | `[1]` GitHub Clone (input URL) atau `[2]` Build Lokal (file sudah ada) |
| 3. Konfigurasi`.env` | Input domain, auto-generate auth secret & DB password, optional SMTP       |
| 4. Nginx config        | Generate reverse proxy →`http://erp-konveksi-app:3000`                  |
| 5. Docker build        | `docker compose build --no-cache && up -d`                               |
| 6. SSL (opsional)      | Certbot standalone + auto-renew cron (jika domain bukan localhost)         |
| 7. Summary             | Tampilkan URL, perintah logs, restart, troubleshooting                     |
