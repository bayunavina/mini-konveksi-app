# Plan: Tambah Trend Chart Card Bahan Baku yang Sering Diproduksi

## Tujuan
Menambahkan kartu grafik tren untuk bahan baku yang paling sering diproduksi, diletakkan di bawah kartu "Raw Material" yang sudah ada di halaman `/dashboard/admin`.

## Analisis Kode
- Halaman admin menggunakan komponen `AdminDashboard` dari `app/dashboard/admin-dashboard.tsx`
- Grafik-grafik ada di `app/dashboard/admin-dashboard-charts.tsx`
- Data material ada di tabel `productionFromMaterials` (melacak produksi dari lot bahan baku) yang terhubung ke `materialLots` dan `master_skus`
- API material lots ada di `/api/material-lots` tapi tidak menyertakan data produksi
- `admin-dashboard.tsx` baris 524-530 memuat `<RawMaterialBarChart />`

## Langkah Implementasi

### 1. Buat API Endpoint Baru
**File:** `app/api/production/from-materials/route.ts`
- Query `productionFromMaterials` join `materialLots` join `master_skus`
- Kelompokkan data per bulan dan per bahan baku (skuCode/skuName)
- Identifikasi top 5 bahan baku yang paling sering diproduksi (berdasarkan total producedQty atau jumlah event produksi)
- Filter berdasarkan tahun (query param `year`)
- Return format:
  ```json
  {
    "topMaterials": ["BB-001", "BB-002", ...],
    "data": [
      { "month": "Jan", "BB-001": 120, "BB-002": 80, ... },
      ...
    ]
  }
  ```

### 2. Buat Hook Baru
**File:** `app/dashboard/admin-dashboard-charts.tsx`
- Tambah interface `TopProducedMaterialsData`
- Buat hook `useTopProducedMaterialsData(year: number)` yang:
  - Fetch dari `/api/production/from-materials?year=...`
  - Transformasi data menjadi format chart yang sesuai
  - Return `{ data, topMaterials, loading }`

### 3. Buat Komponen Chart Baru
**File:** `app/dashboard/admin-dashboard-charts.tsx`
- Tambah komponen `TopProducedMaterialsChart` dengan props:
  - `data`: array data bulanan
  - `topMaterials`: array string kode bahan baku
  - `year`: number
  - `onYearChange`: (year: number) => void
- Gunakan `LineChart` atau `BarChart` dari recharts untuk menampilkan tren
- Setiap bahan baku dapat garis/warna berbeda
- Include year selector seperti chart lain
- Styling mengikuti pola yang sudah ada (Card, CardHeader, CardContent, ChartContainer)

### 4. Integrasi ke Admin Dashboard
**File:** `app/dashboard/admin-dashboard.tsx`
- Import `TopProducedMaterialsChart` dan `useTopProducedMaterialsData`
- Tambah state `topMaterialsYear`
- Panggil hook `useTopProducedMaterialsData(topMaterialsYear)`
- Letakkan `<TopProducedMaterialsChart />` tepat di bawah `<RawMaterialBarChart />` (setelah baris 530)

## Catatan
- Gunakan color palette yang konsisten dengan chart lain (`var(--chart-1)` sampai `var(--chart-5)`)
- Fallback ke mock data jika fetch gagal, mengikuti pola chart lain
- Pastikan type safety menggunakan TypeScript interface
