import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { productionFromMaterials, productionAssignments, qcReports } from "@/db/schema"
import { sql } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")?.toLowerCase() || ""

    // Fetch material lots with product info
    const lotsResult = await db.execute(sql`
      SELECT 
        ml.id,
        ml.lot_number as "lotNumber",
        ml.qr_code as "qrCode",
        ml.quantity,
        ml.initial_qty as "initialQty",
        ml.status,
        ml.notes,
        ml.created_at as "createdAt",
        ms.code as "skuCode",
        ms.name as "skuName"
      FROM material_lots ml
      LEFT JOIN master_skus ms ON ml.product_id = ms.id
      ORDER BY ml.created_at DESC
    `)
    const lots = lotsResult.rows as Array<{
      id: string
      lotNumber: string
      qrCode: string
      quantity: number
      initialQty: number
      status: string
      notes: string | null
      createdAt: string
      skuCode: string | null
      skuName: string | null
    }>

    // Fetch production logs per lot
    const productionLogs = await db.select().from(productionFromMaterials)
    const producedByLot = new Map<string, number>()
    for (const log of productionLogs) {
      producedByLot.set(log.lotId, (producedByLot.get(log.lotId) || 0) + (log.producedQty || 0))
    }

    // Fetch assignments to link lot -> jobOrders
    const assignments = await db.select({
      materialLotId: productionAssignments.materialLotId,
      jobOrderId: productionAssignments.jobOrderId,
    }).from(productionAssignments)

    const jobOrderIdsByLot = new Map<string, Set<string>>()
    for (const a of assignments) {
      if (!a.materialLotId || !a.jobOrderId) continue
      if (!jobOrderIdsByLot.has(a.materialLotId)) jobOrderIdsByLot.set(a.materialLotId, new Set())
      jobOrderIdsByLot.get(a.materialLotId)!.add(a.jobOrderId)
    }

    // Fetch QC reports
    const qcData = await db.select({
      jobOrderId: qcReports.jobOrderId,
      successQty: qcReports.successQty,
      rejectQty: qcReports.rejectQty,
    }).from(qcReports)

    const qcByJo = new Map<string, { success: number; reject: number }>()
    for (const qc of qcData) {
      if (!qc.jobOrderId) continue
      const prev = qcByJo.get(qc.jobOrderId) || { success: 0, reject: 0 }
      qcByJo.set(qc.jobOrderId, {
        success: prev.success + (qc.successQty || 0),
        reject: prev.reject + (qc.rejectQty || 0),
      })
    }

    let result = lots.map(lot => {
      const usedQty = (lot.initialQty || 0) - (lot.quantity || 0)
      const producedQty = producedByLot.get(lot.id) || 0

      // QC totals for this lot via jobOrders
      const joIds = jobOrderIdsByLot.get(lot.id)
      let qcSuccess = 0
      let qcReject = 0
      if (joIds) {
        for (const joId of joIds) {
          const qc = qcByJo.get(joId)
          if (qc) {
            qcSuccess += qc.success
            qcReject += qc.reject
          }
        }
      }

      // Deviation: used should equal produced (material consumed == produced)
      const lotDeviation = usedQty - producedQty
      // QC deviation: produced vs QC total (if QC done, should cover produced)
      const qcTotal = qcSuccess + qcReject
      // Only count QC deviation if QC exists; else 0
      const qcDeviation = qcTotal > 0 ? producedQty - qcTotal : 0

      const status = lotDeviation !== 0 || qcDeviation !== 0 ? "DEVIATED" : "BALANCED"

      return {
        id: lot.id,
        lotNumber: lot.lotNumber,
        qrCode: lot.qrCode,
        skuCode: lot.skuCode,
        skuName: lot.skuName,
        initialQty: lot.initialQty || 0,
        quantity: lot.quantity || 0,
        usedQty,
        producedQty,
        qcSuccess,
        qcReject,
        qcTotal,
        lotDeviation,
        qcDeviation,
        totalDeviation: lotDeviation + qcDeviation,
        status,
        lotStatus: lot.status,
        createdAt: lot.createdAt,
      }
    })

    if (search) {
      result = result.filter(r =>
        r.lotNumber.toLowerCase().includes(search) ||
        r.qrCode.toLowerCase().includes(search) ||
        (r.skuCode || "").toLowerCase().includes(search) ||
        (r.skuName || "").toLowerCase().includes(search)
      )
    }

    const summary = {
      total: result.length,
      balanced: result.filter(r => r.status === "BALANCED").length,
      deviated: result.filter(r => r.status === "DEVIATED").length,
      totalDeviation: result.reduce((s, r) => s + Math.abs(r.totalDeviation), 0),
    }

    return NextResponse.json({ data: result, summary })
  } catch (error) {
    console.error("Error fetching material balance:", error)
    return NextResponse.json({ error: "Failed to fetch material balance" }, { status: 500 })
  }
}
