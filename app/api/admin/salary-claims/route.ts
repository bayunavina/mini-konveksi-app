import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import {
  productionSalary,
  productionAssignments,
  jobOrders,
  products,
  employees,
  masterSkus,
} from "@/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const employeeId = searchParams.get("employeeId")

    // Single JOIN query - eliminates N+1 problem
    const rows = await db
      .select({
        id: productionSalary.id,
        totalCompleted: productionSalary.totalCompleted,
        totalRejected: productionSalary.totalRejected,
        totalAccepted: productionSalary.totalAccepted,
        ratePerUnit: productionSalary.ratePerUnit,
        totalSalary: productionSalary.totalSalary,
        status: productionSalary.status,
        paidAt: productionSalary.paidAt,
        createdAt: productionSalary.createdAt,
        assignmentId: productionSalary.assignmentId,
        employeeId: productionSalary.employeeId,
        employeeId2: employees.id,
        employeeName: employees.name,
        employeeEmail: employees.email,
        targetQty: productionAssignments.targetQty,
        joNumber: jobOrders.joNumber,
        productName: products.name,
        productSku: products.sku,
        masterSkuName: masterSkus.name,
        masterSkuCode: masterSkus.code,
      })
      .from(productionSalary)
      .leftJoin(employees, eq(productionSalary.employeeId, employees.id))
      .leftJoin(productionAssignments, eq(productionSalary.assignmentId, productionAssignments.id))
      .leftJoin(jobOrders, eq(productionAssignments.jobOrderId, jobOrders.id))
      .leftJoin(products, eq(jobOrders.productId, products.id))
      .leftJoin(masterSkus, eq(jobOrders.productId, masterSkus.id))
      .orderBy(desc(productionSalary.createdAt))

    // Filter di JS
    let filtered = rows
    if (status && status !== "all") {
      filtered = filtered.filter(r => r.status === status)
    }
    if (employeeId) {
      filtered = filtered.filter(r => r.employeeId === employeeId)
    }

    const results = filtered.map(r => ({
      id: r.id,
      totalCompleted: r.totalCompleted,
      totalRejected: r.totalRejected,
      totalAccepted: r.totalAccepted,
      ratePerUnit: r.ratePerUnit,
      totalSalary: r.totalSalary,
      status: r.status,
      paidAt: r.paidAt,
      createdAt: r.createdAt,
      assignmentId: r.assignmentId,
      employeeId: r.employeeId,
      employee: r.employeeId2
        ? { id: r.employeeId2, name: r.employeeName || "", email: r.employeeEmail || "" }
        : null,
      joNumber: r.joNumber || "-",
      productName: r.productName || r.masterSkuName || "-",
      targetQty: r.targetQty || 0,
    }))

    return NextResponse.json(results)
  } catch (error) {
    console.error("Error fetching salary claims:", error)
    return NextResponse.json({ error: "Failed to fetch salary claims" }, { status: 500 })
  }
}
