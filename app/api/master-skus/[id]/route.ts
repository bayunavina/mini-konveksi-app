import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { masterSkus } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { code, name, category, unit, price, isActive } = body

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }
    
    if (code !== undefined) updateData.code = code
    if (name !== undefined) updateData.name = name
    if (category !== undefined) updateData.category = category
    if (unit !== undefined) updateData.unit = unit
    if (price !== undefined) updateData.price = price
    if (isActive !== undefined) updateData.isActive = isActive

    const result = await db.update(masterSkus)
      .set(updateData)
      .where(eq(masterSkus.id, id))
      .returning()

    if (result.length === 0) {
      return NextResponse.json({ error: "SKU not found" }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error: any) {
    console.error("Error updating SKU:", error)
    if (String(error?.message || "").includes("duplicate") || String(error?.cause?.message || "").includes("duplicate") || error?.code === "23505") {
      return NextResponse.json({ error: "Kode bahan baku sudah digunakan. Silakan gunakan kode yang berbeda." }, { status: 409 })
    }
    return NextResponse.json({ error: "Failed to update SKU" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const result = await db.delete(masterSkus)
      .where(eq(masterSkus.id, id))
      .returning()

    if (result.length === 0) {
      return NextResponse.json({ error: "SKU not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "SKU deleted successfully" })
  } catch (error) {
    console.error("Error deleting SKU:", error)
    return NextResponse.json({ error: "Failed to delete SKU" }, { status: 500 })
  }
}
