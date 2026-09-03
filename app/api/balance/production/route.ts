import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { productionAssignments, productionProgress, jobOrders, employees, materialLots } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")?.toLowerCase() || ""

    const assignments = await db
      .select({
        id: productionAssignments.id,
        jobOrderId: productionAssignments.jobOrderId,
        materialLotId: productionAssignments.materialLotId,
        employeeId: productionAssignments.employeeId,
        targetQty: productionAssignments.targetQty,
        completedQty: productionAssignments.completedQty,
        rejectedQty: productionAssignments.rejectedQty,
        acceptedQty: productionAssignments.acceptedQty,
        pendingQty: productionAssignments.pendingQty,
        status: productionAssignments.status,
        createdAt: productionAssignments.createdAt,
        employeeName: employees.name,
        joNumber: jobOrders.joNumber,
        lotNumber: materialLots.lotNumber,
      })
      .from(productionAssignments)
      .leftJoin(employees, eq(productionAssignments.employeeId, employees.id))
      .leftJoin(jobOrders, eq(productionAssignments.jobOrderId, jobOrders.id))
      .leftJoin(materialLots, eq(productionAssignments.materialLotId, materialLots.id))

    // Fetch progress totals per assignment
    const progressRows = await db.select().from(productionProgress)
    const progressByAssignment = new Map<string, { completed: number; rejected: number; count: number }>()
    for (const p of progressRows) {
      const prev = progressByAssignment.get(p.assignmentId) || { completed: 0, rejected: 0, count: 0 }
      progressByAssignment.set(p.assignmentId, {
        completed: prev.completed + (p.qtyCompleted || 0),
        rejected: prev.rejected + (p.qtyRejected || 0),
        count: prev.count + 1,
      })
    }

    let result = assignments.map(a => {
      const progress = progressByAssignment.get(a.id) || { completed: 0, rejected: 0, count: 0 }
      const target = a.targetQty || 0
      const completed = a.completedQty || 0
      const rejected = a.rejectedQty || 0
      const accepted = a.acceptedQty || 0
      const pending = a.pendingQty || 0
      const progressTotal = progress.completed

      // Expected: completed + rejected + pending should relate to target
      // Deviation 1: target vs (completed + rejected) — how much remains undone
      // Deviation 2: progressTotal vs pending+completed — progress should have been reflected
      // Main deviation: target vs (accepted + rejected + pending) ??? accepted is subset of completed
      // We define: deviation = target - (completed + rejected)  -- remaining to complete
      // But for balance, we check if completed + rejected exceeds target, or progress mismatches pending
      const assignmentDeviation = target - (completed + rejected)
      // progressDeviation: pending should equal progressTotal before QC, or 0 after
      const pendingVsProgress = progressTotal > 0 && pending === 0 && a.status === "COMPLETED" ? 0 : progressTotal - pending

      // For the report, we show: target, completed, rejected, accepted, pending, progress, deviation
      // Deviation flag if assignment is COMPLETED but completed+rejected != target (over/under)
      const isCompleted = a.status === "COMPLETED"
      const totalDeviation = isCompleted ? Math.abs(assignmentDeviation) : 0
      // Also flag if progress log total differs significantly from assignment completed+pending
      const hasProgressMismatch = progress.count > 0 && Math.abs(progressTotal - (completed + pending)) > 1 && !isCompleted

      const status = totalDeviation > 0 || hasProgressMismatch ? "DEVIATED" : "BALANCED"

      return {
        id: a.id,
        joNumber: a.joNumber || "-",
        lotNumber: a.lotNumber || "-",
        employeeName: a.employeeName || "-",
        employeeId: a.employeeId,
        jobOrderId: a.jobOrderId,
        materialLotId: a.materialLotId,
        targetQty: target,
        completedQty: completed,
        rejectedQty: rejected,
        acceptedQty: accepted,
        pendingQty: pending,
        progressTotal,
        progressCount: progress.count,
        status: a.status || "ASSIGNED",
        assignmentDeviation,
        progressDeviation: pendingVsProgress,
        totalDeviation,
        balanceStatus: status,
        hasProgressMismatch,
        createdAt: a.createdAt,
      }
    })

    if (search) {
      result = result.filter(r =>
        r.joNumber.toLowerCase().includes(search) ||
        r.lotNumber.toLowerCase().includes(search) ||
        r.employeeName.toLowerCase().includes(search)
      )
    }

    const summary = {
      total: result.length,
      balanced: result.filter(r => r.balanceStatus === "BALANCED").length,
      deviated: result.filter(r => r.balanceStatus === "DEVIATED").length,
      totalDeviation: result.reduce((s, r) => s + Math.abs(r.totalDeviation), 0),
      totalTarget: result.reduce((s, r) => s + r.targetQty, 0),
      totalCompleted: result.reduce((s, r) => s + r.completedQty, 0),
      totalRejected: result.reduce((s, r) => s + r.rejectedQty, 0),
      totalPending: result.reduce((s, r) => s + r.pendingQty, 0),
    }

    return NextResponse.json({ data: result, summary })
  } catch (error) {
    console.error("Error fetching production balance:", error)
    return NextResponse.json({ error: "Failed to fetch production balance" }, { status: 500 })
  }
}
