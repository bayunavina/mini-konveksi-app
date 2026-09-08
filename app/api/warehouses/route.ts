import { NextRequest, NextResponse } from "next/server"
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function GET() {
  try {
    const result = await pool.query('SELECT * FROM warehouses ORDER BY created_at DESC LIMIT 10')
    return NextResponse.json(result.rows)
  } catch (error: unknown) {
    const err = error as Error
    console.error("Error fetching warehouses:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, name, address } = body

    const result = await pool.query(
      'INSERT INTO warehouses (code, name, address) VALUES ($1, $2, $3) RETURNING *',
      [code, name, address]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: unknown) {
    const err = error as { code?: string; constraint?: string }
    if (err?.code === "23505" && err?.constraint === "warehouses_code_unique") {
      return NextResponse.json(
        { error: "Kode gudang sudah digunakan. Silakan gunakan kode yang berbeda." },
        { status: 409 }
      )
    }
    console.error("Error creating warehouse:", error)
    return NextResponse.json({ error: "Gagal menambahkan gudang" }, { status: 500 })
  }
}
