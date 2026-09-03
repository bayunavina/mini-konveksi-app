import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { jobOrders, products, masterSkus, productionAssignments, employees } from "@/db/schema"
import { eq, desc, sql, inArray } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const qcEmployeeId = searchParams.get("qcEmployeeId")
    const status = searchParams.get("status")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
    const offset = parseInt(searchParams.get("offset") || "0")

    // ensure job_order_costs exists
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS job_order_costs (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          job_order_id uuid REFERENCES job_orders(id) ON DELETE CASCADE NOT NULL,
          cost_category_code text NOT NULL,
          cost_category_name text,
          type text NOT NULL,
          estimated_amount integer DEFAULT 0 NOT NULL,
          actual_amount integer DEFAULT 0 NOT NULL,
          notes text,
          created_at timestamp DEFAULT NOW(),
          updated_at timestamp DEFAULT NOW()
        )
      `)
    } catch {}

    const baseQuery = db
      .select({
        id: jobOrders.id,
        joNumber: jobOrders.joNumber,
        qrCode: jobOrders.qrCode,
        targetQty: jobOrders.targetQty,
        completedQty: jobOrders.completedQty,
        rejectedQty: jobOrders.rejectedQty,
        status: jobOrders.status,
        dueDate: jobOrders.dueDate,
        notes: jobOrders.notes,
        createdAt: jobOrders.createdAt,
        qcEmployeeId: jobOrders.qcEmployeeId,
        productId: jobOrders.productId,
        productSku: sql<string | null>`COALESCE(${products.sku}, ${masterSkus.code})`,
        productName: sql<string | null>`COALESCE(${products.name}, ${masterSkus.name})`,
        employeeName: sql<string | null>`(
          SELECT e.name 
          FROM ${productionAssignments} pa 
          JOIN ${employees} e ON pa.employee_id = e.id 
          WHERE pa.job_order_id = ${jobOrders.id} 
          LIMIT 1
        )`,
        acceptedQty: sql<number | null>`(
          SELECT COALESCE(SUM(pa.accepted_qty), 0)
          FROM ${productionAssignments} pa
          WHERE pa.job_order_id = ${jobOrders.id}
        )`,
        hppEstimated: sql<number | null>`(
          SELECT COALESCE(SUM(estimated_amount),0) FROM job_order_costs WHERE job_order_id = ${jobOrders.id} AND type='DIRECT'
        )`,
        hppActual: sql<number | null>`(
          SELECT COALESCE(SUM(actual_amount),0) FROM job_order_costs WHERE job_order_id = ${jobOrders.id} AND type='DIRECT'
        )`,
      })
      .from(jobOrders)
      .leftJoin(products, eq(jobOrders.productId, products.id))
      .leftJoin(masterSkus, eq(jobOrders.productId, masterSkus.id))
      .orderBy(desc(jobOrders.createdAt))
      .limit(limit)
      .offset(offset)

    let results
    if (qcEmployeeId && status) {
      const statuses = status.split(",").map(s => s.trim().toUpperCase())
      if (statuses.length === 1) {
        results = await baseQuery.where(sql`${jobOrders.qcEmployeeId} = ${qcEmployeeId} AND ${jobOrders.status} = ${statuses[0]}`)
      } else {
        results = await baseQuery.where(sql`${jobOrders.qcEmployeeId} = ${qcEmployeeId} AND ${inArray(jobOrders.status, statuses)}`)
      }
    } else if (qcEmployeeId) {
      results = await baseQuery.where(eq(jobOrders.qcEmployeeId, qcEmployeeId))
    } else if (status) {
      const statuses = status.split(",").map(s => s.trim().toUpperCase())
      if (statuses.length === 1) {
        results = await baseQuery.where(eq(jobOrders.status, statuses[0] as "DRAFT" | "IN_PROGRESS" | "QC_PENDING" | "COMPLETED" | "CANCELLED"))
      } else {
        results = await baseQuery.where(inArray(jobOrders.status, statuses as ("DRAFT" | "IN_PROGRESS" | "QC_PENDING" | "COMPLETED" | "CANCELLED")[]))
      }
    } else {
      results = await baseQuery
    }

    const formatted = results.map(row => ({
      id: row.id,
      joNumber: row.joNumber,
      qrCode: (row as { qrCode?: string | null }).qrCode || null,
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
        sku: row.productSku || "-",
        name: row.productName || "-",
      } : null,
      employee: {
        name: row.employeeName || "-",
      },
      hppEstimated: (row as any).hppEstimated ?? 0,
      hppActual: (row as any).hppActual ?? 0,
      hppPerPcs: row.targetQty ? Math.round(Number((row as any).hppEstimated || 0) / row.targetQty) : 0,
    }))

    return NextResponse.json({
      data: formatted,
      pagination: {
        limit,
        offset,
        hasMore: formatted.length === limit,
      }
    })
  } catch (error) {
    console.error("Error fetching job orders:", error)
    return NextResponse.json({ error: "Failed to fetch job orders" }, { status: 500 })
  }
}

function generateJoNumber(): string {
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2)
  const month = (now.getMonth() + 1).toString().padStart(2, "0")
  const day = now.getDate().toString().padStart(2, "0")
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `JO${year}${month}${day}-${random}`
}

function generateJoQrCode(): string {
  const ts = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `JOQR-${ts}${rand}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { joNumber, productId, teamId, targetQty, dueDate, notes } = body

    console.log("Creating job order with data:", { joNumber, productId, teamId, targetQty, dueDate, notes })

    const generatedJoNumber = joNumber || generateJoNumber()
    const generatedQrCode = generateJoQrCode()

    const newJobOrder = await db.insert(jobOrders).values({
      joNumber: generatedJoNumber,
      qrCode: generatedQrCode,
      productId: productId || null,
      teamId: teamId || null,
      targetQty: targetQty || 0,
      dueDate: dueDate ? new Date(dueDate) : null,
      notes: notes || null,
      status: "DRAFT",
    }).returning()

    console.log("Job order created:", newJobOrder[0])
    return NextResponse.json(newJobOrder[0], { status: 201 })
  } catch (error) {
    console.error("Error creating job order:", error)
    return NextResponse.json({ error: "Failed to create job order", details: String(error) }, { status: 500 })
  }
}
