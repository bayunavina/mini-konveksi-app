import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { rejects, jobOrders, inventoryStock, inventoryMovements, warehouses } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await db.select().from(rejects).where(eq(rejects.id, id))
    
    if (result.length === 0) {
      return NextResponse.json({ error: "Reject not found" }, { status: 404 })
    }
    
    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error fetching reject:", error)
    return NextResponse.json({ error: "Failed to fetch reject" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, resolution, quantity, reason, description } = body

    const existing = await db.select().from(rejects).where(eq(rejects.id, id))
    if (existing.length === 0) {
      return NextResponse.json({ error: "Reject not found" }, { status: 404 })
    }

    if (existing[0].status !== "PENDING") {
      return NextResponse.json({ error: "Reject sudah diproses sebelumnya" }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (status !== undefined) updateData.status = status
    if (resolution !== undefined) updateData.resolution = resolution
    if (quantity !== undefined) updateData.quantity = quantity
    if (reason !== undefined) updateData.reason = reason
    if (description !== undefined) updateData.description = description

    if (status && ["APPROVED", "REWORK", "DISPOSED"].includes(status)) {
      updateData.resolvedAt = new Date()
    }

    const result = await db
      .update(rejects)
      .set(updateData)
      .where(eq(rejects.id, id))
      .returning()

    if (status === "APPROVED") {
      const reject = existing[0]
      
      // Update inventoryStock (fix: was writing to legacy `inventory` table)
      const defaultWarehouse = await db.select().from(warehouses).limit(1)
      if (defaultWarehouse.length > 0 && reject.productId) {
        const warehouseId = defaultWarehouse[0].id
        const existingStock = await db
          .select()
          .from(inventoryStock)
          .where(and(
            eq(inventoryStock.productId, reject.productId),
            eq(inventoryStock.warehouseId, warehouseId)
          ))

        if (existingStock.length > 0) {
          await db
            .update(inventoryStock)
            .set({
              quantity: (existingStock[0].quantity ?? 0) + reject.quantity,
              updatedAt: new Date(),
            })
            .where(eq(inventoryStock.id, existingStock[0].id))
        } else {
          await db.insert(inventoryStock).values({
            productId: reject.productId,
            warehouseId,
            quantity: reject.quantity,
          })
        }

        // Record movement for audit trail (positive qty, reject approved)
        await db.insert(inventoryMovements).values({
          productId: reject.productId,
          warehouseId,
          type: "REJECT",
          quantity: reject.quantity,
          reference: "REJECT",
          referenceId: id,
          notes: `Reject approved - JO ${reject.jobOrderId || "-"}`,
        })
      }

      // FIX: increment rejectedQty, not overwrite completedQty
      if (reject.jobOrderId) {
        const joData = await db.select().from(jobOrders).where(eq(jobOrders.id, reject.jobOrderId))
        if (joData.length > 0) {
          await db
            .update(jobOrders)
            .set({
              rejectedQty: (joData[0].rejectedQty || 0) + reject.quantity,
              updatedAt: new Date(),
            })
            .where(eq(jobOrders.id, reject.jobOrderId))
        }
      }
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating reject:", error)
    return NextResponse.json({ error: "Failed to update reject" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.delete(rejects).where(eq(rejects.id, id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting reject:", error)
    return NextResponse.json({ error: "Failed to delete reject" }, { status: 500 })
  }
}
