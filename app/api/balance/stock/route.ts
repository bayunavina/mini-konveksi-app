import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { inventoryStock, inventoryMovements, products, warehouses, masterSkus } from "@/db/schema"
import { eq, sql } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")?.toLowerCase() || ""

    // Fetch stock with product and warehouse info
    const stockRows = await db
      .select({
        id: inventoryStock.id,
        productId: inventoryStock.productId,
        warehouseId: inventoryStock.warehouseId,
        quantity: inventoryStock.quantity,
        reservedQty: inventoryStock.reservedQty,
        updatedAt: inventoryStock.updatedAt,
        productSku: sql<string | null>`COALESCE(${products.sku}, ${masterSkus.code})`,
        productName: sql<string | null>`COALESCE(${products.name}, ${masterSkus.name})`,
        warehouseName: warehouses.name,
        warehouseCode: warehouses.code,
      })
      .from(inventoryStock)
      .leftJoin(products, eq(inventoryStock.productId, products.id))
      .leftJoin(masterSkus, eq(inventoryStock.productId, masterSkus.id))
      .leftJoin(warehouses, eq(inventoryStock.warehouseId, warehouses.id))

    // Compute stock from movements (recompute engine)
    const movements = await db.select().from(inventoryMovements)

    // Group movements by productId+warehouseId and compute net
    const computedByKey = new Map<string, number>()
    for (const m of movements) {
      if (!m.productId || !m.warehouseId) continue
      const key = `${m.productId}::${m.warehouseId}`
      // Movements store signed quantity: IN/QC_COMPLETE positive, OUT negative
      // But REJECT is now positive (fixed). Handle both: just sum as stored
      computedByKey.set(key, (computedByKey.get(key) || 0) + (m.quantity || 0))
    }

    let result = stockRows.map(s => {
      const key = `${s.productId}::${s.warehouseId}`
      const computedQty = computedByKey.get(key) ?? 0
      const systemQty = s.quantity ?? 0
      const deviation = systemQty - computedQty
      const status = deviation !== 0 ? "DEVIATED" : "BALANCED"

      return {
        id: s.id,
        productId: s.productId,
        productSku: s.productSku || "-",
        productName: s.productName || "-",
        warehouseId: s.warehouseId,
        warehouseName: s.warehouseName || "-",
        warehouseCode: s.warehouseCode || "-",
        systemQty,
        computedQty,
        reservedQty: s.reservedQty || 0,
        deviation,
        absDeviation: Math.abs(deviation),
        status,
        updatedAt: s.updatedAt,
      }
    })

    // Also detect orphan movements: movements for product-warehouse that has no stock row
    const stockKeys = new Set(stockRows.map(s => `${s.productId}::${s.warehouseId}`))
    const orphanMovements: Array<{
      id: string
      productId: string | null
      warehouseId: string | null
      computedQty: number
      systemQty: number
      deviation: number
      status: string
    }> = []

    for (const [key, computedQty] of computedByKey.entries()) {
      if (!stockKeys.has(key) && computedQty !== 0) {
        const [productId, warehouseId] = key.split("::")
        orphanMovements.push({
          id: `orphan-${key}`,
          productId,
          warehouseId,
          computedQty,
          systemQty: 0,
          deviation: -computedQty,
          status: "ORPHAN",
        })
      }
    }

    // Merge orphans into result if searching or showing all
    if (orphanMovements.length > 0) {
      // Fetch names for orphans
      for (const o of orphanMovements) {
        let productSku = "-"
        let productName = "-"
        let warehouseName = "-"
        let warehouseCode = "-"
        if (o.productId) {
          try {
            const prod = await db.select().from(products).where(eq(products.id, o.productId)).limit(1)
            if (prod.length > 0) {
              productSku = prod[0].sku
              productName = prod[0].name
            } else {
              const sku = await db.select().from(masterSkus).where(eq(masterSkus.id, o.productId)).limit(1)
              if (sku.length > 0) {
                productSku = sku[0].code
                productName = sku[0].name
              }
            }
          } catch {}
        }
        if (o.warehouseId) {
          try {
            const wh = await db.select().from(warehouses).where(eq(warehouses.id, o.warehouseId)).limit(1)
            if (wh.length > 0) {
              warehouseName = wh[0].name
              warehouseCode = wh[0].code
            }
          } catch {}
        }
        result.push({
          id: o.id,
          productId: o.productId,
          productSku,
          productName,
          warehouseId: o.warehouseId,
          warehouseName,
          warehouseCode,
          systemQty: 0,
          computedQty: o.computedQty,
          reservedQty: 0,
          deviation: o.deviation,
          absDeviation: Math.abs(o.deviation),
          status: "ORPHAN" as const,
          updatedAt: null as unknown as Date,
        })
      }
    }

    if (search) {
      result = result.filter(r =>
        r.productSku.toLowerCase().includes(search) ||
        r.productName.toLowerCase().includes(search) ||
        r.warehouseName.toLowerCase().includes(search) ||
        r.warehouseCode.toLowerCase().includes(search)
      )
    }

    const summary = {
      total: result.length,
      balanced: result.filter(r => r.status === "BALANCED").length,
      deviated: result.filter(r => r.status === "DEVIATED").length,
      orphan: result.filter(r => r.status === "ORPHAN").length,
      totalDeviation: result.reduce((s, r) => s + Math.abs(r.deviation), 0),
      totalSystemQty: result.reduce((s, r) => s + r.systemQty, 0),
      totalComputedQty: result.reduce((s, r) => s + r.computedQty, 0),
    }

    return NextResponse.json({ data: result, summary })
  } catch (error) {
    console.error("Error fetching stock balance:", error)
    return NextResponse.json({ error: "Failed to fetch stock balance" }, { status: 500 })
  }
}
