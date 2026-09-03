import { NextResponse } from "next/server"
import { db } from "@/db"
import { productionFromMaterials, productionAssignments, productionProgress, qcReports, inventoryStock, inventoryMovements, transfers, transferItems } from "@/db/schema"
import { sql } from "drizzle-orm"

export async function GET() {
  try {
    // --- Material ---
    const lotsResult = await db.execute(sql`SELECT initial_qty, quantity FROM material_lots`)
    const lots = lotsResult.rows as Array<{ initial_qty: number; quantity: number }>
    const materialInitial = lots.reduce((s, r) => s + (r.initial_qty || 0), 0)
    const materialRemaining = lots.reduce((s, r) => s + (r.quantity || 0), 0)
    const materialUsed = materialInitial - materialRemaining

    const prodLogs = await db.select().from(productionFromMaterials)
    const totalProduced = prodLogs.reduce((s, r) => s + (r.producedQty || 0), 0)

    // --- Production ---
    const assignments = await db.select().from(productionAssignments)
    const totalTarget = assignments.reduce((s, r) => s + (r.targetQty || 0), 0)
    const totalCompleted = assignments.reduce((s, r) => s + (r.completedQty || 0), 0)
    const totalRejected = assignments.reduce((s, r) => s + (r.rejectedQty || 0), 0)
    const totalPending = assignments.reduce((s, r) => s + (r.pendingQty || 0), 0)
    const totalAccepted = assignments.reduce((s, r) => s + (r.acceptedQty || 0), 0)

    const progressRows = await db.select().from(productionProgress)
    const totalProgress = progressRows.reduce((s, r) => s + (r.qtyCompleted || 0), 0)

    // --- QC ---
    const qcRows = await db.select().from(qcReports)
    const qcSuccess = qcRows.reduce((s, r) => s + (r.successQty || 0), 0)
    const qcReject = qcRows.reduce((s, r) => s + (r.rejectQty || 0), 0)
    const qcTotal = qcSuccess + qcReject

    // --- Stock ---
    const stockRows = await db.select().from(inventoryStock)
    const totalSystemStock = stockRows.reduce((s, r) => s + (r.quantity || 0), 0)

    const movements = await db.select().from(inventoryMovements)
    const totalComputedStock = movements.reduce((s, r) => s + (r.quantity || 0), 0)

    // --- Transfers ---
    const allTransfers = await db.select().from(transfers)
    const allItems = await db.select().from(transferItems)
    const totalTransferQty = allItems.reduce((s, r) => s + (r.quantity || 0), 0)
    const pendingTransfers = allTransfers.filter(t => t.status === "PENDING").length
    const completedTransfers = allTransfers.filter(t => t.status === "COMPLETED").length

    // --- Deviations ---
    const materialDeviation = Math.abs(materialUsed - totalProduced)
    const productionDeviation = assignments
      .filter(a => a.status === "COMPLETED")
      .reduce((s, a) => s + Math.abs((a.targetQty || 0) - ((a.completedQty || 0) + (a.rejectedQty || 0))), 0)
    const stockDeviation = Math.abs(totalSystemStock - totalComputedStock)
    const qcDeviation = qcTotal > 0 ? Math.abs(totalProduced - qcTotal) : 0

    const totalDeviation = materialDeviation + productionDeviation + stockDeviation

    const hasMaterialDeviation = materialDeviation > 0
    const hasProductionDeviation = productionDeviation > 0
    const hasStockDeviation = stockDeviation !== 0
    const hasQcDeviation = qcDeviation > 0

    return NextResponse.json({
      material: {
        initial: materialInitial,
        remaining: materialRemaining,
        used: materialUsed,
        produced: totalProduced,
        deviation: materialDeviation,
        status: hasMaterialDeviation ? "DEVIATED" : "BALANCED",
        lotsCount: lots.length,
      },
      production: {
        target: totalTarget,
        completed: totalCompleted,
        rejected: totalRejected,
        accepted: totalAccepted,
        pending: totalPending,
        progress: totalProgress,
        deviation: productionDeviation,
        status: hasProductionDeviation ? "DEVIATED" : "BALANCED",
        assignmentsCount: assignments.length,
      },
      qc: {
        success: qcSuccess,
        reject: qcReject,
        total: qcTotal,
        deviation: qcDeviation,
        status: hasQcDeviation ? "DEVIATED" : "BALANCED",
        reportsCount: qcRows.length,
      },
      stock: {
        system: totalSystemStock,
        computed: totalComputedStock,
        deviation: stockDeviation,
        status: hasStockDeviation ? "DEVIATED" : "BALANCED",
        stockRows: stockRows.length,
        movementsCount: movements.length,
      },
      transfer: {
        totalQty: totalTransferQty,
        pending: pendingTransfers,
        completed: completedTransfers,
        total: allTransfers.length,
        itemsCount: allItems.length,
      },
      overall: {
        totalDeviation,
        isBalanced: totalDeviation === 0 && stockDeviation === 0,
        deviatedModules: [
          hasMaterialDeviation ? "MATERIAL" : null,
          hasProductionDeviation ? "PRODUCTION" : null,
          hasStockDeviation ? "STOCK" : null,
          hasQcDeviation ? "QC" : null,
        ].filter(Boolean),
      },
    })
  } catch (error) {
    console.error("Error fetching balance summary:", error)
    return NextResponse.json({ error: "Failed to fetch balance summary" }, { status: 500 })
  }
}
