import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { transactions, jobOrders, products, costCategories } from "@/db/schema"
import { eq, inArray, gte, lte, sql, and } from "drizzle-orm"

interface HppPerSku {
  sku: string
  productName: string
  totalHpp: number
  joCount: number
  hppPerJo: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || new Date().toISOString().slice(0, 7)

    const directCats = await db.select({ code: costCategories.code }).from(costCategories).where(eq(costCategories.type, "DIRECT"))
    const directSet = new Set([...directCats.map(c => c.code), "MATERIAL", "BBL", "ACC", "TKL", "TKL-P", "OVP", "PKG"])
    const directArray = Array.from(directSet)

    const [year, month] = period.split("-").map(Number)
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 1)

    const rows = await db.select({
      sku: products.sku,
      productName: products.name,
      totalHpp: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`.as('total_hpp'),
      joCount: sql<number>`COUNT(DISTINCT ${transactions.jobOrderId})`.as('jo_count'),
    })
      .from(transactions)
      .innerJoin(jobOrders, eq(transactions.jobOrderId, jobOrders.id))
      .innerJoin(products, eq(jobOrders.productId, products.id))
      .where(and(
        eq(transactions.type, "EXPENSE"),
        inArray(transactions.category, directArray),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate),
      ))
      .groupBy(products.sku, products.name)
      .orderBy(sql`total_hpp DESC`)

    const data: HppPerSku[] = rows.map(r => ({
      sku: r.sku,
      productName: r.productName,
      totalHpp: Number(r.totalHpp) || 0,
      joCount: Number(r.joCount) || 0,
      hppPerJo: (Number(r.joCount) || 0) > 0 ? Math.round(Number(r.totalHpp) / (Number(r.joCount) || 1)) : 0,
    }))

    const totalHpp = data.reduce((sum, d) => sum + d.totalHpp, 0)
    const totalJo = data.reduce((sum, d) => sum + d.joCount, 0)

    return NextResponse.json({ period, data, summary: { totalHpp, totalJo, avgHppPerJo: totalJo > 0 ? Math.round(totalHpp / totalJo) : 0 } })
  } catch (error) {
    console.error("Error fetching HPP dashboard:", error)
    return NextResponse.json({ error: "Failed to fetch HPP dashboard" }, { status: 500 })
  }
}