import { NextRequest, NextResponse } from "next/server"
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await pool.query('SELECT * FROM warehouses WHERE id = $1', [id])
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Warehouse not found" }, { status: 404 })
    }
    
    return NextResponse.json(result.rows[0])
  } catch (error: unknown) {
    const err = error as Error
    console.error("Error fetching warehouse:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { code, name, address, isActive } = body

    const result = await pool.query(
      'UPDATE warehouses SET code = $1, name = $2, address = $3, is_active = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
      [code, name, address, isActive ?? true, id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Warehouse not found" }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error: unknown) {
    const err = error as Error
    console.error("Error updating warehouse:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await pool.query('DELETE FROM warehouses WHERE id = $1 RETURNING *', [id])
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Warehouse not found" }, { status: 404 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const err = error as Error
    console.error("Error deleting warehouse:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
