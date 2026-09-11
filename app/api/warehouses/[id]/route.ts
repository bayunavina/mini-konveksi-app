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
    const err = error as { code?: string; constraint?: string }
    if (err?.code === "23505" && err?.constraint === "warehouses_code_unique") {
      return NextResponse.json(
        { error: "Kode gudang sudah digunakan. Silakan gunakan kode yang berbeda." },
        { status: 409 }
      )
    }
    console.error("Error updating warehouse:", err)
    return NextResponse.json({ error: "Gagal memperbarui gudang" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect()
  try {
    const { id } = await params

    await client.query("BEGIN")

    const stockResult = await client.query(
      'SELECT COALESCE(SUM(quantity), 0) AS total FROM inventory_stock WHERE warehouse_id = $1',
      [id]
    )
    const remainingStock = parseInt(stockResult.rows[0].total)

    if (remainingStock > 0) {
      await client.query("ROLLBACK")
      return NextResponse.json(
        { error: "Gudang masih memiliki stok tersisa, tidak dapat dihapus" },
        { status: 400 }
      )
    }

    await client.query(
      'DELETE FROM inventory_movements WHERE warehouse_id = $1',
      [id]
    )
    await client.query(
      'DELETE FROM inventory_stock WHERE warehouse_id = $1',
      [id]
    )
    await client.query(
      'DELETE FROM inventory WHERE warehouse_id = $1',
      [id]
    )
    await client.query(
      'UPDATE transfers SET from_warehouse_id = NULL WHERE from_warehouse_id = $1',
      [id]
    )
    await client.query(
      'UPDATE transfers SET to_warehouse_id = NULL WHERE to_warehouse_id = $1',
      [id]
    )
    await client.query('DELETE FROM warehouses WHERE id = $1', [id])

    await client.query("COMMIT")
    return NextResponse.json({ success: true, softDeleted: false })
  } catch (error: unknown) {
    await client.query("ROLLBACK")
    const err = error as Error
    console.error("Error deleting warehouse:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  } finally {
    client.release()
  }
}
