import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { suppliers, costCategories, masterSkus } from "@/db/schema"
import { eq } from "drizzle-orm"

const SEED_SUPPLIERS = [
  { code: "SUP-001", name: "PT. Sandang Jaya Textile", contactPerson: "Budi Hartono", phone: "021-87654321", address: "Jl. Industri Textile No.88, Bandung, Jawa Barat" },
  { code: "SUP-002", name: "CV. Sumber Kain Abadi", contactPerson: "Siti Aminah", phone: "022-45678901", address: "Jl. Soekarno Hatta No.120, Bandung" },
  { code: "SUP-003", name: "PT. Karya Sandang Mulia", contactPerson: "Ahmad Fauzi", phone: "021-34567890", address: "Jl. Raya Bogor KM 24, Jakarta Timur" },
  { code: "SUP-004", name: "UD. Berkah Kain Grosir", contactPerson: "Dewi Lestari", phone: "0274-5551234", address: "Jl. Malioboro No.45, Yogyakarta" },
  { code: "SUP-005", name: "CV. Mitra Konveksi Supply", contactPerson: "Joko Widodo", phone: "031-87651234", address: "Jl. Rungkut Industri No.10, Surabaya" },
  { code: "SUP-006", name: "PT. Indo Textile Prima", contactPerson: "Rina Marlina", phone: "021-99887766", address: "Jl. Daan Mogot No.99, Jakarta Barat" },
  { code: "SUP-007", name: "Toko Kain Murah Barokah", contactPerson: "Slamet Riyadi", phone: "0271-334455", address: "Jl. Slamet Riyadi No.200, Solo" },
  { code: "SUP-008", name: "CV. Aksesoris Konveksi Lengkap", contactPerson: "Fitri Handayani", phone: "022-77889900", address: "Jl. Cihampelas No.15, Bandung" },
]

const SEED_COST_CATEGORIES = [
  { code: "BBL", name: "Bahan Baku Kain", type: "DIRECT", description: "Kain utama, kain keras, rib - termasuk ongkir beli bahan" },
  { code: "ACC", name: "Aksesoris Langsung", type: "DIRECT", description: "Benang, kancing, resleting, karet, busa, label woven" },
  { code: "TKL", name: "Upah Jahit Borongan", type: "DIRECT", description: "Upah jahit per pcs / borongan (60% HPP) - tim 20+ penjahit" },
  { code: "TKL-P", name: "Upah Potong", type: "DIRECT", description: "Upah potong kain harian / borongan" },
  { code: "OVP", name: "Ongkos Vendor Jahit (CMT)", type: "DIRECT", description: "Maklon / CMT vendor luar saat overload 30 orang" },
  { code: "PKG", name: "Packaging & Label", type: "DIRECT", description: "Plastik OPP, hangtag, label harga, dus packing" },
  { code: "GTL", name: "Gaji Tidak Langsung", type: "INDIRECT", description: "Gaji mandor, admin produksi, QC leader (3 org) - tetap bulanan" },
  { code: "LST", name: "Listrik & Air", type: "INDIRECT", description: "Utilitas listrik, air, genset, kompresor bulanan" },
  { code: "SEWA", name: "Sewa Tempat", type: "INDIRECT", description: "Sewa gudang, workshop & toko / cicilan ruko" },
  { code: "MTC", name: "Service & Penyusutan Mesin", type: "INDIRECT", description: "Service mesin jahit, obras, cutting + penyusutan 15-20 mesin" },
  { code: "BPJS", name: "BPJS, THR & Tunjangan", type: "INDIRECT", description: "BPJS Ketenagakerjaan, THR, tunjangan harian 30 karyawan" },
  { code: "KON", name: "Konsumsi & Mess", type: "INDIRECT", description: "Makan siang, air galon, gas, mess karyawan" },
  { code: "ADM", name: "Administrasi Umum", type: "INDIRECT", description: "ATK, internet, operasional kantor, pajak UMKM" },
  { code: "MKT", name: "Marketing & Kirim Jual", type: "INDIRECT", description: "Foto produk, iklan, fee marketplace, ongkir kirim barang jadi" },
]

