import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { suppliers } from "@/db/schema"
import { eq, sql } from "drizzle-orm"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { code, name, contactPerson, phone, address } = body
    const result = await db.execute(sql`
      UPDATE suppliers SET
        code = COALESCE(${code}, code),
        name = COALESCE(${name}, name),
        contact_person = COALESCE(${contactPerson}, contact_person),
        phone = COALESCE(${phone}, phone),
        address = COALESCE(${address}, address),
        updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING id, code, name, contact_person as "contactPerson", phone, address, is_active as "isActive"
    `)
    const rows = result.rows as any[]
    if (rows.length === 0) return NextResponse.json({ error: "Supplier tidak ditemukan" }, { status: 404 })
    return NextResponse.json(rows[0])
  } catch (error: any) {
    if (String(error?.message || "").includes("duplicate")) {
      return NextResponse.json({ error: "Kode supplier sudah ada" }, { status: 409 })
    }
    console.error("Error updating supplier:", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await db.delete(suppliers).where(eq(suppliers.id, id)).returning()
    if (result.length === 0) return NextResponse.json({ error: "Supplier tidak ditemukan" }, { status: 404 })
    return NextResponse.json({ message: "Supplier dihapus" })
  } catch (error) {
    console.error("Error deleting supplier:", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
