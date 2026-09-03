import 'dotenv/config'
import { Pool } from 'pg'

const mockSkus = [
  { code: 'SKU-KMJ-001', name: 'Kemeja PDL Navy Size S', category: 'Kemeja', unit: 'Pcs', price: 185000 },
  { code: 'SKU-KMJ-002', name: 'Kemeja PDL Navy Size M', category: 'Kemeja', unit: 'Pcs', price: 185000 },
  { code: 'SKU-KMJ-003', name: 'Kemeja PDL Navy Size L', category: 'Kemeja', unit: 'Pcs', price: 195000 },
  { code: 'SKU-KMJ-004', name: 'Kemeja PDL Navy Size XL', category: 'Kemeja', unit: 'Pcs', price: 205000 },
  { code: 'SKU-CLN-001', name: 'Celana PDL Hitam Size M', category: 'Celana', unit: 'Pcs', price: 165000 },
  { code: 'SKU-CLN-002', name: 'Celana PDL Hitam Size L', category: 'Celana', unit: 'Pcs', price: 175000 },
  { code: 'SKU-KAO-001', name: 'Kaos Polo Cotton Navy', category: 'Kaos', unit: 'Pcs', price: 95000 },
  { code: 'SKU-KAO-002', name: 'Kaos Oblong Hitam Premium', category: 'Kaos', unit: 'Pcs', price: 75000 },
  { code: 'SKU-JKT-001', name: 'Jaket Hoodie Marine', category: 'Jaket', unit: 'Pcs', price: 285000 },
  { code: 'SKU-JKT-002', name: 'Jaket Bomber Hitam', category: 'Jaket', unit: 'Pcs', price: 320000 },
  { code: 'SKU-SRG-001', name: 'Seragam PDH Khaki Lengan Panjang', category: 'Seragam', unit: 'Pcs', price: 225000 },
  { code: 'SKU-SRG-002', name: 'Seragam PDL Loreng Malvinas', category: 'Seragam', unit: 'Pcs', price: 245000 },
]

const mockSuppliers = [
  { code: 'SUP-001', name: 'PT. Sandang Jaya Textile', contact_person: 'Budi Hartono', phone: '021-87654321', address: 'Jl. Industri Textile No.88, Bandung, Jawa Barat' },
  { code: 'SUP-002', name: 'CV. Sumber Kain Abadi', contact_person: 'Siti Aminah', phone: '022-45678901', address: 'Jl. Soekarno Hatta No.120, Bandung' },
  { code: 'SUP-003', name: 'PT. Karya Sandang Mulia', contact_person: 'Ahmad Fauzi', phone: '021-34567890', address: 'Jl. Raya Bogor KM 24, Jakarta Timur' },
  { code: 'SUP-004', name: 'UD. Berkah Kain Grosir', contact_person: 'Dewi Lestari', phone: '0274-5551234', address: 'Jl. Malioboro No.45, Yogyakarta' },
  { code: 'SUP-005', name: 'CV. Mitra Konveksi Supply', contact_person: 'Joko Widodo', phone: '031-87651234', address: 'Jl. Rungkut Industri No.10, Surabaya' },
  { code: 'SUP-006', name: 'PT. Indo Textile Prima', contact_person: 'Rina Marlina', phone: '021-99887766', address: 'Jl. Daan Mogot No.99, Jakarta Barat' },
  { code: 'SUP-007', name: 'Toko Kain Murah Barokah', contact_person: 'Slamet Riyadi', phone: '0271-334455', address: 'Jl. Slamet Riyadi No.200, Solo' },
  { code: 'SUP-008', name: 'CV. Aksesoris Konveksi Lengkap', contact_person: 'Fitri Handayani', phone: '022-77889900', address: 'Jl. Cihampelas No.15, Bandung' },
]

