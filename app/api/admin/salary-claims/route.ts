import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { productionSalary, productionAssignments, jobOrders, products, employees, productionLogs } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const status = searchParams.get("status")
        const employeeId = searchParams.get("employeeId")

        let results = await db
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
            })
            .from(productionSalary)
            .orderBy(desc(productionSalary.createdAt))

        if (employeeId) {
            results = results.filter(r => r.employeeId === employeeId)
        }

        if (status && status !== "all") {
            results = results.filter(r => r.status === status)
        }

        const enrichedResults = await Promise.all(
            results.map(async (r) => {
                const employee = await db
                    .select()
                    .from(employees)
                    .where(eq(employees.id, r.employeeId))
                    .limit(1)

                let joNumber = "-"
                let productName = "-"
                let targetQty = 0

                if (r.assignmentId) {
                    const assignment = await db
                        .select()
                        .from(productionAssignments)
                        .where(eq(productionAssignments.id, r.assignmentId))
                        .limit(1)

                    if (assignment.length > 0) {
                        targetQty = assignment[0].targetQty || 0

                        if (assignment[0].jobOrderId) {
                            const jo = await db
                                .select()
                                .from(jobOrders)
                                .where(eq(jobOrders.id, assignment[0].jobOrderId))
                                .limit(1)

                            if (jo.length > 0) {
                                joNumber = jo[0].joNumber

                                if (jo[0].productId) {
                                    const product = await db
                                        .select()
                                        .from(products)
                                        .where(eq(products.id, jo[0].productId))
                                        .limit(1)

                                    if (product.length > 0) {
                                        productName = product[0].name
                                    }
                                }
                            }
                        }
                    }
                }

                // Fallback: Get product info from productionLogs if still null
                if (productName === "-" && r.employeeId) {
                    const logs = await db
                        .select()
                        .from(productionLogs)
                        .where(eq(productionLogs.employeeId, r.employeeId))
                        .orderBy(desc(productionLogs.createdAt))
                        .limit(1)

                    if (logs.length > 0 && logs[0].jobOrderId) {
                        const logJo = await db
                            .select()
                            .from(jobOrders)
                            .where(eq(jobOrders.id, logs[0].jobOrderId))
                            .limit(1)

                        if (logJo.length > 0) {
                            if (joNumber === "-") {
                                joNumber = logJo[0].joNumber
                            }
                            if (logJo[0].productId) {
                                const logProduct = await db
                                    .select()
                                    .from(products)
                                    .where(eq(products.id, logJo[0].productId))
                                    .limit(1)
                                if (logProduct.length > 0) {
                                    productName = logProduct[0].name
                                }
                            }
                        }
                    }
                }

                return {
                    ...r,
                    employee: employee[0] || null,
                    joNumber,
                    productName,
                    targetQty,
                }
            })
        )

        return NextResponse.json(enrichedResults)
    } catch (error) {
        console.error("Error fetching salary claims:", error)
        return NextResponse.json({ error: "Failed to fetch salary claims" }, { status: 500 })
    }
}
