import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { productionSalary, productionAssignments, jobOrders, products, employees, materialLots } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const salaryId = searchParams.get("salaryId")
        const assignmentId = searchParams.get("assignmentId")

        if (!salaryId && !assignmentId) {
            return NextResponse.json({ error: "salaryId or assignmentId is required" }, { status: 400 })
        }

        let salaryRecord = null
        let actualAssignmentId = assignmentId

        // If salaryId is provided, find the salary record
        if (salaryId) {
            const salaryResult = await db
                .select()
                .from(productionSalary)
                .where(eq(productionSalary.id, salaryId))
                .limit(1)

            if (salaryResult.length === 0) {
                return NextResponse.json({ error: "Salary record not found" }, { status: 404 })
            }

            salaryRecord = salaryResult[0]

            // Check status
            if (salaryRecord.status !== "APPROVED" && salaryRecord.status !== "PAID") {
                return NextResponse.json({ error: "Gaji belum disetujui oleh admin" }, { status: 400 })
            }

            actualAssignmentId = salaryRecord.assignmentId
        }

        // Get employee info
        let employee = null
        if (salaryRecord?.employeeId) {
            const empResult = await db
                .select()
                .from(employees)
                .where(eq(employees.id, salaryRecord.employeeId))
                .limit(1)
            employee = empResult[0]
        }

        let joNumber = "Manual"
        let productName = "Produk Manual"
        let productSku = "-"
        let targetQty = 0
        let completedQty = 0
        let rejectedQty = 0
        let acceptedQty = 0
        let ratePerUnit = 0
        let totalSalary = 0

        // Get data from assignment
        if (actualAssignmentId) {
            const assignment = await db
                .select()
                .from(productionAssignments)
                .where(eq(productionAssignments.id, actualAssignmentId))
                .limit(1)

            if (assignment.length > 0) {
                targetQty = assignment[0].targetQty || 0
                completedQty = assignment[0].completedQty || 0
                rejectedQty = assignment[0].rejectedQty || 0
                acceptedQty = assignment[0].acceptedQty || 0
                ratePerUnit = parseFloat(assignment[0].ratePerUnit || "0")

                if (salaryRecord) {
                    totalSalary = parseFloat(salaryRecord.totalSalary?.toString() || "0")
                } else {
                    totalSalary = acceptedQty * ratePerUnit
                }

                // Get job order info
                if (assignment[0].jobOrderId) {
                    const jo = await db
                        .select()
                        .from(jobOrders)
                        .where(eq(jobOrders.id, assignment[0].jobOrderId))
                        .limit(1)

                    if (jo.length > 0) {
                        joNumber = jo[0].joNumber || "Manual"

                        if (jo[0].productId) {
                            const product = await db
                                .select()
                                .from(products)
                                .where(eq(products.id, jo[0].productId))
                                .limit(1)

                            if (product.length > 0) {
                                productName = product[0].name
                                productSku = product[0].sku || "-"
                            }
                        }
                    }
                } else if (assignment[0].materialLotId) {
                    // Get product from material lot
                    const lot = await db
                        .select()
                        .from(materialLots)
                        .where(eq(materialLots.id, assignment[0].materialLotId))
                        .limit(1)

                    if (lot.length > 0 && lot[0].productId) {
                        const product = await db
                            .select()
                            .from(products)
                            .where(eq(products.id, lot[0].productId))
                            .limit(1)

                        if (product.length > 0) {
                            productName = product[0].name
                            productSku = product[0].sku || "-"
                        }
                    }
                }
            }
        }

        return NextResponse.json({
            salary: salaryRecord,
            employee: employee,
            joNumber,
            productName,
            productSku,
            targetQty,
            completedQty,
            rejectedQty,
            acceptedQty,
            ratePerUnit,
            totalSalary,
        })
    } catch (error) {
        console.error("Error exporting salary slip:", error)
        return NextResponse.json({ error: "Failed to export salary slip: " + String(error) }, { status: 500 })
    }
}