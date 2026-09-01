import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { products } from "@/db/schema"
import { like, desc, eq } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const source = searchParams.get("source")
    
    if (source) {
      const results = await db.select().from(products)
        .where(eq(products.source, source))
        .orderBy(desc(products.createdAt))
      return NextResponse.json(results)
    }

    if (search) {
      const results = await db.select().from(products)
        .where(like(products.name, `%${search}%`))
        .orderBy(desc(products.createdAt))
      return NextResponse.json(results)
    }

    const allProducts = await db.select().from(products).orderBy(desc(products.createdAt))
    return NextResponse.json(allProducts)
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sku, name, category, unit, price, minStock } = body

    const newProduct = await db.insert(products).values({
      sku,
      name,
      category,
      unit: unit || "Lusin",
      price: price || 0,
      minStock: minStock || 0,
    }).returning()

    return NextResponse.json(newProduct[0], { status: 201 })
  } catch (error) {
    console.error("Error creating product:", error)
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}
