# Security Guidelines — ERP Konveksi (Mini Konveksi App)

Dokumen ini mendefinisikan prinsip keamanan wajib dan praktik implementasi terbaik untuk repositori **ERP Konveksi**. Mengikuti prinsip **Security-by-Design**, **Least Privilege**, dan **Defense-in-Depth**. Setiap bagian merujuk area spesifik codebase (`.env`, `middleware.ts`, `lib/rbac.ts`, `lib/constants.ts`, `Dockerfile`, `docker-compose.yaml`, `deploy.sh`) agar panduannya praktis.

---

## 1. Security by Design

- Tanamkan keamanan sejak awal — tinjau threat model setiap menambah fitur baru (API route baru, data fetching).
- Terapkan “secure defaults” di konfigurasi: TypeScript strict, `output: 'standalone'`, non-root Docker user.
- Tambahkan security checklist di PR: pastikan setiap perubahan direview terhadap dokumen ini.

---

## 2. Autentikasi & Access Control

### 2.1 Autentikasi
- Gunakan **Better Auth** (sesi) untuk semua halaman terproteksi; endpoints di `app/api/auth/*`.
- Karyawan dapat login via **PIN** (`/api/auth/pin-login`). PIN wajib didaftarkan per karyawan (`employees.pin`) dan tidak pernah disimpan sebagai plaintext bila memungkinkan — gunakan hash.
- Password di-hash dengan **bcrypt** sebelum disimpan (tabel `account.password`).

### 2.2 Session Management
- Cookie sesi diatur **Secure, HttpOnly, SameSite** oleh Better Auth.
- `BETTER_AUTH_SECRET` wajib kuat (di-generate acak oleh `deploy.sh`, 32+ karakter).
- `BETTER_AUTH_TRUSTED_ORIGINS` menentukan origin yang diizinkan — di production berisi domain HTTPS.

### 2.3 Role-Based Access Control (RBAC)
- **Halaman**: `middleware.ts` memeriksa sesi lalu `canAccess(pathname, role)` (`lib/rbac.ts`). Role tidak diizinkan → redirect ke dashboard role.
- **API**: `lib/constants.ts` mendefinisikan `PERMISSION` granular; `requirePermission()` / `requireAnyPermission()` menolak (`403`) request yang tidak diotorisasi.
- **Least Privilege**: `ROLE_PERMISSIONS` minimal — `GUDANG` hanya punya akses transfer/inventory; `QC` dan `KARYAWAN` tidak punya permission transfer tanpa ada kebutuhan.
- Setiap route API baru WAJIB dicek permission — jangan mengandalkan validasi frontend saja.

---

## 3. Input Handling & Processing

### 3.1 Validasi Semua Input
- **Client**: validasi format (email, nomor, qty) sebelum submit.
- **Server**: re-validasi semua input API dengan skema (**zod**) — jangan percaya payload client.
- Tolak field tak terduga untuk mencegah parameter/object injection.

### 3.2 Cegah Injection
- Selalu gunakan **Drizzle ORM** (parameterized query) — jangan string concatenation SQL.
- Hindari `eval()` atau template rendering dengan input yang belum disanitasi.
- Data upload (transfer photos) dibatasi: max 10 file, max 5MB per file (`MAX_PHOTO_UPLOAD`, `MAX_PHOTO_SIZE_MB`).

### 3.3 Safe Redirect
- Saat redirect setelah login, gunakan `callbackUrl` dari query — validasi agar tidak open redirect ke domain asing.

---

## 4. Data Protection & Privacy

