import 'dotenv/config'
import { Pool } from 'pg'

async function seed() {
  console.log('🌱 Starting database seed...')
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    // Clear existing data
    console.log('🧹 Clearing existing data...')
    await pool.query('DELETE FROM transfer_items')
    await pool.query('DELETE FROM transfers')
    await pool.query('DELETE FROM job_orders')
    await pool.query('DELETE FROM employees')
    await pool.query('DELETE FROM teams')
    await pool.query('DELETE FROM products')
    await pool.query('DELETE FROM warehouses')
    
    // 1. Create Warehouses
    console.log('📦 Creating warehouses...')
    const warehouseResults = await pool.query(`
      INSERT INTO warehouses (code, name, address) VALUES
      ('GUD-001', 'Gudang Utama', 'Jl. Raya Konveksi No. 1, Jakarta'),
      ('GUD-002', 'Gudang Bahan Baku', 'Jl. Industri No. 15, Jakarta'),
      ('GUD-003', 'Gudang Barang Jadi', 'Jl. Produksi No. 10, Jakarta'),
      ('GUD-004', 'Gudang QC', 'Jl. Quality No. 5, Jakarta')
      RETURNING id, code
    `)
    const gudangUtama = warehouseResults.rows.find(w => w.code === 'GUD-001')
    const gudangBahan = warehouseResults.rows.find(w => w.code === 'GUD-002')
    const gudangJadi = warehouseResults.rows.find(w => w.code === 'GUD-003')
    const gudangQC = warehouseResults.rows.find(w => w.code === 'GUD-004')
    console.log(`   Created ${warehouseResults.rows.length} warehouses`)

    // 2. Create Products
    console.log('👕 Creating products...')
    const productResults = await pool.query(`
      INSERT INTO products (sku, name, category, unit, price, min_stock) VALUES
      ('KPDL-H-S', 'Kemeja PDL Hitam Size S', 'Kemeja', 'Pcs', 450000, 10),
      ('KPDL-H-M', 'Kemeja PDL Hitam Size M', 'Kemeja', 'Pcs', 450000, 15),
      ('KPDL-H-L', 'Kemeja PDL Hitam Size L', 'Kemeja', 'Pcs', 450000, 20),
      ('KPDL-H-XL', 'Kemeja PDL Hitam Size XL', 'Kemeja', 'Pcs', 475000, 15),
      ('CDPL-H-S', 'Celana PDL Hitam Size S', 'Celana', 'Pcs', 380000, 10),
      ('CDPL-H-M', 'Celana PDL Hitam Size M', 'Celana', 'Pcs', 380000, 15),
      ('CDPL-H-L', 'Celana PDL Hitam Size L', 'Celana', 'Pcs', 380000, 20),
      ('CDPL-H-XL', 'Celana PDL Hitam Size XL', 'Celana', 'Pcs', 400000, 15),
      ('JKT-HM-S', 'Jaket Hoodie Marine Size S', 'Jaket', 'Pcs', 285000, 5),
      ('JKT-HM-M', 'Jaket Hoodie Marine Size M', 'Jaket', 'Pcs', 285000, 8),
      ('JKT-HM-L', 'Jaket Hoodie Marine Size L', 'Jaket', 'Pcs', 285000, 10),
      ('JKT-HM-XL', 'Jaket Hoodie Marine Size XL', 'Jaket', 'Pcs', 300000, 8)
      RETURNING id, sku
    `)
    const kemejaL = productResults.rows.find(p => p.sku === 'KPDL-H-L')
    const celanaL = productResults.rows.find(p => p.sku === 'CDPL-H-L')
    console.log(`   Created ${productResults.rows.length} products`)

    // 3. Create Teams
    console.log('👥 Creating teams...')
    const teamResults = await pool.query(`
      INSERT INTO teams (name, leader_name) VALUES
      ('Tim Produksi A', 'Budi Santoso'),
      ('Tim Produksi B', 'Dewi Lestari'),
      ('Tim Jahit', 'Ahmad Fauzi'),
      ('Tim Finishing', 'Siti Rahayu'),
      ('Tim QC', 'Joko Widodo')
      RETURNING id, name
    `)
    const timA = teamResults.rows.find(t => t.name === 'Tim Produksi A')
    const timB = teamResults.rows.find(t => t.name === 'Tim Produksi B')
    const timJahit = teamResults.rows.find(t => t.name === 'Tim Jahit')
    console.log(`   Created ${teamResults.rows.length} teams`)

    // 4. Create Employees (Admin, QC, 5 Workers)
    console.log('👤 Creating employees...')
    const employeeResults = await pool.query(`
      INSERT INTO employees (name, email, phone, role, team_id, base_salary, pin, is_active) VALUES
      ('Admin Sistem', 'indrabayunavina@gmail.com', '081234567890', 'ADMIN', NULL, 10000000, '1234', true),
      ('Rina Marlina', 'rina@konveksi.com', '081234567891', 'QC', NULL, 5500000, '2345', true),
      ('Budi Santoso', 'budi@konveksi.com', '081234567892', 'KARYAWAN', '${timA?.id}', 4500000, '3456', true),
      ('Dewi Lestari', 'dewi@konveksi.com', '081234567893', 'KARYAWAN', '${timB?.id}', 4500000, '4567', true),
      ('Ahmad Fauzi', 'ahmad@konveksi.com', '081234567894', 'KARYAWAN', '${timJahit?.id}', 4800000, '5678', true),
      ('Siti Rahayu', 'siti@konveksi.com', '081234567895', 'KARYAWAN', '${timA?.id}', 4200000, '6789', true),
      ('Joko Widodo', 'joko@konveksi.com', '081234567896', 'KARYAWAN', '${timB?.id}', 4200000, '7890', true),
      ('Fitri Handayani', 'fitri@konveksi.com', '081234567897', 'KARYAWAN', '${timJahit?.id}', 4000000, '8901', true)
      RETURNING id, name, role, pin
    `)
    console.log(`   Created ${employeeResults.rows.length} employees`)
    console.log(`   - Admin PIN: 1234`)
    console.log(`   - QC PIN: 2345`)
    console.log(`   - Workers PIN: 3456, 4567, 5678, 6789, 7890, 8901`)

    // 5. Create Job Orders
    console.log('📋 Creating job orders...')
    const joResults = await pool.query(`
      INSERT INTO job_orders (jo_number, product_id, team_id, target_qty, completed_qty, rejected_qty, status, due_date, notes) VALUES
      ('JO-2025-001', '${kemejaL?.id}', '${timA?.id}', 50, 45, 2, 'IN_PROGRESS', '2026-03-25', 'Prioritas tinggi - pesanan toko seragam'),
      ('JO-2025-002', '${celanaL?.id}', '${timB?.id}', 40, 40, 1, 'COMPLETED', '2026-03-20', 'Selesai tepat waktu'),
      ('JO-2025-003', '${kemejaL?.id}', '${timA?.id}', 30, 10, 0, 'IN_PROGRESS', '2026-03-28', '-'),
      ('JO-2025-004', '${celanaL?.id}', '${timJahit?.id}', 60, 0, 0, 'DRAFT', '2026-04-05', 'Menunggu bahan baku'),
      ('JO-2025-005', '${kemejaL?.id}', '${timB?.id}', 25, 25, 3, 'COMPLETED', '2026-03-18', 'QC check - 3 reject')
      RETURNING id, jo_number
    `)
    console.log(`   Created ${joResults.rows.length} job orders`)

    // 6. Create Transfers (10 transactions - incoming and outgoing)
    console.log('🚚 Creating transfers...')
    
    // Transfer 1 - Barang Masuk (dari supplier ke gudang)
    const transfer1 = await pool.query(`
      INSERT INTO transfers (transfer_number, type, from_warehouse_id, to_warehouse_id, status, notes)
      VALUES ('TRF-IN-001', 'INCOMING', '${gudangBahan?.id}', '${gudangUtama?.id}', 'COMPLETED', 'Barang masuk dari supplier')
      RETURNING id
    `)
    await pool.query(`
      INSERT INTO transfer_items (transfer_id, product_id, quantity, unit)
      VALUES ('${transfer1.rows[0].id}', '${kemejaL?.id}', 100, 'Lusin')
    `)

    // Transfer 2 - Barang Masuk
    const transfer2 = await pool.query(`
      INSERT INTO transfers (transfer_number, type, from_warehouse_id, to_warehouse_id, status, notes)
      VALUES ('TRF-IN-002', 'INCOMING', '${gudangBahan?.id}', '${gudangUtama?.id}', 'COMPLETED', 'Bahan baku baru')
      RETURNING id
    `)
    await pool.query(`
      INSERT INTO transfer_items (transfer_id, product_id, quantity, unit)
      VALUES ('${transfer2.rows[0].id}', '${celanaL?.id}', 80, 'Lusin')
    `)

    // Transfer 3 - Barang Jadi Masuk
    const transfer3 = await pool.query(`
      INSERT INTO transfers (transfer_number, type, from_warehouse_id, to_warehouse_id, status, notes)
      VALUES ('TRF-IN-003', 'INCOMING', '${gudangQC?.id}', '${gudangJadi?.id}', 'COMPLETED', 'Hasil produksi lolos QC')
      RETURNING id
    `)
    await pool.query(`
      INSERT INTO transfer_items (transfer_id, product_id, quantity, unit)
      VALUES ('${transfer3.rows[0].id}', '${kemejaL?.id}', 45, 'Lusin')
    `)

    // Transfer 4 - Barang Jadi Masuk
    const transfer4 = await pool.query(`
      INSERT INTO transfers (transfer_number, type, from_warehouse_id, to_warehouse_id, status, notes)
      VALUES ('TRF-IN-004', 'INCOMING', '${gudangQC?.id}', '${gudangJadi?.id}', 'COMPLETED', 'Batch produksi kedua')
      RETURNING id
    `)
    await pool.query(`
      INSERT INTO transfer_items (transfer_id, product_id, quantity, unit)
      VALUES ('${transfer4.rows[0].id}', '${celanaL?.id}', 40, 'Lusin')
    `)

    // Transfer 5 - Barang Masuk (Pending)
    const transfer5 = await pool.query(`
      INSERT INTO transfers (transfer_number, type, from_warehouse_id, to_warehouse_id, status, notes)
      VALUES ('TRF-IN-005', 'INCOMING', '${gudangBahan?.id}', '${gudangUtama?.id}', 'PENDING', 'Menunggu konfirmasi')
      RETURNING id
    `)
    await pool.query(`
      INSERT INTO transfer_items (transfer_id, product_id, quantity, unit)
      VALUES ('${transfer5.rows[0].id}', '${kemejaL?.id}', 60, 'Lusin')
    `)

    // Transfer 6 - Barang Keluar (dari gudang ke customer/Toko)
    const transfer6 = await pool.query(`
      INSERT INTO transfers (transfer_number, type, from_warehouse_id, to_warehouse_id, status, notes)
      VALUES ('TRF-OUT-001', 'OUTGOING', '${gudangJadi?.id}', '${gudangUtama?.id}', 'COMPLETED', 'Pengiriman ke Toko Seragam Jakarta')
      RETURNING id
    `)
    await pool.query(`
      INSERT INTO transfer_items (transfer_id, product_id, quantity, unit)
      VALUES ('${transfer6.rows[0].id}', '${kemejaL?.id}', 20, 'Lusin')
    `)

    // Transfer 7 - Barang Keluar
    const transfer7 = await pool.query(`
      INSERT INTO transfers (transfer_number, type, from_warehouse_id, to_warehouse_id, status, notes)
      VALUES ('TRF-OUT-002', 'OUTGOING', '${gudangJadi?.id}', '${gudangUtama?.id}', 'COMPLETED', 'Pengiriman ke Toko Bintang Textile')
      RETURNING id
    `)
    await pool.query(`
      INSERT INTO transfer_items (transfer_id, product_id, quantity, unit)
      VALUES ('${transfer7.rows[0].id}', '${celanaL?.id}', 15, 'Lusin')
    `)

    // Transfer 8 - Barang Keluar
    const transfer8 = await pool.query(`
      INSERT INTO transfers (transfer_number, type, from_warehouse_id, to_warehouse_id, status, notes)
      VALUES ('TRF-OUT-003', 'OUTGOING', '${gudangJadi?.id}', '${gudangUtama?.id}', 'COMPLETED', 'Pesanan PT maju Jaya')
      RETURNING id
    `)
    await pool.query(`
      INSERT INTO transfer_items (transfer_id, product_id, quantity, unit)
      VALUES ('${transfer8.rows[0].id}', '${kemejaL?.id}', 25, 'Lusin'),
             ('${transfer8.rows[0].id}', '${celanaL?.id}', 25, 'Lusin')
    `)

    // Transfer 9 - Barang Keluar (In Progress)
    const transfer9 = await pool.query(`
      INSERT INTO transfers (transfer_number, type, from_warehouse_id, to_warehouse_id, status, notes)
      VALUES ('TRF-OUT-004', 'OUTGOING', '${gudangJadi?.id}', '${gudangUtama?.id}', 'IN_PROGRESS', 'Menunggu pickup kurir')
      RETURNING id
    `)
    await pool.query(`
      INSERT INTO transfer_items (transfer_id, product_id, quantity, unit)
      VALUES ('${transfer9.rows[0].id}', '${kemejaL?.id}', 30, 'Lusin')
    `)

    // Transfer 10 - Barang Keluar (Pending)
    const transfer10 = await pool.query(`
      INSERT INTO transfers (transfer_number, type, from_warehouse_id, to_warehouse_id, status, notes)
      VALUES ('TRF-OUT-005', 'OUTGOING', '${gudangJadi?.id}', '${gudangUtama?.id}', 'PENDING', 'Konfirmasi pembayaran')
      RETURNING id
    `)
    await pool.query(`
      INSERT INTO transfer_items (transfer_id, product_id, quantity, unit)
      VALUES ('${transfer10.rows[0].id}', '${celanaL?.id}', 18, 'Lusin')
    `)

    console.log(`   Created 10 transfers (5 incoming, 5 outgoing)`)

    console.log('✅ Database seeded successfully!')
    console.log('')
    console.log('📋 Summary:')
    console.log('   Warehouses: 4')
    console.log('   Products: 12')
    console.log('   Teams: 5')
    console.log('   Employees: 8 (1 Admin, 1 QC, 6 Workers)')
    console.log('   Job Orders: 5')
    console.log('   Transfers: 10')
    console.log('')
    console.log('🔑 Login Credentials (for mobile app testing):')
    console.log('   Admin: indrabayunavina@gmail.com / password: admin123')
    console.log('   QC: rina@konveksi.com / password: qc123')
    console.log('   Workers: budi@konveksi.com, dewi@konveksi.com, etc. / password: worker123')

  } catch (error) {
    console.error('❌ Seed failed:', error)
    throw error
  } finally {
    await pool.end()
  }
}

seed()
