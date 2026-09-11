import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { inventoryMovements, products, warehouses } from "@/db/schema"
import { eq, desc, lt } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get("productId")
    const warehouseId = searchParams.get("warehouseId")
    const type = searchParams.get("type")
    const limit = parseInt(searchParams.get("limit") || "50")

    await db
      .delete(inventoryMovements)
      .where(lt(inventoryMovements.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)))

    const query = db
      .select({
        id: inventoryMovements.id,
        type: inventoryMovements.type,
        quantity: inventoryMovements.quantity,
        reference: inventoryMovements.reference,
        referenceId: inventoryMovements.referenceId,
        notes: inventoryMovements.notes,
        createdAt: inventoryMovements.createdAt,
        product: {
          id: products.id,
          name: products.name,
          sku: products.sku,
        },
        warehouse: {
          id: warehouses.id,
          name: warehouses.name,
        },
      })
      .from(inventoryMovements)
      .leftJoin(products, eq(inventoryMovements.productId, products.id))
      .leftJoin(warehouses, eq(inventoryMovements.warehouseId, warehouses.id))
      .orderBy(desc(inventoryMovements.createdAt))
      .limit(limit)

    const results = await query

    let filtered = results
    if (productId) {
      filtered = filtered.filter(r => r.product?.id === productId)
    }
    if (warehouseId) {
      filtered = filtered.filter(r => r.warehouse?.id === warehouseId)
    }
    if (type) {
      filtered = filtered.filter(r => r.type === type)
    }

    const summary = {
      totalIn: results.filter(r => r.type === "IN" || r.type === "QC_COMPLETE").reduce((sum, r) => sum + r.quantity, 0),
      totalOut: results.filter(r => r.type === "OUT" || r.type === "REJECT").reduce((sum, r) => sum + Math.abs(r.quantity), 0),
    }

    return NextResponse.json({
      movements: filtered,
      summary,
      totalCount: filtered.length,
    })
  } catch (error) {
    console.error("Error fetching inventory movements:", error)
    return NextResponse.json({ error: "Failed to fetch inventory movements" }, { status: 500 })
  }
}
