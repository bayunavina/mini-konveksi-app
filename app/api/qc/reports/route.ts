import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { qcReports, jobOrders, employees } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const qcEmployeeId = searchParams.get("qcEmployeeId")

    const results = await db
      .select({
        id: qcReports.id,
        successQty: qcReports.successQty,
        rejectQty: qcReports.rejectQty,
        notes: qcReports.notes,
        createdAt: qcReports.createdAt,
        jobOrder: {
          id: jobOrders.id,
          joNumber: jobOrders.joNumber,
          qcEmployeeId: jobOrders.qcEmployeeId,
        },
        employee: {
          id: employees.id,
          name: employees.name,
        },
      })
      .from(qcReports)
      .leftJoin(jobOrders, eq(qcReports.jobOrderId, jobOrders.id))
      .leftJoin(employees, eq(qcReports.employeeId, employees.id))
      .orderBy(desc(qcReports.createdAt))

    let filteredResults = results

    if (qcEmployeeId) {
      filteredResults = results.filter(r => r.jobOrder?.qcEmployeeId === qcEmployeeId)
    }

    return NextResponse.json(filteredResults)
  } catch (error) {
    console.error("Error fetching QC reports:", error)
    return NextResponse.json({ error: "Failed to fetch QC reports" }, { status: 500 })
  }
}
