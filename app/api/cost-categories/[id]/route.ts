import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { costCategories } from "@/db/schema"
import { eq, sql } from "drizzle-orm"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { code, name, type, description } = body

    if (type && type !== "DIRECT" && type !== "INDIRECT") {
      return NextResponse.json({ error: "type harus DIRECT atau INDIRECT" }, { status: 400 })
    }

    const result = await db.execute(sql`
      UPDATE cost_categories
      SET
        code = COALESCE(${code}, code),
        name = COALESCE(${name}, name),
        type = COALESCE(${type}, type),
        description = COALESCE(${description}, description),
        updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING id, code, name, type, description, created_at as "createdAt", updated_at as "updatedAt"
    `)

    const rows = result.rows as any[]
    if (rows.length === 0) {
      return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 })
    }
    return NextResponse.json(rows[0])
  } catch (error: any) {
    console.error("Error updating cost category:", error)
    if (String(error?.message || "").includes("duplicate")) {
      return NextResponse.json({ error: "Kode kategori sudah ada" }, { status: 409 })
    }
    return NextResponse.json({ error: "Failed to update cost category" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await db.delete(costCategories).where(eq(costCategories.id, id)).returning()
    if (result.length === 0) {
      return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 })
    }
    return NextResponse.json({ message: "Kategori berhasil dihapus" })
  } catch (error) {
    console.error("Error deleting cost category:", error)
    return NextResponse.json({ error: "Failed to delete cost category" }, { status: 500 })
  }
}
