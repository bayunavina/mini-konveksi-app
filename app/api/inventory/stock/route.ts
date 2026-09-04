import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { inventoryStock, inventoryMovements, products, warehouses } from "@/db/schema"
import { eq, and, desc } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get("productId")
    const warehouseId = searchParams.get("warehouseId")

    let results

    if (productId && warehouseId) {
      results = await db
        .select()
        .from(inventoryStock)
        .where(and(
          eq(inventoryStock.productId, productId),
          eq(inventoryStock.warehouseId, warehouseId)
        ))
    } else if (productId) {
      results = await db
        .select({
          id: inventoryStock.id,
          quantity: inventoryStock.quantity,
          reservedQty: inventoryStock.reservedQty,
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
        .from(inventoryStock)
        .leftJoin(products, eq(inventoryStock.productId, products.id))
        .leftJoin(warehouses, eq(inventoryStock.warehouseId, warehouses.id))
        .where(eq(inventoryStock.productId, productId))
    } else if (warehouseId) {
      results = await db
        .select({
          id: inventoryStock.id,
          quantity: inventoryStock.quantity,
          reservedQty: inventoryStock.reservedQty,
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
        .from(inventoryStock)
        .leftJoin(products, eq(inventoryStock.productId, products.id))
        .leftJoin(warehouses, eq(inventoryStock.warehouseId, warehouses.id))
        .where(eq(inventoryStock.warehouseId, warehouseId))
    } else {
      results = await db
        .select({
          id: inventoryStock.id,
          quantity: inventoryStock.quantity,
          reservedQty: inventoryStock.reservedQty,
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
        .from(inventoryStock)
        .leftJoin(products, eq(inventoryStock.productId, products.id))
        .leftJoin(warehouses, eq(inventoryStock.warehouseId, warehouses.id))
        .orderBy(desc(inventoryStock.updatedAt))
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error("Error fetching inventory stock:", error)
    return NextResponse.json({ error: "Failed to fetch inventory stock" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, warehouseId, type, quantity, reference, referenceId, notes } = body

    if (!productId || !warehouseId || !type || !quantity) {
      return NextResponse.json({ 
        error: "productId, warehouseId, type, and quantity are required" 
      }, { status: 400 })
    }

    const movementType = type.toUpperCase()
    const qty = parseInt(quantity)
    
    // --- ADJUSTMENT handling: mapped to ADJUSTMENT_IN/ADJUSTMENT_OUT for summary compatibility ---
    if (movementType === "ADJUSTMENT") {
      if (qty === 0) {
        return NextResponse.json({ error: "Quantity must be non-zero for ADJUSTMENT" }, { status: 400 })
      }
      const adjQty = qty
      const summaryType = adjQty > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT"
      
      let newQuantity: number
      
      const existingStock = await db
        .select()
        .from(inventoryStock)
        .where(and(
          eq(inventoryStock.productId, productId),
          eq(inventoryStock.warehouseId, warehouseId)
        ))
      
      if (existingStock.length === 0) {
        if (adjQty < 0) {
          return NextResponse.json({ error: "Cannot add negative stock to new entry via ADJUSTMENT" }, { status: 400 })
        }
        await db.insert(inventoryStock).values({
          productId, warehouseId, quantity: adjQty,
        })
        newQuantity = adjQty
      } else {
        const currentQty = existingStock[0].quantity || 0
        newQuantity = currentQty + adjQty
        if (newQuantity < 0) {
          return NextResponse.json({ error: "Stok tidak boleh negatif setelah penyesuaian" }, { status: 400 })
        }
      }
      
      await db.insert(inventoryMovements).values({
        productId, warehouseId, type: summaryType,
        quantity: adjQty,
        reference: reference ?? "MANUAL",
        referenceId: referenceId,
        notes: notes ?? "Penyesuaian manual stok",
      })
      
      return NextResponse.json({
        success: true,
        previousQuantity: existingStock[0]?.quantity || 0,
        newQuantity,
        movementType: summaryType,
        movementQuantity: adjQty,
      })
    }
    
    // --- End ADJUSTMENT handling ---

    if (movementType === "OUT" || movementType === "REJECT") {
      if (qty < 0) {
        return NextResponse.json({ error: "Quantity must be positive for OUT/REJECT" }, { status: 400 })
      }
    }

    const existingStock = await db
      .select()
      .from(inventoryStock)
      .where(and(
        eq(inventoryStock.productId, productId),
        eq(inventoryStock.warehouseId, warehouseId)
      ))

    let newQuantity: number
    let stockId: string

    if (existingStock.length === 0) {
      if (movementType === "OUT" || movementType === "REJECT") {
        return NextResponse.json({ error: "Insufficient stock" }, { status: 400 })
      }
      const result = await db.insert(inventoryStock).values({
        productId,
        warehouseId,
        quantity: movementType === "OUT" || movementType === "REJECT" ? 0 : qty,
      }).returning()
      newQuantity = qty
      stockId = result[0].id
    } else {
      stockId = existingStock[0].id
      const currentQty = existingStock[0].quantity || 0
      
      if (movementType === "OUT" || movementType === "REJECT") {
        if (currentQty < qty) {
          return NextResponse.json({ error: "Insufficient stock" }, { status: 400 })
        }
        newQuantity = currentQty - qty
      } else {
        newQuantity = currentQty + qty
      }

      await db.update(inventoryStock)
        .set({ 
          quantity: newQuantity,
          updatedAt: new Date()
        })
        .where(eq(inventoryStock.id, stockId))
    }

    await db.insert(inventoryMovements).values({
      productId,
      warehouseId,
      type: movementType,
      quantity: movementType === "OUT" || movementType === "REJECT" ? -qty : qty,
      reference,
      referenceId,
      notes,
    })

    return NextResponse.json({
      success: true,
      previousQuantity: existingStock[0]?.quantity || 0,
      newQuantity,
      movementType,
      movementQuantity: movementType === "OUT" || movementType === "REJECT" ? -qty : qty,
    })
  } catch (error) {
    console.error("Error updating inventory:", error)
    return NextResponse.json({ error: "Failed to update inventory" }, { status: 500 })
  }
}
