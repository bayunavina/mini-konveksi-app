import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { assets } from "@/db/schema"
import { desc } from "drizzle-orm"

export async function GET() {
  try {
    const allAssets = await db.select().from(assets).orderBy(desc(assets.createdAt))
    return NextResponse.json(allAssets)
  } catch (error) {
    console.error("Error fetching assets:", error)
    return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, name, category, location, purchaseDate, purchaseValue } = body

    const newAsset = await db.insert(assets).values({
      code,
      name,
      category: category || "MACHINE",
      location,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      purchaseValue: purchaseValue || 0,
      status: "ACTIVE",
    }).returning()

    return NextResponse.json(newAsset[0], { status: 201 })
  } catch (error: any) {
    console.error("Error creating asset:", error)
    if (String(error?.message || "").includes("duplicate") || String(error?.cause?.message || "").includes("duplicate") || error?.code === "23505") {
      return NextResponse.json({ error: "Kode aset sudah digunakan. Silakan gunakan kode yang berbeda." }, { status: 409 })
    }
    return NextResponse.json({ error: "Failed to create asset" }, { status: 500 })
  }
}
