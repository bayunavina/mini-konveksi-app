import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { jobOrders, products, teams, qcReports, employees, notifications, productionAssignments, productionLogs, rejects, productionProgress } from "@/db/schema"
import { eq, sql } from "drizzle-orm"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Check if id is a UUID or JO number
    const isUUID = id.includes("-") && id.length === 36
    
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
        qcEmployeeId: jobOrders.qcEmployeeId,
        productId: products.id,
        productSku: products.sku,
        productName: products.name,
        teamId: teams.id,
        teamName: teams.name,
        acceptedQty: sql<number>`(
          SELECT COALESCE(SUM(pa.accepted_qty), 0)
          FROM ${productionAssignments} pa
          WHERE pa.job_order_id = ${jobOrders.id}
        )`,
      })
      .from(jobOrders)
      .leftJoin(products, eq(jobOrders.productId, products.id))
      .leftJoin(teams, eq(jobOrders.teamId, teams.id))
      .where(isUUID ? eq(jobOrders.id, id) : eq(jobOrders.joNumber, id))

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
      qcEmployeeId: row.qcEmployeeId,
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, completedQty, rejectedQty, notes, qcEmployeeId } = body

    // Find job order by ID or JO number
    const isUUID = id.includes("-") && id.length === 36
    const findCondition = isUUID ? eq(jobOrders.id, id) : eq(jobOrders.joNumber, id)
    const existingJO = await db.select({ id: jobOrders.id, joNumber: jobOrders.joNumber }).from(jobOrders).where(findCondition).limit(1)
    
    if (existingJO.length === 0) {
      return NextResponse.json({ error: "Job order not found" }, { status: 404 })
    }

    const actualId = existingJO[0].id
    const joNumber = existingJO[0].joNumber
    const updateData: Record<string, unknown> = {}
    if (status !== undefined) updateData.status = status
    if (completedQty !== undefined) updateData.completedQty = completedQty
    if (rejectedQty !== undefined) updateData.rejectedQty = rejectedQty
    if (notes !== undefined) updateData.notes = notes
    if (qcEmployeeId !== undefined) updateData.qcEmployeeId = qcEmployeeId

    // If status changed to CANCELLED, also delete related notifications
    if (status === "CANCELLED") {
      // Delete notifications by referenceId (could be UUID or JO number)
      await db.delete(notifications).where(eq(notifications.referenceId, actualId))
      await db.delete(notifications).where(eq(notifications.referenceId, joNumber))
    }

    const updated = await db
      .update(jobOrders)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(jobOrders.id, actualId))
      .returning()

    return NextResponse.json(updated[0])
  } catch (error) {
    console.error("Error updating job order:", error)
    return NextResponse.json({ error: "Failed to update job order" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Find job order by ID or JO number
    const isUUID = id.includes("-") && id.length === 36
    const findCondition = isUUID ? eq(jobOrders.id, id) : eq(jobOrders.joNumber, id)
    const existingJO = await db.select({ id: jobOrders.id, joNumber: jobOrders.joNumber }).from(jobOrders).where(findCondition).limit(1)
    
    if (existingJO.length === 0) {
      return NextResponse.json({ error: "Job order not found" }, { status: 404 })
    }

    const actualId = existingJO[0].id
    const joNumber = existingJO[0].joNumber

    // Get all production assignments for this job order
    const assignments = await db
      .select({ id: productionAssignments.id })
      .from(productionAssignments)
      .where(eq(productionAssignments.jobOrderId, actualId))

    // Delete production progress for each assignment
    for (const assignment of assignments) {
      await db.delete(productionProgress).where(eq(productionProgress.assignmentId, assignment.id))
    }

    // Get QC report IDs for this job order
    const qcReportsToDelete = await db
      .select({ id: qcReports.id })
      .from(qcReports)
      .where(eq(qcReports.jobOrderId, actualId))

    // Delete rejects first (they reference qc_reports via qc_report_id)
    if (qcReportsToDelete.length > 0) {
      const qcReportIds = qcReportsToDelete.map(r => r.id)
      for (const qcId of qcReportIds) {
        await db.delete(rejects).where(eq(rejects.qcReportId, qcId))
      }
    }

    // Delete QC reports
    await db.delete(qcReports).where(eq(qcReports.jobOrderId, actualId))

    // Delete production assignments
    await db.delete(productionAssignments).where(eq(productionAssignments.jobOrderId, actualId))

    // Delete production logs
    await db.delete(productionLogs).where(eq(productionLogs.jobOrderId, actualId))

    // Delete related notifications (by UUID or JO number)
    await db.delete(notifications).where(eq(notifications.referenceId, actualId))
    await db.delete(notifications).where(eq(notifications.referenceId, joNumber))

    // Delete the job order
    await db.delete(jobOrders).where(eq(jobOrders.id, actualId))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting job order:", error)
    return NextResponse.json({ error: "Failed to delete job order" }, { status: 500 })
  }
}
