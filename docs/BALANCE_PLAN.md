# Plan Eksekusi: Balance Qty + Barcode + Report — HARI 1 SELESAI ✅

> Build: **PASSED** (`next build --turbopack` ✓ 11.5s)
> Semua blok selesai dalam 1 hari. Hari 2: testing & investigasi.

## Status Ringkas

| BLOK | Task | File(s) | Status |
|------|------|---------|--------|
| **A1** | Fix QC rounding drift (largest remainder) | `app/api/qc-reports/route.ts:92-128` | ✅ done — assignment terakhir dapat remainder, Σ == total |
| **A2** | Fix reject sign convention | `app/api/qc-reports/route.ts:307-315` | ✅ done — movement `REJECT` kini `+qty` konsisten dengan stock |
| **A3** | Fix warehouse name lookup fallback | `app/api/qc-reports/route.ts:187-203,265-281` | ✅ done — fallback ke warehouse pertama jika nama tidak ditemukan |
| **A4** | Fix rejects/[id] overwrite | `app/api/rejects/[id]/route.ts:3,63-103` | ✅ done — `rejectedQty +=` (bukan overwrite), tulis ke `inventoryStock` + `inventoryMovements` |
| **A5** | Fix transfer partial completion | `app/api/transfers/[id]/route.ts:59-150` | ✅ done — gagal → status `IN_PROGRESS`, return `failedItems` |
| **B1** | lib/qr-payload.ts | `lib/qr-payload.ts` (baru) | ✅ done — format JSON konsisten untuk 4 entity + parser regex fallback |
| **B2** | qrCode field employees & jobOrders + migration | `db/schema/app.ts:154,165`, `drizzle/0006_add_qrcode_to_employees_joborders.sql` | ✅ done — butuh `npm run db:push` |
| **C1** | /api/balance/material-lots | `app/api/balance/material-lots/route.ts` (baru) | ✅ done |
| **C2** | /api/balance/production | `app/api/balance/production/route.ts` (baru) | ✅ done |
| **C3** | /api/balance/stock | `app/api/balance/stock/route.ts` (baru) | ✅ done |
| **C4** | /api/balance/summary | `app/api/balance/summary/route.ts` (baru) | ✅ done |
| **D1** | /dashboard/balance/page.tsx | `app/dashboard/balance/page.tsx` (baru, 10.8kB) | ✅ done — 4 tabs: Material, Produksi, Stok, Deviasi + ExportPrint |
| **E1** | ScanButton produksi/new | `app/dashboard/produksi/new/page.tsx` | ✅ done — scan lot QR + employee badge |
| **E2** | ScanButton inventory/products & transfer/outgoing | `app/dashboard/inventory/products/page.tsx`, `app/dashboard/transfer/outgoing/page.tsx` | ✅ done — scan SKU |
| **E3** | qr-generator DB-driven | `app/dashboard/qr-generator/page.tsx` | ✅ done — pilih dari DB real, format konsisten via B1 |
| **F** | Navigation | `components/layout/konveksi-sidebar.tsx`, `components/layout/dashboard-header.tsx` | ✅ done — Balance Report di sidebar ADMIN + command palette |
| **V** | build & typecheck | `npm run build` | ✅ passed |

---

## Cara Melanjutkan Jika Terhenti

Jika progres terhenti, buka `TodoWrite` atau file ini, cari task dengan ⏳ pending. Saat ini semua ✅.

## Langkah Hari 2 — Testing & Investigasi

### 0. Apply Migration (wajib sebelum testing dengan DB)
```bash
npm run db:up          # start postgres jika belum
npm run db:push        # apply 0006_add_qrcode...
# atau
npx drizzle-kit push
```

