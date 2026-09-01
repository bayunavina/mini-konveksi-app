import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { rejects, jobOrders, inventory, warehouses } from "@/db/schema"
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
      
      const defaultWarehouse = await db.select().from(warehouses).limit(1)
      if (defaultWarehouse.length > 0 && reject.productId) {
        const existingInventory = await db
          .select()
          .from(inventory)
          .where(and(
            eq(inventory.productId, reject.productId),
            eq(inventory.warehouseId, defaultWarehouse[0].id)
          ))

        const existingInv = existingInventory[0]
        if (existingInv && existingInv.quantity !== null) {
          await db
            .update(inventory)
            .set({
              quantity: existingInv.quantity + reject.quantity,
              updatedAt: new Date(),
            })
            .where(eq(inventory.id, existingInv.id))
        } else {
          await db.insert(inventory).values({
            productId: reject.productId,
            warehouseId: defaultWarehouse[0].id,
            quantity: reject.quantity,
          })
        }
      }

      if (reject.jobOrderId) {
        await db
          .update(jobOrders)
          .set({
            completedQty: reject.quantity,
            updatedAt: new Date(),
          })
          .where(eq(jobOrders.id, reject.jobOrderId))
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
