import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { sql } from "drizzle-orm"

export async function GET() {
  try {
    const skus = await db.execute(sql`
      SELECT id, code, name, category, unit, price, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
      FROM master_skus
      ORDER BY created_at DESC
    `)
    
    return NextResponse.json(skus.rows)
  } catch (error) {
    console.error("Error fetching SKUs:", error)
    return NextResponse.json({ error: "Failed to fetch SKUs" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, name, category, unit, price } = body

    const result = await db.execute(sql`
      INSERT INTO master_skus (code, name, category, unit, price)
      VALUES (${code}, ${name}, ${category || null}, ${unit || 'Pcs'}, ${price || 0})
      RETURNING id, code, name, category, unit, price, is_active as "isActive"
    `)

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error("Error creating SKU:", error)
    return NextResponse.json({ error: "Failed to create SKU" }, { status: 500 })
  }
}
