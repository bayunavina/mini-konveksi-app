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
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function hashPassword(password: string): Promise<string> {
  const salt = toHex(crypto.randomBytes(16))
  const normalizedPassword = password.normalize("NFKC")

  const key = await scryptAsync(normalizedPassword, salt, {
    N: config.N,
    p: config.p,
    r: config.r,
    dkLen: config.dkLen,
    maxmem: config.maxmem,
  })

  return `${salt}:${toHex(key)}`
}

async function seedAdmin() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    const email = 'erpkonveksi@gmail.com'
    const password = 'erpkonveksi123!'
    const name = 'Admin Utama'

    // Check if user exists
    const existing = await pool.query('SELECT id FROM "user" WHERE email = $1', [email])

    let userId: string

    if (existing.rows.length > 0) {
      console.log('User already exists, updating password...')
      userId = existing.rows[0].id

      await pool.query('DELETE FROM account WHERE user_id = $1', [userId])
    } else {
      userId = crypto.randomUUID()

      await pool.query(
        'INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at) VALUES ($1, $2, $3, true, NOW(), NOW())',
        [userId, name, email]
      )
      console.log('User created')
    }

    const hashedPassword = await hashPassword(password)

    const accountId = crypto.randomUUID()

    await pool.query(
      'INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
      [accountId, 'credential', 'credential', userId, hashedPassword]
    )
    console.log('Account created with hashed password')

    // Create or update employee record with ADMIN role
    const existingEmployee = await pool.query('SELECT id FROM employees WHERE email = $1', [email])

    if (existingEmployee.rows.length > 0) {
      await pool.query(
        'UPDATE employees SET role = $1, user_id = $2, is_active = true WHERE email = $3',
        ['ADMIN', userId, email]
      )
      console.log('Employee record updated to ADMIN')
    } else {
      const employeeId = crypto.randomUUID()
      await pool.query(
        'INSERT INTO employees (id, name, email, role, user_id, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())',
        [employeeId, name, email, 'ADMIN', userId]
      )
      console.log('Employee record created with ADMIN role')
    }

    // Deactivate old default admin accounts
    const oldAdminEmails = ['admin@konveksi.com', 'indrabayunavina@gmail.com']
    for (const oldEmail of oldAdminEmails) {
      const oldAdmin = await pool.query('SELECT id FROM "user" WHERE email = $1', [oldEmail])
      if (oldAdmin.rows.length > 0) {
        const oldUserId = oldAdmin.rows[0].id
        await pool.query('DELETE FROM account WHERE user_id = $1', [oldUserId])
        await pool.query('DELETE FROM employees WHERE email = $1', [oldEmail])
        await pool.query('DELETE FROM "user" WHERE id = $1', [oldUserId])
        console.log(`Old admin account (${oldEmail}) has been removed`)
      }
    }

    console.log('')
    console.log('Superadmin seeded successfully!')
    console.log('')
    console.log('Login credentials:')
    console.log('   Email:', email)
    console.log('   Password:', password)
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await pool.end()
  }
}

seedAdmin()