const SEED_SKUS = [
  { code: "SKU-KMJ-001", name: "Kemeja PDL Navy Size S", category: "Kemeja", price: "185000", unit: "Pcs" },
  { code: "SKU-KMJ-002", name: "Kemeja PDL Navy Size M", category: "Kemeja", price: "185000", unit: "Pcs" },
  { code: "SKU-KMJ-003", name: "Kemeja PDL Navy Size L", category: "Kemeja", price: "195000", unit: "Pcs" },
  { code: "SKU-KMJ-004", name: "Kemeja PDL Navy Size XL", category: "Kemeja", price: "205000", unit: "Pcs" },
  { code: "SKU-CLN-001", name: "Celana PDL Hitam Size M", category: "Celana", price: "165000", unit: "Pcs" },
  { code: "SKU-CLN-002", name: "Celana PDL Hitam Size L", category: "Celana", price: "175000", unit: "Pcs" },
  { code: "SKU-KAO-001", name: "Kaos Polo Cotton Navy", category: "Kaos", price: "95000", unit: "Pcs" },
  { code: "SKU-KAO-002", name: "Kaos Oblong Hitam Premium", category: "Kaos", price: "75000", unit: "Pcs" },
  { code: "SKU-JKT-001", name: "Jaket Hoodie Marine", category: "Jaket", price: "285000", unit: "Pcs" },
  { code: "SKU-JKT-002", name: "Jaket Bomber Hitam", category: "Jaket", price: "320000", unit: "Pcs" },
  { code: "SKU-SRG-001", name: "Seragam PDH Khaki Lengan Panjang", category: "Seragam", price: "225000", unit: "Pcs" },
  { code: "SKU-SRG-002", name: "Seragam PDL Loreng Malvinas", category: "Seragam", price: "245000", unit: "Pcs" },
]

// POST: Seed all master data (bulk insert, skip existing)
export async function POST() {
  try {
    let suppliersCreated = 0
    let suppliersSkipped = 0
    let costCategoriesCreated = 0
    let costCategoriesSkipped = 0
    let skusCreated = 0
    let skusSkipped = 0

    // Seed Suppliers
    for (const s of SEED_SUPPLIERS) {
      try {
        const existing = await db.select({ id: suppliers.id }).from(suppliers).where(eq(suppliers.code, s.code)).limit(1)
        if (existing.length > 0) {
          suppliersSkipped++
        } else {
          await db.insert(suppliers).values(s)
          suppliersCreated++
        }
      } catch {
        suppliersSkipped++
      }
    }

    // Seed Cost Categories
    for (const c of SEED_COST_CATEGORIES) {
      try {
        const existing = await db.select({ id: costCategories.id }).from(costCategories).where(eq(costCategories.code, c.code)).limit(1)
        if (existing.length > 0) {
          costCategoriesSkipped++
        } else {
          await db.insert(costCategories).values(c)
          costCategoriesCreated++
        }
      } catch {
        costCategoriesSkipped++
      }
    }

    // Seed SKUs
    for (const sku of SEED_SKUS) {
      try {
        const existing = await db.select({ id: masterSkus.id }).from(masterSkus).where(eq(masterSkus.code, sku.code)).limit(1)
        if (existing.length > 0) {
          skusSkipped++
        } else {
          await db.insert(masterSkus).values({ ...sku, isActive: true })
          skusCreated++
        }
      } catch {
        skusSkipped++
      }
    }

    return NextResponse.json({
      success: true,
      suppliers: { created: suppliersCreated, skipped: suppliersSkipped, total: SEED_SUPPLIERS.length },
      costCategories: { created: costCategoriesCreated, skipped: costCategoriesSkipped, total: SEED_COST_CATEGORIES.length },
      skus: { created: skusCreated, skipped: skusSkipped, total: SEED_SKUS.length },
    })
  } catch (error) {
    console.error("Error seeding master data:", error)
    return NextResponse.json({ error: "Failed to seed master data" }, { status: 500 })
  }
}

// DELETE: Reset all master data (careful - only for dev/reset)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const target = searchParams.get("target")

    if (target === "suppliers" || !target) {
      await db.delete(suppliers)
    }
    if (target === "costCategories" || !target) {
      await db.delete(costCategories)
    }
    if (target === "skus" || !target) {
      await db.delete(masterSkus)
    }

    return NextResponse.json({ success: true, message: `Reset ${target || "all"} master data` })
  } catch (error) {
    console.error("Error resetting master data:", error)
    return NextResponse.json({ error: "Failed to reset master data" }, { status: 500 })
  }
}
