import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { transfers, transferItems, inventoryStock, inventoryMovements } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const transfer = await db.select().from(transfers).where(eq(transfers.id, id))
    
    if (transfer.length === 0) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 })
    }

    const items = await db.select().from(transferItems).where(eq(transferItems.transferId, id))

    return NextResponse.json({ ...transfer[0], items })
  } catch (error) {
    console.error("Error fetching transfer:", error)
    return NextResponse.json({ error: "Failed to fetch transfer" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, notes } = body

    console.log(`[PUT /transfers/${id}] Received:`, { status, notes })

    const currentTransfer = await db.select().from(transfers).where(eq(transfers.id, id))
    if (currentTransfer.length === 0) {
      console.log(`[PUT /transfers/${id}] Transfer not found`)
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 })
    }

    const oldStatus = currentTransfer[0].status
    console.log(`[PUT /transfers/${id}] oldStatus: ${oldStatus}, newStatus: ${status}`)

    const updated = await db.update(transfers)
      .set({ status, notes, updatedAt: new Date() })
      .where(eq(transfers.id, id))
      .returning()

    if (updated.length === 0) {
      console.log(`[PUT /transfers/${id}] Update returned empty`)
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 })
    }

    console.log(`[PUT /transfers/${id}] Status updated to ${status}`)

    if (status === "COMPLETED" && oldStatus !== "COMPLETED") {
      const items = await db.select().from(transferItems).where(eq(transferItems.transferId, id))
      const transfer = currentTransfer[0]

      const itemsWithProductId = items.filter(item => item.productId && item.quantity)
      const itemsWithoutProductId = items.filter(item => !item.productId)
      
      if (itemsWithProductId.length === 0 && items.length > 0) {
        console.log(`[PUT /transfers/${id}] Info: Items exist but no valid productId, skipping inventory updates`)
      }
      if (itemsWithoutProductId.length > 0) {
        console.log(`[PUT /transfers/${id}] Warning: ${itemsWithoutProductId.length} items without productId will be skipped (no stock movement)`)
      }

      const failedItems: Array<{ productId: string | null; skuCode: string | null; quantity: number; reason: string }> = []
      const succeededItems: string[] = []

      for (const item of itemsWithProductId) {
        const productId = item.productId!
        const quantity = item.quantity!

        try {
          // Validate source stock before any mutation for this item
          if (transfer.fromWarehouseId) {
            const sourceStock = await db
              .select()
              .from(inventoryStock)
              .where(and(
                eq(inventoryStock.productId, productId),
                eq(inventoryStock.warehouseId, transfer.fromWarehouseId)
              ))

            if (sourceStock.length === 0 || (sourceStock[0].quantity ?? 0) < quantity) {
              console.log(`[PUT /transfers/${id}] Failed: insufficient stock for product ${productId}`)
              failedItems.push({
                productId,
                skuCode: item.skuCode || null,
                quantity,
                reason: `Insufficient stock: have ${sourceStock[0]?.quantity ?? 0}, need ${quantity}`,
              })
              continue
            }

            await db.update(inventoryStock)
              .set({ quantity: (sourceStock[0].quantity ?? 0) - quantity, updatedAt: new Date() })
              .where(eq(inventoryStock.id, sourceStock[0].id))

            await db.insert(inventoryMovements).values({
              productId,
              warehouseId: transfer.fromWarehouseId,
              type: "OUT",
              quantity: -quantity,
              reference: "TRANSFER",
              referenceId: id,
              notes: `Transfer ${transfer.transferNumber} - OUT`,
            })
          }

          if (transfer.toWarehouseId) {
            const destStock = await db
              .select()
              .from(inventoryStock)
              .where(and(
                eq(inventoryStock.productId, productId),
                eq(inventoryStock.warehouseId, transfer.toWarehouseId)
              ))

            if (destStock.length === 0) {
              await db.insert(inventoryStock).values({
                productId,
                warehouseId: transfer.toWarehouseId,
                quantity,
              })
            } else {
              await db.update(inventoryStock)
                .set({ quantity: (destStock[0].quantity ?? 0) + quantity, updatedAt: new Date() })
                .where(eq(inventoryStock.id, destStock[0].id))
            }

            await db.insert(inventoryMovements).values({
              productId,
              warehouseId: transfer.toWarehouseId,
              type: "IN",
              quantity: quantity,
              reference: "TRANSFER",
              referenceId: id,
              notes: `Transfer ${transfer.transferNumber} - IN`,
            })
          }

          succeededItems.push(productId)
        } catch (invError) {
          console.error(`[PUT /transfers/${id}] Inventory error for product ${productId}:`, invError)
          failedItems.push({
            productId,
            skuCode: item.skuCode || null,
            quantity,
            reason: String(invError),
          })
        }
      }

      // Handle productId-less items as failed (no stock movement possible)
      for (const item of itemsWithoutProductId) {
        failedItems.push({
          productId: null,
          skuCode: item.skuCode || null,
          quantity: item.quantity || 0,
          reason: "Missing productId - no stock movement possible",
        })
      }

      // If any items failed, revert status to IN_PROGRESS and inform caller
      if (failedItems.length > 0) {
        const hasPartialSuccess = succeededItems.length > 0
        const newStatus = hasPartialSuccess ? "IN_PROGRESS" : "PENDING"
        await db.update(transfers)
          .set({ status: newStatus, updatedAt: new Date() })
          .where(eq(transfers.id, id))
        
        console.log(`[PUT /transfers/${id}] Partial completion: ${succeededItems.length} succeeded, ${failedItems.length} failed -> status ${newStatus}`)

        return NextResponse.json({
          ...updated[0],
          status: newStatus,
          warning: `Transfer partially completed: ${failedItems.length} item(s) failed`,
          failedItems,
          succeededCount: succeededItems.length,
        })
      }
    }

    return NextResponse.json(updated[0])
  } catch (error) {
    console.error(`[PUT /transfers/${await params.then(p => p.id)}] Error:`, error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: `Failed to update transfer: ${errorMessage}` }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Delete transfer items first
    await db.delete(transferItems).where(eq(transferItems.transferId, id))
    
    // Delete transfer
    const deleted = await db.delete(transfers).where(eq(transfers.id, id)).returning()

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Transfer deleted successfully" })
  } catch (error) {
    console.error("Error deleting transfer:", error)
    return NextResponse.json({ error: "Failed to delete transfer" }, { status: 500 })
  }
}
