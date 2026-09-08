import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { assets } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const asset = await db
      .select()
      .from(assets)
      .where(eq(assets.id, id))

    if (asset.length === 0) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    return NextResponse.json(asset[0])
  } catch (error) {
    console.error("Error fetching asset:", error)
    return NextResponse.json({ error: "Failed to fetch asset" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { code, name, category, location, purchaseDate, purchaseValue, status } = body

    const updated = await db
      .update(assets)
      .set({
        code,
        name,
        category,
        location,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        purchaseValue,
        status,
        updatedAt: new Date(),
      })
      .where(eq(assets.id, id))
      .returning()

    if (updated.length === 0) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    return NextResponse.json(updated[0])
  } catch (error: any) {
    console.error("Error updating asset:", error)
    if (String(error?.message || "").includes("duplicate") || String(error?.cause?.message || "").includes("duplicate") || error?.code === "23505") {
      return NextResponse.json({ error: "Kode aset sudah digunakan. Silakan gunakan kode yang berbeda." }, { status: 409 })
    }
    return NextResponse.json({ error: "Failed to update asset" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const deleted = await db
      .delete(assets)
      .where(eq(assets.id, id))
      .returning()

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, deleted: deleted[0] })
  } catch (error) {
    console.error("Error deleting asset:", error)
    return NextResponse.json({ error: "Failed to delete asset" }, { status: 500 })
  }
}