### 1. Testing Regresi (manual)
| Test | Langkah | Expected |
|------|---------|----------|
| QC rounding | Buat JO dengan 2 assignment (target 60:40), QC success 7 reject 3 | Σ allocated success=7, reject=3 (assignment terakhir 3+1, bukan 4+2) |
| Reject sign | QC dengan rejectQty 5 | `inventoryStock` Gudang Reject +5, `inventoryMovements` type REJECT qty +5 |
| Warehouse fallback | Rename Gudang Bahan Jadi → QC success tetap masuk (fallback warehouse) | Tidak silent skip |
| Reject approve | Approve reject quantity 10 | `jobOrders.rejectedQty +=10` (bukan overwrite), `inventoryStock` +10 |
| Transfer partial | Transfer 2 items, source stock cukup untuk 1 saja | status → IN_PROGRESS, response `failedItems` berisi item gagal |
| Balance API | GET /api/balance/summary, /material-lots, /production, /stock | Tidak error, summary sesuai data |
| Balance UI | Buka /dashboard/balance, cek 4 tabs, search, Export CSV/Print | Tabel rapi, selisih merah jika deviasi |
| Scan lot | Di produksi/new klik Scan Lot → scan QR `BB-...` atau `MAT-...` | Auto-select lot + toast |
| Scan employee | Di produksi/new klik Scan → scan badge EMP-... | Auto-select karyawan |
| Scan SKU | Di inventory/products → Scan → scan SKU Code128 | Auto-select SKU |
| QR Generator | Pilih MATERIAL_LOT → lot real → Generate QR → scan di produksi/new | Format JSON konsisten `{"type":"MATERIAL_LOT","id":...}` |

### 2. Investigasi Data Lama
- Buka `/dashboard/balance` → cek tab Deviasi. Jika ada deviasi tinggi, kemungkinan data historis sudah corrupt dari bug lama (rounding, sign terbalik).
- Untuk data lama yang corrupt, perlu script backfill:
  ```sql
  -- Contoh: recompute stock dari movements lalu bandingkan
  SELECT product_id, warehouse_id, quantity as system, SUM(quantity) as computed
  FROM inventory_movements GROUP BY product_id, warehouse_id
  ```
- Dokumentasikan deviasi yang ditemukan, tentukan apakah perlu manual adjustment via `POST /api/inventory/stock` type ADJUSTMENT (sudah ada tapi belum UI).

### 3. Catatan Risiko
- Data historis tidak otomatis diperbaiki oleh fix ini — hanya bug ke depan yang dicegah. Balance report akan menampilkan deviasi lama sebagai “DEVIATED”.
- `reservedQty` masih dead field — belum dipakai untuk reservasi transfer.
- `inventory` legacy table masih ada tapi tidak dipakai lagi oleh reject approve (sudah fix).

---

## File yang Diubah / Dibuat (Hari 1)

**Fix (A):**
- `app/api/qc-reports/route.ts`
- `app/api/rejects/[id]/route.ts`
- `app/api/transfers/[id]/route.ts`

**Schema & QR (B):**
- `db/schema/app.ts`
- `drizzle/0006_add_qrcode_to_employees_joborders.sql`
- `lib/qr-payload.ts` (baru)
- `app/api/employees/route.ts`
- `app/api/job-orders/route.ts`

**Balance API (C):**
- `app/api/balance/material-lots/route.ts` (baru)
- `app/api/balance/production/route.ts` (baru)
- `app/api/balance/stock/route.ts` (baru)
- `app/api/balance/summary/route.ts` (baru)

**Balance UI (D):**
- `app/dashboard/balance/page.tsx` (baru)

**Barcode (E):**
- `app/dashboard/produksi/new/page.tsx`
- `app/dashboard/inventory/products/page.tsx`
- `app/dashboard/transfer/outgoing/page.tsx`
- `app/dashboard/qr-generator/page.tsx`

**Navigation (F):**
- `components/layout/konveksi-sidebar.tsx`
- `components/layout/dashboard-header.tsx`

**Build:**
- `npm run build` → ✅ passed (11.5s)

---
*Generated: 2026-09-02 | Estimasi Hari 2: testing + investigasi data lama*
