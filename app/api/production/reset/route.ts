import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { 
  productionAssignments, 
  productionProgress, 
  qcReports, 
  rejects, 
  jobOrders, 
  materialLots,
  notifications,
  inventoryMovements
} from "@/db/schema"
import { eq, inArray } from "drizzle-orm"

export async function DELETE(_request: NextRequest) {
  try {
    // Get all job orders
    const allJobOrders = await db.select({ id: jobOrders.id }).from(jobOrders)
    
    if (allJobOrders.length === 0) {
      return NextResponse.json({ success: true, message: "Tidak ada data produksi untuk di-reset" })
    }

    const jobOrderIds = allJobOrders.map(jo => jo.id)

    // Get all QC reports for these job orders
    const allQcReports = await db
      .select({ id: qcReports.id })
      .from(qcReports)
      .where(inArray(qcReports.jobOrderId, jobOrderIds))
    
    const qcReportIds = allQcReports.map(qc => qc.id)

    // Delete rejects related to QC reports
    if (qcReportIds.length > 0) {
      await db.delete(rejects).where(inArray(rejects.qcReportId, qcReportIds))
    }

    // Get all production assignments
    const allAssignments = await db
      .select({ id: productionAssignments.id })
      .from(productionAssignments)
      .where(inArray(productionAssignments.jobOrderId, jobOrderIds))
    
    const assignmentIds = allAssignments.map(a => a.id)

    // Delete production progress for each assignment
    if (assignmentIds.length > 0) {
      await db.delete(productionProgress).where(inArray(productionProgress.assignmentId, assignmentIds))
    }

    // Delete production assignments
    await db.delete(productionAssignments).where(inArray(productionAssignments.jobOrderId, jobOrderIds))

    // Delete QC reports
    await db.delete(qcReports).where(inArray(qcReports.jobOrderId, jobOrderIds))

    // Reset job orders: set completedQty=0, rejectedQty=0, status=DRAFT (ready for new production cycle)
    await db
      .update(jobOrders)
      .set({
        completedQty: 0,
        rejectedQty: 0,
        status: "DRAFT",
        updatedAt: new Date()
      })
      .where(inArray(jobOrders.id, jobOrderIds))

    // Reset material lots: quantity = initialQty
    const allLots = await db.select({ id: materialLots.id, initialQty: materialLots.initialQty }).from(materialLots)
    for (const lot of allLots) {
      if (lot.initialQty !== null) {
        await db
          .update(materialLots)
          .set({ 
            quantity: lot.initialQty,
            status: "AVAILABLE",
            isReadyForProduction: true,
            updatedAt: new Date()
          })
          .where(eq(materialLots.id, lot.id))
      }
    }

    // Delete notifications related to production
    await db.delete(notifications).where(inArray(notifications.referenceId, jobOrderIds))

    // Delete inventory movements related to QC
    if (qcReportIds.length > 0) {
      await db.delete(inventoryMovements).where(inArray(inventoryMovements.referenceId, qcReportIds))
    }

    // Delete inventory stock from QC (finished goods and rejects)
    // This is tricky - we'll skip this as it may affect other data

    return NextResponse.json({ 
      success: true, 
      message: `Reset ${jobOrderIds.length} job order, ${assignmentIds.length} assignments, ${qcReportIds.length} QC reports berhasil`
    })
  } catch (error) {
    console.error("Error resetting production data:", error)
    return NextResponse.json({ error: "Failed to reset production data" }, { status: 500 })
  }
}