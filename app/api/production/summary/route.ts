import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { materialLots, qcReports } from "@/db/schema"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year")
    const month = searchParams.get("month")

    const now = new Date()
    const filterYear = year ? parseInt(year) : now.getFullYear()
    const filterMonth = month ? parseInt(month) : null

    const lots = await db.select().from(materialLots)
    
    let filteredLots = lots
    if (filterMonth && filterMonth > 0) {
      filteredLots = lots.filter(lot => {
        if (!lot.createdAt) return false
        const date = new Date(lot.createdAt)
        return date.getFullYear() === filterYear && (date.getMonth() + 1) === filterMonth
      })
    } else {
      filteredLots = lots.filter(lot => {
        if (!lot.createdAt) return false
        const date = new Date(lot.createdAt)
        return date.getFullYear() === filterYear
      })
    }

    const masukProduksi = filteredLots.reduce((sum, lot) => {
      return sum + ((lot.initialQty || 0) - (lot.quantity || 0))
    }, 0)

    const qcFiltered = await db.select().from(qcReports)

    let filteredQC = qcFiltered
    if (filterMonth && filterMonth > 0) {
      filteredQC = qcFiltered.filter(r => {
        if (!r.createdAt) return false
        const date = new Date(r.createdAt)
        return date.getFullYear() === filterYear && (date.getMonth() + 1) === filterMonth
      })
    } else {
      filteredQC = qcFiltered.filter(r => {
        if (!r.createdAt) return false
        const date = new Date(r.createdAt)
        return date.getFullYear() === filterYear
      })
    }

    const lolosQC = filteredQC.reduce((sum, r) => sum + (r.successQty || 0), 0)
    const stokProduksi = Math.max(masukProduksi - lolosQC, 0)

    return NextResponse.json({
      masukProduksi,
      lolosQC,
      stokProduksi,
      filterYear,
      filterMonth: filterMonth || null,
    })
  } catch (error) {
    console.error("Error fetching production summary:", error)
    return NextResponse.json({ error: "Failed to fetch production summary" }, { status: 500 })
  }
}
