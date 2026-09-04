import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { productionFromMaterials, materialLots, masterSkus } from "@/db/schema"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const yearParam = searchParams.get("year")
    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear()

    const allProduction = await db
      .select({
        id: productionFromMaterials.id,
        lotId: productionFromMaterials.lotId,
        productId: productionFromMaterials.productId,
        producedQty: productionFromMaterials.producedQty,
        createdAt: productionFromMaterials.createdAt,
      })
      .from(productionFromMaterials)

    const allLots = await db
      .select({
        id: materialLots.id,
        productId: materialLots.productId,
      })
      .from(materialLots)

    const allSkus = await db
      .select({
        id: masterSkus.id,
        code: masterSkus.code,
        name: masterSkus.name,
      })
      .from(masterSkus)

    const skuMap = new Map<string, { id: string; code: string; name: string }>()
    allSkus.forEach((sku) => skuMap.set(sku.id, { id: sku.id, code: sku.code, name: sku.name }))

    const lotToSkuMap = new Map<string, string>()
    allLots.forEach((lot) => lotToSkuMap.set(lot.id, lot.productId))

    const productionWithSku = allProduction
      .map((p) => {
        const skuId = lotToSkuMap.get(p.lotId)
        const sku = skuId ? skuMap.get(skuId) : null
        return {
          ...p,
          skuId,
          skuCode: sku?.code || "Unknown",
          skuName: sku?.name || "Unknown",
        }
      })
      .filter((p) => p.createdAt && new Date(p.createdAt).getFullYear() === year)

    const materialStats: Record<string, { totalQty: number; name: string; code: string }> = {}
    productionWithSku.forEach((p) => {
      if (!materialStats[p.skuCode]) {
        materialStats[p.skuCode] = { totalQty: 0, name: p.skuName, code: p.skuCode }
      }
      materialStats[p.skuCode].totalQty += p.producedQty
    })

    const sortedMaterials = Object.values(materialStats)
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 5)

    const topMaterialCodes = sortedMaterials.map((m) => m.code)

    const monthlyData = MONTHS.map((monthName, monthIndex) => {
      const monthProduction = productionWithSku.filter((p) => {
        const date = new Date(p.createdAt!)
        return date.getMonth() === monthIndex
      })

      const dataPoint: Record<string, string | number> = { month: monthName }

      topMaterialCodes.forEach((code) => {
        const total = monthProduction
          .filter((p) => p.skuCode === code)
          .reduce((sum, p) => sum + p.producedQty, 0)
        dataPoint[code] = total
      })

      return dataPoint
    })

    return NextResponse.json({
      topMaterials: topMaterialCodes.map((code) => {
        const stats = materialStats[code]
        return {
          code,
          name: stats?.name || code,
          totalProduced: stats?.totalQty || 0,
        }
      }),
      data: monthlyData,
      year,
    })
  } catch (error) {
    console.error("Error fetching production from materials data:", error)

    const yearParam = new URL(request.url).searchParams.get("year")
    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear()

    const mockMaterials = ["BB-COTTON", "BB-POLY", "BB-DENIM", "BB-SILK", "BB-WOOL"]
    const mockData = MONTHS.map((monthName) => {
      const dataPoint: Record<string, string | number> = { month: monthName }
      mockMaterials.forEach((code) => {
        dataPoint[code] = Math.floor(Math.random() * 100)
      })
      return dataPoint
    })

    return NextResponse.json({
      topMaterials: mockMaterials.map((code) => ({
        code,
        name: code.replace("BB-", ""),
        totalProduced: Math.floor(Math.random() * 500),
      })),
      data: mockData,
      year,
    })
  }
}
