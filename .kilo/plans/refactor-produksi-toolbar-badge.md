# Plan: Refactor Produksi Toolbar + Fix Badge Consistency

## Context
- File: `app/dashboard/produksi/page.tsx`
- Issues:
  1. Toolbar terlalu banyak tombol dalam 1 baris, tidak proporsional, tidak ada flex-wrap
  2. Tombol "Reset Data" (destructive) tercampur dengan aksi aman di toolbar
  3. Badge status di tabel memiliki tinggi/scale tidak konsisten

---

## Perubahan 1: Refactor Toolbar (`app/dashboard/produksi/page.tsx`)

### Saat ini (baris 170-194):
```tsx
<div className="flex gap-2">
  <Button variant="outline" size="sm">Refresh</Button>
  <Button variant="outline" size="sm">Sync Data</Button>
  {isSuperadmin && (
    <Button variant="destructive" size="sm">Reset Data</Button>
  )}
  <ExportPrint ... />
</div>
```

### Masalah:
- 4 tombol dalam 1 flex row tanpa wrap → overflow di layar kecil
- Tombol destruktif ("Reset Data") tercampur dengan aksi normal
- Tidak ada pemisah visual antara grup aksi

### Solusi:
1. Ubah container menjadi `flex flex-wrap items-center gap-2`
2. Pisahkan tombol menjadi 2 grup dengan separator visual (`<div className="h-6 w-px bg-border hidden sm:block" />`)
3. Grup kiri (aksi aman): Refresh, Sync Data, ExportPrint
4. Grup kanan (aksi berbahaya, hanya superadmin): Reset Data → dipindah ke dropdown "More" untuk mengurangi clutter
5. Atau alternatif: Reset Data diletakkan di baris terpisah dengan warning style yang lebih jelas

### Opsi yang disarankan:
- **Opsi A (Recommended)**: Reset Data dipindah ke dropdown menu "More actions" dengan icon `EllipsisVerticalIcon`
- **Opsi B**: Reset Data diletakkan di baris kedua dengan full-width danger outline style

---

## Perubahan 2: Konsistensi Badge (`app/dashboard/produksi/page.tsx` + `types/production.ts`)

### Saat ini:
- Badge base component: `h-5` fixed
- Status badges menggunakan `JOB_ORDER_STATUS_COLORS` tanpa height class eksplisit
- Beberapa badge di admin dashboard menambahkan `h-5` eksplisit + custom padding

### Masalah:
- Beberapa badge mungkin terlihat lebih tinggi karena border tambahan (misal `PENDING` punya `border-warning/30`)
- Tidak ada standar height untuk badge status

### Solusi:
1. Tambahkan `h-5` eksplisit ke semua className badge status di tabel produksi
2. Standarkan padding badge menjadi `px-2 py-0.5` (sesuai base badge)
3. Untuk badge dengan border tambahan (PENDING), gunakan `border` instead of `border-warning/30` agar tidak menambah visual weight
4. Tambahkan `items-center` eksplisit jika diperlukan

### File yang affected:
- `app/dashboard/produksi/page.tsx` line 310
- `app/dashboard/produksi/[joNumber]/page.tsx` line 428
- `app/dashboard/produksi/new/page.tsx` line 286-298, 560
- `types/production.ts` - konsolidasi color classes

---

## Perubahan 3: PageContainer Consistency

### Saat ini:
- `produksi/page.tsx` menggunakan `className="flex-1 space-y-4 p-4 md:p-6 pt-4"`
- Dashboard lain sudah menggunakan `.page-container`

### Solusi:
- Ganti menjadi `.page-container` agar konsisten dengan dashboard lain

---

## Dampak Perubahan

### Visual:
- Toolbar menjadi lebih rapi, tidak overflow di mobile
- Tombol destruktif lebih jelas secara visual dan tidak tercampur
- Badge status memiliki tinggi yang konsisten

### Functional:
- Tidak ada perubahan logic
- Reset Data tetap hanya untuk superadmin
- Filter tetap berfungsi sama

### Risk:
- Rendering perubahan UI saja
- Tidak ada perubahan data/API

---

## Files to Modify
1. `app/dashboard/produksi/page.tsx` - toolbar refactor + badge consistency + page-container
2. `types/production.ts` - konsolidasi status colors (opsional, untuk konsistensi)
3. `app/dashboard/produksi/[joNumber]/page.tsx` - badge consistency (jika diperlukan)
4. `app/dashboard/produksi/new/page.tsx` - badge consistency (jika diperlukan)

---

## Pertanyaan untuk User
1. Untuk tombol Reset Data, preferensi Anda: **dropdown "More actions"** atau **baris terpisah**?
2. Apakah badge inconsistency yang Anda maksud adalah di halaman **produksi** saja, atau juga di **halaman lain** (admin, karyawan, qc, gudang)?
3. Apakah Anda ingin badge status memiliki **height yang sama** (misal `h-6` untuk lebih mudah dibaca) atau tetap `h-5`?
