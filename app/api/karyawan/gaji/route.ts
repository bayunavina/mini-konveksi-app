import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { productionAssignments, jobOrders, products, qcReports, productionSalary } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const employeeId = searchParams.get("employeeId")

        if (!employeeId) {
            return NextResponse.json({ error: "employeeId is required" }, { status: 400 })
        }

        const assignments = await db
            .select({
                id: productionAssignments.id,
                employeeId: productionAssignments.employeeId,
                targetQty: productionAssignments.targetQty,
                completedQty: productionAssignments.completedQty,
                rejectedQty: productionAssignments.rejectedQty,
                ratePerUnit: productionAssignments.ratePerUnit,
                status: productionAssignments.status,
                assignedAt: productionAssignments.assignedAt,
                createdAt: productionAssignments.createdAt,
                jobOrderId: productionAssignments.jobOrderId,
                joNumber: jobOrders.joNumber,
                joStatus: jobOrders.status,
                productName: products.name,
                productSku: products.sku,
            })
            .from(productionAssignments)
            .leftJoin(jobOrders, eq(productionAssignments.jobOrderId, jobOrders.id))
            .leftJoin(products, eq(jobOrders.productId, products.id))
            .where(eq(productionAssignments.employeeId, employeeId))
            .orderBy(desc(productionAssignments.createdAt))

        const enrichedAssignments = await Promise.all(
            assignments.map(async (a) => {
                const completedQty = a.completedQty || 0
                const ratePerUnit = parseFloat(a.ratePerUnit || "0")

                let qcPassed = false
                let qcSuccessQty = 0
                let qcRejectQty = 0
                
                if (a.jobOrderId) {
                    const qcData = await db
                        .select()
                        .from(qcReports)
                        .where(eq(qcReports.jobOrderId, a.jobOrderId))
                        .orderBy(desc(qcReports.createdAt))
                        .limit(1)
                    
                    if (qcData.length > 0) {
                        qcPassed = true
                        qcSuccessQty = qcData[0].successQty || 0
                        qcRejectQty = qcData[0].rejectQty || 0
                    }
                }

                let salaryStatus = "PENDING"
                let claimSubmittedAt: Date | null = null
                let claimApprovedAt: Date | null = null

                if (completedQty > 0) {
                    const salaryData = await db
                        .select()
                        .from(productionSalary)
                        .where(eq(productionSalary.assignmentId, a.id))
                        .limit(1)
                    
                    if (salaryData.length > 0) {
                        salaryStatus = salaryData[0].status || "PENDING"
                        claimSubmittedAt = salaryData[0].createdAt
                        if (salaryStatus === "APPROVED" || salaryStatus === "PAID") {
                            claimApprovedAt = salaryData[0].paidAt
                        }
                    }
                }

                return {
                    id: a.id,
                    employeeId: a.employeeId,
                    joNumber: a.joNumber || `MANUAL-${a.id.slice(0, 8)}`,
                    productName: a.productName || "Produk Manual",
                    targetQty: a.targetQty || 0,
                    completedQty: completedQty || 0,
                    rejectedQty: qcRejectQty,
                    acceptedQty: qcSuccessQty,
                    ratePerUnit,
                    totalSalary: qcPassed ? qcSuccessQty * ratePerUnit : 0,
                    status: salaryStatus,
                    qcPassed,
                    createdAt: a.createdAt || new Date(),
                    updatedAt: a.createdAt || new Date(),
                    claimSubmittedAt,
                    claimApprovedAt,
                }
            })
        )

        return NextResponse.json(enrichedAssignments)
    } catch (error) {
        console.error("Error fetching salary data:", error)
        return NextResponse.json({ error: "Failed to fetch salary data" }, { status: 500 })
    }
}
