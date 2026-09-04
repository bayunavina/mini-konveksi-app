import { NextResponse } from "next/server"
import { db } from "@/db"
import { inventoryMovements, inventoryStock, products, warehouses } from "@/db/schema"

export async function GET() {
  try {
    // 1. Ambil semua inventoryStock per product+warehouse
    const stockRows = await db
      .select({
        productId: inventoryStock.productId,
        warehouseId: inventoryStock.warehouseId,
        systemQty: inventoryStock.quantity,
      })
      .from(inventoryStock)

    // 2. Ambil semua movements (tanpa filter tanggal — lihat seluruh riwayat)
    const allMovements = await db
      .select({
        productId: inventoryMovements.productId,
        warehouseId: inventoryMovements.warehouseId,
        quantity: inventoryMovements.quantity,
      })
      .from(inventoryMovements)

    // 3. Siapkan peta productId -> name dan warehouseId -> name (fetch sekali)
    const productNameMap = new Map<string, string>()
    const allProdRows = await db.select({ id: products.id, name: products.name }).from(products)
    for (const p of allProdRows) {
      productNameMap.set(p.id, p.name)
    }

    // Fetch warehouse names in bulk
    const warehouseNameMap = new Map<string, string>()
    const allWhRows = await db.select({ id: warehouses.id, name: warehouses.name }).from(warehouses)
    for (const w of allWhRows) {
      warehouseNameMap.set(w.id, w.name)
    }

    // 3. Kelompokkan movements per product+warehouse => computeQty
    const movementMap = new Map<string, number[]>()
    for (const m of allMovements) {
      const key = `${m.productId}|${m.warehouseId}`
      if (!movementMap.has(key)) movementMap.set(key, [])
      movementMap.get(key)!.push(m.quantity)
    }

    // 4. Gabungkan stock dan compute, hitung deviasi
    const report: Array<{
      productId: string
      warehouseId: string
      productName: string
      warehouseName: string
      systemQty: number
      computedQty: number
      deviation: number
      status: "OK" | "DEVIATED"
    }> = []

    for (const s of stockRows) {
      if (!s.productId || !s.warehouseId) continue
      const key = `${s.productId}|${s.warehouseId}`
      const quantities = movementMap.get(key) || []
      const computedQty = quantities.reduce((sum, q) => sum + q, 0)
      report.push({
        productId: s.productId,
        warehouseId: s.warehouseId,
        productName: productNameMap.get(s.productId) ?? "-",
        warehouseName: warehouseNameMap.get(s.warehouseId) ?? "-",
        systemQty: s.systemQty ?? 0,
        computedQty: computedQty,
        deviation: (s.systemQty ?? 0) - computedQty,
        status: (s.systemQty ?? 0) !== computedQty ? "DEVIATED" : "OK",
      })
    }

    // 5. Tambahkan item yang ada movements tapi tidak ada di inventoryStock (stock tak terinisialisasi)
    const orphanKeys = new Set<string>()
    for (const key of movementMap.keys()) {
      if (!stockRows.some((s) => `${s.productId}|${s.warehouseId}` === key)) {
        orphanKeys.add(key)
      }
    }

    const orphanItems = await Promise.all(
      Array.from(orphanKeys).map(async (key) => {
        const [pid, wid] = key.split("|")
        const quantities = movementMap.get(key)!
        const computedQty = quantities.reduce((sum, q) => sum + q, 0)

        return {
          productId: pid,
          warehouseId: wid,
          productName: productNameMap.get(pid) as string || "-",
          warehouseName: warehouseNameMap.get(wid) as string || "-",
          systemQty: 0,
          computedQty,
          deviation: computedQty !== 0 ? -computedQty : 0,
          status: computedQty !== 0 ? "DEVIATED" : "OK",
        }
      })
    )

    const allItems = [...report, ...(await orphanItems)]

    const summary = {
      totalItemsChecked: allItems.length,
      okCount: allItems.filter((i) => i.status === "OK").length,
      deviatedCount: allItems.filter((i) => i.status === "DEVIATED").length,
      totalSystemQty: allItems.reduce((sum, i) => sum + i.systemQty, 0),
      totalComputedQty: allItems.reduce((sum, i) => sum + i.computedQty, 0),
      totalDeviation: allItems.reduce((sum, i) => sum + i.deviation, 0),
    }

    return NextResponse.json({
      report: allItems,
      summary,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error running inventory audit:", error)
    return NextResponse.json({ error: "Failed to run inventory audit" }, { status: 500 })
  }
}