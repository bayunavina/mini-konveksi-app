import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { jobOrders, products, teams, productionAssignments, employees } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const qcEmployeeId = searchParams.get("qcEmployeeId")

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
        employeeId: employees.id,
        employeeName: employees.name,
      })
      .from(jobOrders)
      .leftJoin(products, eq(jobOrders.productId, products.id))
      .leftJoin(teams, eq(jobOrders.teamId, teams.id))
      .leftJoin(productionAssignments, eq(productionAssignments.jobOrderId, jobOrders.id))
      .leftJoin(employees, eq(productionAssignments.employeeId, employees.id))
      .orderBy(desc(jobOrders.createdAt))

    let filteredResults = results

    if (qcEmployeeId) {
      filteredResults = results.filter(r => r.qcEmployeeId === qcEmployeeId)
    }

    const enrichedResults = filteredResults.map(row => {
      const completed = row.completedQty || 0
      const rejected = row.rejectedQty || 0

      return {
        id: row.id,
        joNumber: row.joNumber,
        targetQty: row.targetQty,
        completedQty: completed,
        rejectedQty: rejected,
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
        employee: row.employeeId ? {
          id: row.employeeId,
          name: row.employeeName,
        } : null,
      }
    })

    return NextResponse.json(enrichedResults)
  } catch (error) {
    console.error("Error fetching QC job orders:", error)
    return NextResponse.json({ error: "Failed to fetch job orders" }, { status: 500 })
  }
}
