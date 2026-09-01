import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { rejects, jobOrders, products, qcReports } from "@/db/schema"
import { eq, desc, isNotNull } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const jobOrderId = searchParams.get("jobOrderId")

    // Get rejects from rejects table
    const rejectsResults = await db
      .select({
        id: rejects.id,
        quantity: rejects.quantity,
        unit: rejects.unit,
        reason: rejects.reason,
        description: rejects.description,
        status: rejects.status,
        resolution: rejects.resolution,
        resolvedBy: rejects.resolvedBy,
        resolvedAt: rejects.resolvedAt,
        createdAt: rejects.createdAt,
        jobOrderId: jobOrders.id,
        jobOrderNumber: jobOrders.joNumber,
        productId: products.id,
        productSku: products.sku,
        productName: products.name,
        qcReportId: rejects.qcReportId,
      })
      .from(rejects)
      .leftJoin(jobOrders, eq(rejects.jobOrderId, jobOrders.id))
      .leftJoin(products, eq(rejects.productId, products.id))
      .orderBy(desc(rejects.createdAt))

    // Get rejects from QC reports where rejectQty > 0
    const qcRejectsResults = await db
      .select({
        id: qcReports.id,
        quantity: qcReports.rejectQty,
        notes: qcReports.notes,
        createdAt: qcReports.createdAt,
        jobOrderId: jobOrders.id,
        jobOrderNumber: jobOrders.joNumber,
        productId: products.id,
        productSku: products.sku,
        productName: products.name,
      })
      .from(qcReports)
      .leftJoin(jobOrders, eq(qcReports.jobOrderId, jobOrders.id))
      .leftJoin(products, eq(jobOrders.productId, products.id))
      .where(isNotNull(qcReports.rejectQty))
      .orderBy(desc(qcReports.createdAt))

    // Combine and format results
    let results = [
      ...rejectsResults.map(row => ({
        id: row.id,
        quantity: row.quantity,
        unit: row.unit || "Pcs",
        reason: row.reason || "Tidak lolos QC",
        description: row.description,
        status: row.status || "PENDING",
        resolution: row.resolution,
        resolvedBy: row.resolvedBy,
        resolvedAt: row.resolvedAt,
        createdAt: row.createdAt,
        jobOrder: row.jobOrderId ? {
          id: row.jobOrderId,
          joNumber: row.jobOrderNumber,
        } : null,
        product: row.productId ? {
          id: row.productId,
          sku: row.productSku,
          name: row.productName,
        } : null,
        source: "rejects" as const,
      })),
      ...qcRejectsResults
        .filter(r => (r.quantity || 0) > 0)
        .map(row => ({
          id: `qc-${row.id}`,
          quantity: row.quantity,
          unit: "Pcs",
          reason: row.notes || "Tidak lolos QC",
          description: row.notes,
          status: "PENDING" as const,
          createdAt: row.createdAt,
          jobOrder: row.jobOrderId ? {
            id: row.jobOrderId,
            joNumber: row.jobOrderNumber,
          } : null,
          product: row.productId ? {
            id: row.productId,
            sku: row.productSku,
            name: row.productName,
          } : null,
          source: "qc_reports" as const,
        }))
    ]

    if (status) {
      results = results.filter(r => r.status === status)
    }

    if (jobOrderId) {
      results = results.filter(r => r.jobOrder?.id === jobOrderId)
    }

    // Sort by createdAt descending
    results.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())

    return NextResponse.json(results)
  } catch (error) {
    console.error("Error fetching rejects:", error)
    return NextResponse.json({ error: "Failed to fetch rejects" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobOrderId, productId, qcReportId, quantity, unit, reason, description } = body

    const newReject = await db.insert(rejects).values({
      jobOrderId,
      productId,
      qcReportId,
      quantity,
      unit: unit || "Lusin",
      reason,
      description,
      status: "PENDING",
    }).returning()

    return NextResponse.json(newReject[0], { status: 201 })
  } catch (error) {
    console.error("Error creating reject:", error)
    return NextResponse.json({ error: "Failed to create reject" }, { status: 500 })
  }
}