### 4.1 Encryption & Secrets
- **HTTPS/TLS 1.2+** di production (Nginx + Let's Encrypt via `deploy.sh`).
- **Jangan pernah commit secrets**. `.env`, `.env.*`, `*.pem`, kunci Firebase, dsb. di-exclude:
  - `.gitignore` (repositori).
  - `.dockerignore` (`app/.env*`, `*.pem`, `drizzle/`, `.next/`, `node_modules/`) sehingga tidak masuk image.
- `deploy.sh` menulis `.env` dan melakukan `chmod 600` — hanya pemilik yang bisa baca.

### 4.2 Data Sensitif
- Jangan log password, token sesi, atau PII dalam bentuk mentah (log server/terminal).
- Mask/redact identitas pengguna bila diperlukan di log.
- Data keuangan (`transactions`, `advances`, `salaries`) hanya bisa diakses role admin via RBAC.

---

## 5. API & Service Security

### 5.1 HTTPS Enforcement
- Di production: Nginx redirect HTTP → HTTPS (config SSL di `deploy.sh`).
- `BETTER_AUTH_URL` dan trusted origins harus HTTPS saat production (bukan HTTP).

### 5.2 CORS / Origin
- `BETTER_AUTH_TRUSTED_ORIGINS` membatasi origin valid (dari `.env`).
- Jangan menambah wildcard origin di lingkungan production.

### 5.3 Minimal Exposure
- Endpoint internal (`debug-session`, `debug-session2`, `setup-admin`) hanya untuk environment yang tepat; batasi akses (mis. `NODE_ENV=production` menonaktifkan path dev).
- Return hanya field yang diperlukan; jangan bocorkan internal path/stack trace sebagai JSON error.
- Endpoint `factory-reset` / `backup` / `seed` harus dilindungi (role SUPERADMIN) dan tidak tersedia publik.

---

## 6. Web Application Security Hygiene

### 6.1 CSRF
- Better Auth mengelola CSRF untuk endpoint auth via origin/cookie checks; pastikan `trustedOrigins` dibatasi.
- Untuk mutasi API lain, jaga metode + header (fetch with credentials) serta cookie `SameSite`.

### 6.2 Security Headers
- Nginx config production menetapkan:
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `X-Forwarded-Proto: https` untuk aplikasi di belakang proxy.

### 6.3 Secure Cookies
- Sesi cookie `Secure`, `HttpOnly`, `SameSite` (diatur Better Auth + Nginx HTTPS).
- Hindari simpan token/auth di `localStorage`; prefer cookie.

### 6.4 Cegah XSS
- React/Tailwind meng-escape output secara default; hindari `dangerouslySetInnerHTML` kecuali konten sudah disanitasi.
- Jangan render user content mentah (mis. notes/reason) sebagai HTML.

---

## 7. Infrastructure & Configuration Management

- **Docker `node:20-alpine`**: image dijalankan sebagai user non-root `nextjs` (lihat `Dockerfile`) — jangan jalankan sebagai root.
- **`.dockerignore`**: exclude `node_modules`, `.next`, `.env*`, `drizzle/`, `*.pem`, Dockerfile, compose → image lebih kecil & tanpa secret.
- **Compose**: kredensial postgres default (`konveksi_password`) di `docker-compose.yaml` hanya untuk dev — produksi memakai password acak hasil `deploy.sh` (`POSTGRES_PASSWORD` + `DATABASE_URL`).
- **Port**: hanya expose yang diperlukan — `app:3000`, `postgres:5432` (internal network), `nginx:80/443` ke publik.
- Rotasi `BETTER_AUTH_SECRET`, `SMTP_PASS`, dan kredensial DB secara berkala.
- **Maintenance mode**: cookie `maintenance=true` mengarahkan non-admin ke halaman maintenance; halaman settings admin tetap bisa diakses (di `middleware.ts`).

---

## 8. Dependency Management

- Commit & jaga `package-lock.json` untuk build yang reproduktif.
- Pantau vulnerability (`npm audit`) dan dependency bump rutin.
- Kurangi paket yang tidak terpakai — setiap library menambah attack surface.

---

## 9. Deployment Security (deploy.sh)

- `deploy.sh` membutuhkan **root (sudo)** — pastikan hanya operator terpercaya.
- Meng-*install*: Docker, Nginx, Certbot. Update sistem (`apt-get update`) sebelum install.
- Generate `.env` interaktif: `BETTER_AUTH_SECRET` & DB password acak, `chmod 600`.
- SSL Let's Encrypt: non-interactive, domain valid, auto-renew cron (pre/post-hook stop/start nginx).
- Nginx config: hanya mendengarkan 80/443, proxy ke `mini-konveksi-app:<port>` di jaringan Docker internal.
- Jangan jalankan `./deploy.sh` berulang tanpa review — ia menimpa `.env` (akan generate secret baru) kecuali sudah dipahami dampaknya.

---

## 10. Kesimpulan

Keamanan **ERP Konveksi** dibangun dengan **defense-in-depth**: Better Auth (sesi) + RBAC halaman & API dengan permission granular, validasi input (zod) + ORM typed, HTTPS via Nginx + Let's Encrypt, secrets hanya di `.env` (excluded dari git & Docker), container non-root, dan deployment yang aman via `deploy.sh`. Tinjau dokumen ini berkala terhadap threat terbaru dan selalu perbarui dependensi serta nilai-nilai default production.