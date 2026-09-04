# Panduan UI: Ukuran Komponen (Button / Select / Input)

> Berlaku di seluruh `app/` dan `components/`. Verifikasi dipaksa otomatis oleh
> rule ESLint lokal `local/ui-no-manual-size` (lihat bawah).

## Varieant resmi — jangan override via `className`

| Component | Prop `size` | Ukuran (tinggi) |
|---|---|---|
| `Button` | (default) | 28px (`h-7`) |
| `Button` | `xs` | 20px (`h-5`) |
| `Button` | `sm` | 24px (`h-6`) |
| `Button` | `lg` | 32px (`h-8`) |
| `Button` | `icon` | 28px × 28px (`size-7`) |
| `Button` | `icon-xs` | 20px × 20px (`size-5`) |
| `Button` | `icon-sm` | 24px × 24px (`size-6`) |
| `Button` | `icon-lg` | 32px × 32px (`size-8`) |
| `SelectTrigger` | (default) | 28px (`h-7`) |
| `SelectTrigger` | `sm` | 24px (`h-6`) |
| `Input` | — | selalu 28px (`h-7`) |

## Aturan

1. **Gunakan prop `size`, jangan tulis tinggi/padding manual.**
   ❌ `<Button size="sm" className="h-10">Refresh</Button>`
   ✅ `<Button size="lg">Refresh</Button>`
   ❌ `<Button size="icon" className="h-8 w-8"><Trash/></Button>`
   ✅ `<Button size="icon-lg"><Trash/></Button>`

2. **Jangan tulis `data-[size=default]:h-*` / langsung `h-*` pada `SelectTrigger`.**
   ❌ `<SelectTrigger className="data-[size=default]:h-10 w-[200px]">`
   ✅ `<SelectTrigger className="w-[200px]">`

3. **Jangan override `Input` dengan `h-*`** — tinggi default 28px; atur `py/px`/teks bila perlu.

4. **Padding ikut dihapus saat memakai `size`.**
   Saat mengganti ke varian resmi, hapus juga `px-*`, `py-*`, `min-h-[*]`, `min-w-[*]`,
   `w-<angka>` / `size-*` yang berebut dengan tinggi. Lebar saja boleh distel
   (`w-full`, `w-[140px]`, `sm:w-auto`).

5. **Target sentuh 44px** tidak dikonversi manual ke button tinggi — pakai
   class util `.touch-target` (sudah ada di `app/globals.css`) untuk mem-perluas
   area klik tanpa mengubah ukuran visual button.

## Pengecualian yang sah (tetap boleh bar `className` ukuran)

- **Tile 2-baris** (ikon di atas label), mis. kartu "Klaim Gaji / Ajukan Kasbon"
  di dashboard — `h-auto py-3 sm:py-4 min-h-[48px] flex flex-col`.
- **Text-link seperti button**, mis. "Tandai semua dibaca" di header notifikasi
  (`h-auto p-0 text-xs`).
- **Komponen primitives di `components/ui/*`** — tempat mendefinisikan varian;
  rule lint tidak berlaku di sana.

## Rule ESLint + CI

- Rule lokal: `eslint-local/rules/ui-no-manual-size.js`, terdaftar di
  `eslint.config.mjs` sebagai `local/ui-no-manual-size` (level `warn`).
  Menandai class `h-*`, `min-h-*`, `py-*`, `size-*`, `data-[size=*]:h-*` pada
  `Button` / `SelectTrigger` / `Input` di `app/**` dan `components/**`.

- Alternatif tanpa ESLint (grep di CI):
  ```bash
  rg -n '<Button[^>]*className="[^"]*\b(h-|min-h-|size-|py-)\b' app components
  rg -n '<SelectTrigger[^>]*className="[^"]*\b(h-|data-\[size=)' app components
  ```

## Catatan migrasi tema (Sept 2026)

Aturan global `button/… { min-height:44px; min-width:44px }` di `app/globals.css`
telah dihapus karena membuat semua varian `size` tampil ≥44px. Konsekuensi:
button kini benar-benar selebar sesuai varian `size`. Cek halaman dengan tombol
kecil (toolbar, chip) setelah deploy; beri `.touch-target` bila perlu.