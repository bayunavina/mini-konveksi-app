import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { sql } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const all = searchParams.get("all") === "true"

    if (all) {
      const skus = await db.execute(sql`
        SELECT id, code, name, category, unit, price, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
        FROM master_skus
        ORDER BY code ASC
      `)
      return NextResponse.json(skus.rows)
    }

    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")))
    const search = (searchParams.get("search") || "").trim()
    const offset = (page - 1) * limit

    const hasSearch = search.length > 0
    const searchPattern = `%${search}%`

    const countResult = await db.execute(sql`
      SELECT COUNT(*) as total FROM master_skus
      ${hasSearch ? sql`WHERE code ILIKE ${searchPattern} OR name ILIKE ${searchPattern} OR category ILIKE ${searchPattern}` : sql``}
    `)
    const total = Number((countResult.rows[0] as any).total)

    const skus = await db.execute(sql`
      SELECT id, code, name, category, unit, price, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
      FROM master_skus
      ${hasSearch ? sql`WHERE code ILIKE ${searchPattern} OR name ILIKE ${searchPattern} OR category ILIKE ${searchPattern}` : sql``}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `)

    return NextResponse.json({
      data: skus.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
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
