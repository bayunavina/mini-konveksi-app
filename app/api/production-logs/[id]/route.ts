import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { productionLogs, employees, jobOrders } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const result = await db.select({
      id: productionLogs.id,
      employeeId: productionLogs.employeeId,
      jobOrderId: productionLogs.jobOrderId,
      completedQty: productionLogs.completedQty,
      unit: productionLogs.unit,
      periodWeek: productionLogs.periodWeek,
      periodYear: productionLogs.periodYear,
      notes: productionLogs.notes,
      createdAt: productionLogs.createdAt,
      employee: {
        id: employees.id,
        name: employees.name,
      },
      jobOrder: {
        id: jobOrders.id,
        joNumber: jobOrders.joNumber,
      },
    })
    .from(productionLogs)
    .leftJoin(employees, eq(productionLogs.employeeId, employees.id))
    .leftJoin(jobOrders, eq(productionLogs.jobOrderId, jobOrders.id))
    .where(eq(productionLogs.id, id))
    
    if (result.length === 0) {
      return NextResponse.json({ error: "Production log not found" }, { status: 404 })
    }
    
    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error fetching production log:", error)
    return NextResponse.json({ error: "Failed to fetch production log" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { completedQty, unit, periodWeek, periodYear, notes } = body

    const updateData: Record<string, unknown> = {}
    if (completedQty !== undefined) updateData.completedQty = parseInt(completedQty)
    if (unit !== undefined) updateData.unit = unit
    if (periodWeek !== undefined) updateData.periodWeek = periodWeek
    if (periodYear !== undefined) updateData.periodYear = parseInt(periodYear)
    if (notes !== undefined) updateData.notes = notes

    const result = await db.update(productionLogs)
      .set(updateData)
      .where(eq(productionLogs.id, id))
      .returning()

    if (result.length === 0) {
      return NextResponse.json({ error: "Production log not found" }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating production log:", error)
    return NextResponse.json({ error: "Failed to update production log" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.delete(productionLogs).where(eq(productionLogs.id, id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting production log:", error)
    return NextResponse.json({ error: "Failed to delete production log" }, { status: 500 })
  }
}
