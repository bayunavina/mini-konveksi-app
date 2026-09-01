import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { inventoryMovements, inventoryStock } from "@/db/schema"
import { gte, lte, and, sql } from "drizzle-orm"

const MONTHS_INDONESIAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString())

    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year, 11, 31, 23, 59, 59)

    const movements = await db
      .select({
        type: inventoryMovements.type,
        quantity: inventoryMovements.quantity,
        createdAt: inventoryMovements.createdAt,
      })
      .from(inventoryMovements)
      .where(
        and(
          gte(inventoryMovements.createdAt, startDate),
          lte(inventoryMovements.createdAt, endDate)
        )
      )

    const monthlyData = MONTHS_INDONESIAN.map((month, index) => {
      const monthMovements = movements.filter(m => {
        if (!m.createdAt) return false
        const date = new Date(m.createdAt)
        return date.getMonth() === index
      })

      const barangMasuk = monthMovements
        .filter(m => m.type === "IN" || m.type === "QC_COMPLETE" || m.type === "ADJUSTMENT_IN")
        .reduce((sum, m) => sum + m.quantity, 0)

      const barangKeluar = monthMovements
        .filter(m => m.type === "OUT" || m.type === "REJECT" || m.type === "ADJUSTMENT_OUT")
        .reduce((sum, m) => sum + Math.abs(m.quantity), 0)

      return {
        month,
        monthNum: index + 1,
        barangMasuk,
        barangKeluar,
      }
    })

    const currentStock = await db
      .select({
        totalQuantity: sql<string>`COALESCE(SUM(${inventoryStock.quantity}), 0)`.as("total_quantity"),
      })
      .from(inventoryStock)

    const totalBarangMasuk = movements
      .filter(m => m.type === "IN" || m.type === "QC_COMPLETE" || m.type === "ADJUSTMENT_IN")
      .reduce((sum, m) => sum + m.quantity, 0)

    const totalBarangKeluar = movements
      .filter(m => m.type === "OUT" || m.type === "REJECT" || m.type === "ADJUSTMENT_OUT")
      .reduce((sum, m) => sum + Math.abs(m.quantity), 0)

    return NextResponse.json({
      year,
      monthlyData,
      summary: {
        totalBarangMasuk,
        totalBarangKeluar,
        currentStock: parseInt(currentStock[0]?.totalQuantity || "0"),
      },
      availableYears: await getAvailableYears(),
    })
  } catch (error) {
    console.error("Error fetching inventory summary:", error)
    return NextResponse.json({ error: "Failed to fetch inventory summary" }, { status: 500 })
  }
}

async function getAvailableYears(): Promise<number[]> {
  try {
    const result = await db
      .select({
        year: sql<number>`EXTRACT(YEAR FROM ${inventoryMovements.createdAt})`,
      })
      .from(inventoryMovements)
      .groupBy(sql`EXTRACT(YEAR FROM ${inventoryMovements.createdAt})`)
      .orderBy(sql`EXTRACT(YEAR FROM ${inventoryMovements.createdAt}) DESC`)

    const years = result.map(r => r.year).filter(Boolean)
    const currentYear = new Date().getFullYear()
    
    if (!years.includes(currentYear)) {
      years.unshift(currentYear)
    }
    
    return years.length > 0 ? years : [currentYear]
  } catch {
    return [new Date().getFullYear()]
  }
}
