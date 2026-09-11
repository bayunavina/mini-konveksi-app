# Frontend Guideline Document — ERP Konveksi

Dokumen ini menjelaskan struktur, styling, dan praktik pengembangan frontend **ERP Konveksi**. Siapa pun — teknis maupun non-teknis — dapat membaca untuk memahami tool yang dipakai, bagaimana komponen disusun, dan praktik yang menjaga aplikasi tetap cepat, andal, dan mudah dirawat.

---

## 1. Arsitektur Frontend

**Framework & Library inti**
- **Next.js 15 (App Router + Turbopack)** — routing file-based, SSR, build produksi (`output: 'standalone'`).
- **React 18** — membangun UI berbasis komponen.
- **TypeScript 5** — tipe statis, strict mode.
- **Tailwind CSS v4** — utility-first styling.
- **shadcn/ui + Radix UI** — set komponen UI modern (dialog, dropdown, table, sheet, dll).
- **TanStack Query** — server state / data fetching + cache.
- **React Table (`@tanstack/react-table`)** — tabel data yang kuat & custom.

**Organisasi**
```
app/                      # App Router (src-less)
├── page.tsx              # Landing page
├── layout.tsx            # Root layout
├── sign-in/  sign-up/    # Autentikasi
├── dashboard/            # Area terproteksi (per role)
│   ├── admin/            # Admin/Superadmin
│   ├── gudang/           # Petugas gudang
│   ├── qc/               # QC staff
│   ├── karyawan/         # Karyawan produksi
│   ├── produksi/ inventory/ transfer/ finance/ ...
│   └── qr-generator/ scan/ settings/ ...
├── api/                  # Backend API routes (satu proyek)
components/
├── ui/                   # shadcn/ui primitives
├── layout/  shared/  icons/  providers/
├── qr-generator/  scanner/
hooks/                    # Custom hooks (useCurrency, useSKUMaster, dll)
lib/                      # Utility: auth, rbac, firebase, currency, dll
types/                    # Shared types
```

**Kenapa arsitektur ini bekerja**
- **Scalability**: fitur baru cukup menambah folder baru di `app/` — tanpa router terpusat.
- **Maintainability**: kode per fitur (API + halaman) berada dekat satu sama lain.
- **Performance**: SSR/pre-render + code splitting otomatis oleh Next.js.

---

## 2. Design Principles

1. **Usability**: form beri umpan balik instan; tombol/label jelas (bahasa Indonesia).
2. **Accessibility**: semantic HTML, kontras warna cukup, focus outlines.
3. **Responsiveness**: mobile-first (dashboard bisa diakses dari HP, termasuk kamera QR scanner).
4. **Consistency**: komponen shadcn/ui + theme konsisten + dark mode.
5. **Role-aware UI**: konten & menu disesuaikan dengan peran pengguna.

---

## 3. Styling & Theming

- **Tailwind CSS v4** — utility classes di seluruh komponen.
- **shadcn/ui tokens** — warna global (CSS variables) di `app/globals.css`; mendukung **dark mode** via `next-themes`.
- **Palet** — berbasis brand (`brand-primary`, `destructive`, `accent`, dsb.) sesuai konfigurasi shadcn.
- **Ikon**: Lucide React, Tabler, Heroicons, HugeIcons.
- **Font**: default sistem + Inter di mana tersedia.

Contoh komponen theme (shadcn-style):
```css
:root {
  --brand-primary: ...;
  --background: oklch(...);
  --foreground: oklch(...);
}
```

---

## 4. Struktur Komponen

- **Reusable UI primitives** di `components/ui/` (button, input, card, dialog, table, dsb).
- **Komponen fitur** di `components/` (data-table, role-guard, nav-user, chart, theme-provider).
- **Modul spesifik**:
  - `qr-generator/` dan `scanner/` — QR/barcode generate & scan.
  - `providers/` — kumpulan React Provider (QueryClient, Theme, Auth).
  - `icons/` — komponen wrapper ikon.
- **Encapsulation**: komponen mandiri (menerima props, tidak menyentuh DOM global).
- **Reusability**: fix bug sekali → berlaku di semua tempat pemakaian.

---

## 5. State Management

- **Server State**: **TanStack Query** untuk data dari API (`useQuery`, `useMutation`) + invalidasi cache setelah mutasi.
- **Local State**: `useState`/`useReducer` untuk UI ephemeral (form, loading, error).
- **Shared Context**: provider auth/providers di `app/providers/` (next-themes, QueryClient).
- **Stored data**: cookies sesi (Better Auth) — tidak disimpan di localStorage kecuali non-sensitif.

---

## 6. Routing & Navigation

- **Next.js App Router**: setiap folder di `app/` = route.
- **Layout**:
  - `app/layout.tsx` — global (theme provider, font, metadata).
  - `app/dashboard/layout.tsx` — sidebar + header + role navigation.
- **Proteksi**: `middleware.ts` (sesi + RBAC) + `components/role-guard.tsx` (guard tambahan per komponen).
- **Redirect**: akses tanpa izin → redirect ke dashboard role; tanpa sesi → `/sign-in`.
- **Maintenance mode**: page `app/maintenance/page.tsx` (router.ts menjaga).

---

## 7. Performance Optimization

1. **SSR + ISR/static**: halaman yang memungkinkan di-render server; data mutasi lewat API route.
2. **TanStack Query**: cache & deduplicate request; `staleTime` agar tidak refetch berlebihan.
3. **Code splitting**: Next.js split per route; gunakan `next/dynamic` untuk komponen besar (chart, QR, PDF).
4. **Image optimization**: `<Image>` Next.js untuk aset di `public/`.
5. **Build speed**: Turbopack + `output: 'standalone'` + Docker multi-stage.
6. **Bundle**: hanya import yang dipakai (tree-shaking Tailwind/Lucide); `next lint` menjaga.

---

## 8. Testing & Quality Assurance

- **Linting**: ESLint (`eslint-config-next`) via `npm run lint`.
- **Type check**: `tsc` (TypeScript strict) pada build.
- **Unit/E2E (direncanakan)**: TestSprite/Playwright untuk alur login, produksi, transfer, QC.
- **QA manual**: akun default seed (superadmin, karyawan, QC, gudang) untuk uji per-role.

---

## 9. Aksesibilitas Peran (Role-Guard)

- **RoleGuard** (`components/role-guard.tsx`) membungkus konten agar hanya ditampilkan untuk role tertentu.
- Menu navigasi dashboard disesuaikan dengan `${role}` (admin, gudang, qc, karyawan) di `dashboard/layout.tsx`.
- Checklist sangat berguna pada modul produksi (hanya admin/SUPERADMIN) vs transfer (admin + gudang).

---

## 10. Kesimpulan

Frontend **ERP Konveksi** dibangun di atas **Next.js 15** (App Router + Turbopack), **TypeScript**, **Tailwind CSS v4** + **shadcn/ui**, dan **TanStack Query** — menghasilkan UI ERP yang modern, responsif (mobile-first untuk scan QR), role-aware, dan mudah diperluas per modul bisnis. Praktik SSR, caching query, dan code splitting menjaga performa, sementara RBAC (middleware + RoleGuard) menjaga keamanan akses per pengguna.