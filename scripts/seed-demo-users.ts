import 'dotenv/config'
import { Pool } from 'pg'
import crypto from 'crypto'
import { scryptAsync } from '@noble/hashes/scrypt.js'

const config = {
  N: 16384,
  r: 16,
  p: 1,
  dkLen: 64,
  maxmem: 128 * 16384 * 16 * 2
}

function toHex(buffer: ArrayLike<number>): string {
  return Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password: string): Promise<string> {
  const salt = toHex(crypto.randomBytes(16))
  const normalizedPassword = password.normalize('NFKC')
  const key = await scryptAsync(normalizedPassword, salt, {
    N: config.N, p: config.p, r: config.r, dkLen: config.dkLen, maxmem: config.maxmem,
  })
  return `${salt}:${toHex(key)}`
}

function genQrCode(): string {
  const ts = Date.now().toString(36).toUpperCase()
  const r = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `EMP-${ts}${r}`
}

interface DemoUser {
  email: string
  password: string
  name: string
  role: 'KARYAWAN' | 'QC' | 'GUDANG'
}

const DEMO_USERS: DemoUser[] = [
  { email: 'karyawan@konveksi.local', password: 'karyawan123!', name: 'Budi Karyawan', role: 'KARYAWAN' },
  { email: 'qc@konveksi.local', password: 'qc123!', name: 'Siti QC', role: 'QC' },
  { email: 'gudang@konveksi.local', password: 'gudang123!', name: 'Agus Gudang', role: 'GUDANG' },
]

async function seedDemoUsers() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    for (const demo of DEMO_USERS) {
      console.log(`\nSeeding ${demo.role}: ${demo.email} ...`)
      const existing = await pool.query('SELECT id FROM "user" WHERE email = $1', [demo.email])
      let userId: string
      if (existing.rows.length > 0) {
        userId = existing.rows[0].id
        console.log(`  User exists (${userId}), updating password...`)
        await pool.query('DELETE FROM account WHERE user_id = $1', [userId])
        // also reset employee link if any stale
      } else {
        userId = crypto.randomUUID()
        await pool.query(
          'INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at) VALUES ($1, $2, $3, true, NOW(), NOW())',
          [userId, demo.name, demo.email]
        )
        console.log(`  User created (${userId})`)
      }

      const hashedPassword = await hashPassword(demo.password)
      await pool.query(
        'INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
        [crypto.randomUUID(), 'credential', 'credential', userId, hashedPassword]
      )
      console.log(`  Account created`)

      const existingEmp = await pool.query('SELECT id, qr_code FROM employees WHERE email = $1', [demo.email])
      if (existingEmp.rows.length > 0) {
        const qr = existingEmp.rows[0].qr_code || genQrCode()
        await pool.query('UPDATE employees SET role = $1, user_id = $2, is_active = true, name = $3, qr_code = $4, updated_at = NOW() WHERE email = $5', [demo.role, userId, demo.name, qr, demo.email])
        console.log(`  Employee updated to role ${demo.role} qr=${qr}`)
      } else {
        await pool.query(
          'INSERT INTO employees (id, name, email, role, user_id, qr_code, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())',
          [crypto.randomUUID(), demo.name, demo.email, demo.role, userId, genQrCode()]
        )
        console.log(`  Employee created with role ${demo.role}`)
      }
    }

    console.log('\n✅ Demo users seeded successfully!\n')
    console.log('Credentials:')
    for (const d of DEMO_USERS) {
      console.log(`  ${d.role.padEnd(10)} | ${d.email.padEnd(30)} | ${d.password}`)
    }
    console.log('\nSuperadmin tetap: erpkonveksi@gmail.com / erpkonveksi123!\n')
    console.log('Catatan: Role GUEST muncul jika email login tidak ada di tabel employees.')
    console.log('  -> Setiap user di better-auth (\"user\") harus punya baris di \"employees\" dengan email sama & role yang benar.')
    console.log('  -> Jika tidak ada, /api/user-role akan return GUEST.\n')
  } catch (error) {
    console.error('Error seeding demo users:', error)
  } finally {
    await pool.end()
  }
}

seedDemoUsers()
