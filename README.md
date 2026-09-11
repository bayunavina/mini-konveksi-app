# Mini Konveksi App (ERP Konveksi)

Sistem ERP untuk manajemen produksi konveksi berbasis web. Dibangun dengan **Next.js 15 (App Router + Turbopack)**, **TypeScript**, **Drizzle ORM**, dan **PostgreSQL**.

## Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router with Turbopack)
- **Language:** TypeScript
- **Authentication:** [Better Auth](https://better-auth.com/)
- **Database:** [Drizzle ORM](https://orm.drizzle.team/) dengan PostgreSQL 16
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/) + Tailwind CSS v4
- **Data Fetching:** TanStack Query + React Table
- **Charting:** Recharts
- **QR/Barcode:** html5-qrcode, @zxing/browser, bwip-js, react-zxing
- **PDF/Excel:** jsPDF, xlsx
- **Notification:** Email (Nodemailer/SMTP) + Firebase FCM (push)
- **Icons:** Lucide React, Tabler Icons, Heroicons

## Fitur Utama

- 🔐 **Autentikasi & Peran (Role-Based):** ADMIN, OPERATOR, GUDANG, QC, KEUANGAN, MANAGER, KARYAWAN, VIEWER
- 📦 **Inventory:** Bahan baku (material lots), produk jadi, barang reject, stok per gudang
- 🏭 **Produksi:** Job Order (JO), penugasan produksi, progress, log produksi
- ✅ **Quality Control:** Laporan QC, input reject, scan hasil produksi
- 🔄 **Transfer Barang:** Transfer antar gudang (incoming/outgoing/finished)
- 💰 **Finance:** Transaksi kasbon (advances), laporan keuangan, pembayaran
- 👥 **HR:** Karyawan, tim, upah per unit, komponen gaji, slip gaji
- 🏷️ **Aset:** Pencatatan aset & pemeliharaan mesin
- 📊 **Dashboard per Role:** Admin, Gudang, QC, Karyawan
- 📄 **QR Generator & Scanner**
- 🔔 **Notifikasi:** Email (SMTP Gmail) & push notification (Firebase)
- 🌙 **Dark mode** dengan next-themes

## Prasyarat

- Node.js 18+
- Docker & Docker Compose (untuk database PostgreSQL)

## Quick Start (Development)

```bash
# 1. Install dependencies
npm install

# 2. Setup environment variables
cp .env.example .env

# 3. Start PostgreSQL (port 5432)
npm run db:up

# 4. Push database schema
npm run db:push

# 5. Seed Superadmin
npm run seed:admin

# 6. Start development server
npm run dev
```

Buka **http://localhost:3000**

### Akun Default (Superadmin)

```
Email:    erpkonveksi@gmail.com
Password: erpkonveksi123!
```

> Akun karyawan/gudang/QC dibuat melalui menu **Dashboard → Settings → Users** atau di-seed via `scripts/seed.ts`.

### Scan QR dari HP via Tailscale (HTTPS local-ssl-proxy)

Kamera di browser hanya bisa diakses di **secure context** (`https://` atau `localhost`).
`next dev --experimental-https` hanya melayani TLS di loopback (bukan di IP
Tailscale/LAN), jadi untuk mengakses dari HP via Tailscale pakai proxy TLS:

```bash
# Terminal 1 — dev server plain HTTP di port 3000
npm run dev &

# Terminal 2 — TLS self-signed di port 3001 (pakai cert yang sudah dibuat)
npx local-ssl-proxy --source 3001 --target 3000 \
  --key certs/dev-key.pem --cert certs/dev-cert.pem &
```

Kemudian di HP buka **`https://100.102.84.1:3001`** (ganti IP sesuai node Tailscale),
lalu pada peringatan sertifikat pilih **Advanced → Proceed**, dan izinkan akses kamera.

Origin `https://100.102.84.1:3000/3001` sudah terdaftar di `lib/auth.ts`
(`trustedOrigins`) agar autentikasi/CSRF tidak diblokir.

## Environment Variables

Salin `.env.example` menjadi `.env`. Konfigurasi lengkap:

| Variabel                                                                       | Deskripsi                                                                                             |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                               | Koneksi PostgreSQL (default dev: port`5433` saja, `db:up` memakai `5432` sesuai docker-compose) |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD`                    | Kredensial database dev                                                                               |
| `BETTER_AUTH_SECRET`                                                         | Secret untuk Better Auth                                                                              |
| `BETTER_AUTH_URL` / `NEXT_PUBLIC_BETTER_AUTH_URL`                          | URL base aplikasi                                                                                     |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `EMAIL_FROM` | Email service (Gmail App Password)                                                                    |
| `FIREBASE_SERVICE_ACCOUNT`                                                   | Service account JSON untuk push notification                                                          |

> **Catatan:** `docker-compose.yaml` memetakan container `postgres` ke port **5432** (kredensial `konveksi_user`/`konveksi_password`/`konveksi_db`). Untuk mode development gunakan service `postgres-dev` (port **5433**) yang memakai variabel dari `.env`.

## Script Tersedia

### Aplikasi

| Script            | Fungsi                       |
| ----------------- | ---------------------------- |
| `npm run dev`   | Start dev server (Turbopack) |
| `npm run build` | Build produksi               |
| `npm run start` | Start production server      |
| `npm run lint`  | Jalankan ESLint              |

### Database

| Script                  | Fungsi                           |
| ----------------------- | -------------------------------- |
| `npm run db:up`       | Start PostgreSQL (port 5432)     |
| `npm run db:down`     | Stop PostgreSQL                  |
| `npm run db:dev`      | Start PostgreSQL dev (port 5433) |
| `npm run db:dev-down` | Stop PostgreSQL dev              |
| `npm run db:push`     | Push schema ke database          |
| `npm run db:generate` | Generate migration               |
| `npm run db:migrate`  | Jalankan migration               |
| `npm run db:studio`   | Buka Drizzle Studio              |
| `npm run db:reset`    | Drop & push ulang schema         |
| `npm run seed:admin`  | Seed superadmin                  |

### Docker

| Script                   | Fungsi                                            |
| ------------------------ | ------------------------------------------------- |
| `npm run docker:build` | Build image app                                   |
| `npm run docker:up`    | Start full stack (app + db)                       |
| `npm run docker:down`  | Stop semua container                              |
| `npm run docker:logs`  | Lihat logs container                              |
| `npm run deploy`       | Rebuild & deploy (down → build --no-cache → up) |
| `sudo ./deploy.sh`    | Production deploy (install deps + build + Nginx + SSL) |

## Struktur Proyek

```
mini-konveksi-app/
├── app/                        # Next.js App Router
│   ├── api/                    # API routes (admin, produksi, qc, dll)
│   ├── dashboard/              # Halaman dashboard per role & modul
│   ├── overview/               # Halaman overview (finance)
│   ├── maintenance/            # Maintenance mode page
│   ├── sign-in/  sign-up/      # Autentikasi
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Landing page
├── components/                 # React components (UI & fitur)
├── db/                         # Drizzle config & schema
│   └── schema/                 # auth.ts, app.ts, index.ts
├── drizzle/                    # File migrasi
├── hooks/                      # Custom hooks
├── lib/                        # Utility: auth, email, firebase, dll
├── public/                     # Aset statis
├── scripts/                    # Seed scripts (admin, user, dll)
├── nginx/templates/            # Template config Nginx reverse proxy
├── deploy.sh                   # Script production deployment (Ubuntu server)
├── docker-compose.yaml         # postgres, postgres-dev, app, nginx
├── Dockerfile                  # Container app
├── middleware.ts               # Route protection & maintenance mode
└── drizzle.config.ts           # Konfigurasi Drizzle Kit
```

## Mode Maintenance & Deploy

- **Maintenance mode:** dikontrol via cookie `maintenance=true` (lihat `middleware.ts`). Halaman admin settings tetap bisa diakses saat maintenance.
- **Production deploy:** `npm run deploy`, `npm run docker:up`, atau `sudo ./deploy.sh` (otomatis, lihat bagian Deployment) setelah mengisi `.env` dengan nilai produksi.

## Deployment (Docker Compose)

### Manual

```bash
git clone <your-repo>
cd mini-konveksi-app
cp .env.example .env
# isi DATABASE_URL, BETTER_AUTH_SECRET, dll dengan nilai produksi
npm run deploy
```

Akses di **http://localhost:3000**. Kredensial database produksi (container `postgres`) menggunakan `konveksi_user`/`konveksi_password` dan dapat diubah di `docker-compose.yaml`.

### Otomatis via deploy.sh (Ubuntu Server)

```bash
# Dari dalam repo
sudo ./deploy.sh

# Atau clone script ke server lain
scp deploy.sh user@server:/tmp/
ssh user@server "sudo /tmp/deploy.sh"
```

Script akan:
1. Install dependensi (Docker, Nginx, Certbot) jika belum ada
2. Clone dari GitHub **atau** build dari file lokal
3. Generate `.env` secara interaktif (domain, secret, password)
4. Build & jalankan container (App + PostgreSQL + Nginx)
5. Setup SSL via Let's Encrypt (otomatis jika pakai domain)

## Dokumentasi

Dokumen desain & referensi tersedia di folder `documentation/`:

- `app_flow_document.md` — Alur aplikasi
- `app_flowchart.md` — Flowchart
- `backend_structure_document.md` — Struktur backend
- `frontend_guidelines_document.md` — Panduan frontend
- `project_requirements_document.md` — Requirement proyek
- `security_guideline_document.md` — Panduan keamanan
- `tech_stack_document.md` — Teknologi yang dipakai

Panduan menjalankan aplikasi: [Run-app.md](Run-app.md)

## Contributing

Kontribusi dipersilakan! Silakan submit Pull Request.
