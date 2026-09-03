import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { sql } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const all = searchParams.get("all") === "true"

    if (all) {
      const result = await db.execute(sql`
        SELECT id, code, name, type, description, created_at as "createdAt", updated_at as "updatedAt"
        FROM cost_categories
        ORDER BY type ASC, code ASC
      `)
      return NextResponse.json(result.rows)
    }

    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")))
    const search = (searchParams.get("search") || "").trim()
    const offset = (page - 1) * limit

    const hasSearch = search.length > 0
    const searchPattern = `%${search}%`

    const countResult = await db.execute(sql`
      SELECT COUNT(*) as total FROM cost_categories
      ${hasSearch ? sql`WHERE code ILIKE ${searchPattern} OR name ILIKE ${searchPattern} OR description ILIKE ${searchPattern}` : sql``}
    `)
    const total = Number((countResult.rows[0] as any).total)

    const result = await db.execute(sql`
      SELECT id, code, name, type, description, created_at as "createdAt", updated_at as "updatedAt"
      FROM cost_categories
      ${hasSearch ? sql`WHERE code ILIKE ${searchPattern} OR name ILIKE ${searchPattern} OR description ILIKE ${searchPattern}` : sql``}
      ORDER BY type ASC, code ASC
      LIMIT ${limit} OFFSET ${offset}
    `)

    return NextResponse.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error("Error fetching cost categories:", error)
    return NextResponse.json({ error: "Failed to fetch cost categories" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, name, type, description } = body

    if (!code || !name || !type) {
      return NextResponse.json({ error: "code, name, type wajib diisi" }, { status: 400 })
    }
    if (type !== "DIRECT" && type !== "INDIRECT") {
      return NextResponse.json({ error: "type harus DIRECT atau INDIRECT" }, { status: 400 })
    }

    const result = await db.execute(sql`
      INSERT INTO cost_categories (code, name, type, description)
      VALUES (${code}, ${name}, ${type}, ${description || null})
      RETURNING id, code, name, type, description, created_at as "createdAt", updated_at as "updatedAt"
    `)

    return NextResponse.json((result.rows as any[])[0], { status: 201 })
  } catch (error: any) {
    console.error("Error creating cost category:", error)
    if (String(error?.message || "").includes("duplicate") || String(error?.cause?.message || "").includes("duplicate")) {
      return NextResponse.json({ error: "Kode kategori sudah ada" }, { status: 409 })
    }
    return NextResponse.json({ error: "Failed to create cost category" }, { status: 500 })
  }
}