const mockCostCategories = [
  // DIRECT (6) - Masuk HPP
  { code: 'BBL', name: 'Bahan Baku Kain', type: 'DIRECT', description: 'Kain utama, kain keras, rib - termasuk ongkir beli bahan' },
  { code: 'ACC', name: 'Aksesoris Langsung', type: 'DIRECT', description: 'Benang, kancing, resleting, karet, busa, label woven' },
  { code: 'TKL', name: 'Upah Jahit Borongan', type: 'DIRECT', description: 'Upah jahit per pcs / borongan (60% HPP) - tim 20+ penjahit' },
  { code: 'TKL-P', name: 'Upah Potong', type: 'DIRECT', description: 'Upah potong kain harian / borongan' },
  { code: 'OVP', name: 'Ongkos Vendor Jahit (CMT)', type: 'DIRECT', description: 'Maklon / CMT vendor luar saat overload 30 orang' },
  { code: 'PKG', name: 'Packaging & Label', type: 'DIRECT', description: 'Plastik OPP, hangtag, label harga, dus packing' },
  // INDIRECT (8) - BOP / Biaya Usaha
  { code: 'GTL', name: 'Gaji Tidak Langsung', type: 'INDIRECT', description: 'Gaji mandor, admin produksi, QC leader (3 org) - tetap bulanan' },
  { code: 'LST', name: 'Listrik & Air', type: 'INDIRECT', description: 'Utilitas listrik, air, genset, kompresor bulanan' },
  { code: 'SEWA', name: 'Sewa Tempat', type: 'INDIRECT', description: 'Sewa gudang, workshop & toko / cicilan ruko' },
  { code: 'MTC', name: 'Service & Penyusutan Mesin', type: 'INDIRECT', description: 'Service mesin jahit, obras, cutting + penyusutan 15-20 mesin' },
  { code: 'BPJS', name: 'BPJS, THR & Tunjangan', type: 'INDIRECT', description: 'BPJS Ketenagakerjaan, THR, tunjangan harian 30 karyawan' },
  { code: 'KON', name: 'Konsumsi & Mess', type: 'INDIRECT', description: 'Makan siang, air galon, gas, mess karyawan' },
  { code: 'ADM', name: 'Administrasi Umum', type: 'INDIRECT', description: 'ATK, internet, operasional kantor, pajak UMKM' },
  { code: 'MKT', name: 'Marketing & Kirim Jual', type: 'INDIRECT', description: 'Foto produk, iklan, fee marketplace, ongkir kirim barang jadi' },
]

async function seedMaster() {
  console.log('🌱 Seeding Master Data (SKU, Supplier, Cost Category)...')
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  try {
    // SKU
    console.log('\n📦 Seeding master_skus...')
    let skuInserted = 0
    for (const sku of mockSkus) {
      const res = await pool.query(
        `INSERT INTO master_skus (code, name, category, unit, price, is_active)
         VALUES ($1,$2,$3,$4,$5,true)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, price = EXCLUDED.price, updated_at = NOW()
         RETURNING id`,
        [sku.code, sku.name, sku.category, sku.unit, sku.price]
      )
      if (res.rowCount && res.rowCount > 0) skuInserted++
    }
    // make one nonaktif for variation
    await pool.query(`UPDATE master_skus SET is_active = false WHERE code = 'SKU-KAO-002'`)
    console.log(`   ✔ ${mockSkus.length} SKUs ensured (${skuInserted} inserted/updated), 1 set nonaktif`)

    // Suppliers
    console.log('\n🏭 Seeding suppliers...')
    for (const sup of mockSuppliers) {
      await pool.query(
        `INSERT INTO suppliers (code, name, contact_person, phone, address, is_active)
         VALUES ($1,$2,$3,$4,$5,true)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, contact_person = EXCLUDED.contact_person, phone = EXCLUDED.phone, address = EXCLUDED.address, updated_at = NOW()
         RETURNING id`,
        [sup.code, sup.name, sup.contact_person, sup.phone, sup.address]
      )
    }
    console.log(`   ✔ ${mockSuppliers.length} suppliers ensured`)

    // Cost Categories
    console.log('\n💰 Seeding cost_categories...')
    for (const cat of mockCostCategories) {
      await pool.query(
        `INSERT INTO cost_categories (code, name, type, description)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type, description = EXCLUDED.description
         RETURNING id`,
        [cat.code, cat.name, cat.type, cat.description]
      )
    }
    console.log(`   ✔ ${mockCostCategories.length} cost categories ensured`)

    const skuCount = await pool.query('SELECT count(*) FROM master_skus')
    const supCount = await pool.query('SELECT count(*) FROM suppliers')
    const costCount = await pool.query('SELECT count(*) FROM cost_categories')
    console.log('\n✅ Master seeding completed!')
    console.log(`   master_skus: ${skuCount.rows[0].count}`)
    console.log(`   suppliers: ${supCount.rows[0].count}`)
    console.log(`   cost_categories: ${costCount.rows[0].count}`)
    console.log('\n🔗 Buka http://localhost:3000/dashboard/settings/master untuk melihat data.')
  } catch (e) {
    console.error('❌ Seed failed:', e)
    throw e
  } finally {
    await pool.end()
  }
}

seedMaster()
