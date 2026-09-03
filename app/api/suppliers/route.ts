import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { sql } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const all = searchParams.get("all") === "true"

    if (all) {
      const result = await db.execute(sql`
        SELECT id, code, name, contact_person as "contactPerson", phone, address, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
        FROM suppliers
        ORDER BY code ASC
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
      SELECT COUNT(*) as total FROM suppliers
      ${hasSearch ? sql`WHERE code ILIKE ${searchPattern} OR name ILIKE ${searchPattern} OR contact_person ILIKE ${searchPattern}` : sql``}
    `)
    const total = Number((countResult.rows[0] as any).total)

    const result = await db.execute(sql`
      SELECT id, code, name, contact_person as "contactPerson", phone, address, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
      FROM suppliers
      ${hasSearch ? sql`WHERE code ILIKE ${searchPattern} OR name ILIKE ${searchPattern} OR contact_person ILIKE ${searchPattern}` : sql``}
      ORDER BY code ASC
      LIMIT ${limit} OFFSET ${offset}
    `)

    return NextResponse.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error("Error fetching suppliers:", error)
    return NextResponse.json({ error: "Failed to fetch suppliers" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, name, contactPerson, phone, address } = body
    if (!code || !name) {
      return NextResponse.json({ error: "code & name wajib" }, { status: 400 })
    }
    const result = await db.execute(sql`
      INSERT INTO suppliers (code, name, contact_person, phone, address)
      VALUES (${code}, ${name}, ${contactPerson || null}, ${phone || null}, ${address || null})
      RETURNING id, code, name, contact_person as "contactPerson", phone, address, is_active as "isActive"
    `)
    return NextResponse.json((result.rows as any[])[0], { status: 201 })
  } catch (error: any) {
    console.error("Error creating supplier:", error)
    if (String(error?.message || "").includes("duplicate") || String(error?.cause?.message || "").includes("duplicate")) {
      return NextResponse.json({ error: "Kode supplier sudah ada" }, { status: 409 })
    }
    return NextResponse.json({ error: "Failed to create supplier" }, { status: 500 })
  }
}
