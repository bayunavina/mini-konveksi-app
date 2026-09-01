import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { jobOrders, products, teams, qcReports, employees } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ joNumber: string }> }
) {
  try {
    const { joNumber } = await params
    const results = await db
      .select({
        id: jobOrders.id,
        joNumber: jobOrders.joNumber,
        targetQty: jobOrders.targetQty,
        completedQty: jobOrders.completedQty,
        rejectedQty: jobOrders.rejectedQty,
        status: jobOrders.status,
        dueDate: jobOrders.dueDate,
        notes: jobOrders.notes,
        createdAt: jobOrders.createdAt,
        productId: products.id,
        productSku: products.sku,
        productName: products.name,
        teamId: teams.id,
        teamName: teams.name,
      })
      .from(jobOrders)
      .leftJoin(products, eq(jobOrders.productId, products.id))
      .leftJoin(teams, eq(jobOrders.teamId, teams.id))
      .where(eq(jobOrders.joNumber, joNumber))

    if (results.length === 0) {
      return NextResponse.json({ error: "Job order not found" }, { status: 404 })
    }

    const row = results[0]
    const qc = await db
      .select({
        id: qcReports.id,
        successQty: qcReports.successQty,
        rejectQty: qcReports.rejectQty,
        notes: qcReports.notes,
        createdAt: qcReports.createdAt,
        employeeName: employees.name,
      })
      .from(qcReports)
      .leftJoin(employees, eq(qcReports.employeeId, employees.id))
      .where(eq(qcReports.jobOrderId, row.id))
      .orderBy(qcReports.createdAt)

    const formatted = {
      id: row.id,
      joNumber: row.joNumber,
      targetQty: row.targetQty,
      completedQty: row.completedQty,
      rejectedQty: row.rejectedQty,
      status: row.status,
      dueDate: row.dueDate,
      notes: row.notes,
      createdAt: row.createdAt,
      product: row.productId ? {
        id: row.productId,
        sku: row.productSku,
        name: row.productName,
      } : null,
      team: row.teamId ? {
        id: row.teamId,
        name: row.teamName,
      } : null,
      reports: qc.map(r => ({
        id: r.id,
        date: r.createdAt,
        success: r.successQty,
        reject: r.rejectQty,
        notes: r.notes,
        reportedBy: r.employeeName,
      })),
    }

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Error fetching job order:", error)
    return NextResponse.json({ error: "Failed to fetch job order" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ joNumber: string }> }
) {
  try {
    const { joNumber } = await params
    const body = await request.json()

    const jo = await db
      .select({ id: jobOrders.id })
      .from(jobOrders)
      .where(eq(jobOrders.joNumber, joNumber))
      .limit(1)

    if (jo.length === 0) {
      return NextResponse.json({ error: "Job order not found" }, { status: 404 })
    }

    const joId = jo[0].id
    const { status, completedQty, rejectedQty, notes, targetQty, dueDate } = body

    const updateData: Record<string, unknown> = {}
    if (status !== undefined) updateData.status = status
    if (completedQty !== undefined) updateData.completedQty = completedQty
    if (rejectedQty !== undefined) updateData.rejectedQty = rejectedQty
    if (notes !== undefined) updateData.notes = notes
    if (targetQty !== undefined) updateData.targetQty = targetQty
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null

    const updated = await db
      .update(jobOrders)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(jobOrders.id, joId))
      .returning()

    return NextResponse.json(updated[0])
  } catch (error) {
    console.error("Error updating job order:", error)
    return NextResponse.json({ error: "Failed to update job order" }, { status: 500 })
  }
}
