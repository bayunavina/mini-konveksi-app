import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { productionSalary, productionAssignments, jobOrders, employees, transactions } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function POST(_request: NextRequest) {
    try {
        const salaryClaims = await db
            .select()
            .from(productionSalary)
            .where(eq(productionSalary.status, "PAID"))

        let syncedCount = 0
        let alreadyExists = 0
        const errors: string[] = []

        for (const salary of salaryClaims) {
            const refNumber = `SALARY-${salary.id.slice(0, 8).toUpperCase()}`
            
            const existingTransaction = await db
                .select()
                .from(transactions)
                .where(eq(transactions.reference, refNumber))
                .limit(1)

            if (existingTransaction.length > 0) {
                alreadyExists++
                continue
            }

            try {
                let employeeName = "Karyawan"
                let joNumber = "-"

                if (salary.employeeId) {
                    const employee = await db
                        .select()
                        .from(employees)
                        .where(eq(employees.id, salary.employeeId))
                        .limit(1)
                    
                    if (employee.length > 0) {
                        employeeName = employee[0].name || "Karyawan"
                    }
                }

                if (salary.assignmentId) {
                    const assignment = await db
                        .select()
                        .from(productionAssignments)
                        .where(eq(productionAssignments.id, salary.assignmentId))
                        .limit(1)

                    if (assignment.length > 0 && assignment[0].jobOrderId) {
                        const jo = await db
                            .select()
                            .from(jobOrders)
                            .where(eq(jobOrders.id, assignment[0].jobOrderId))
                            .limit(1)

                        if (jo.length > 0) {
                            joNumber = jo[0].joNumber
                        }
                    }
                }

                const paidDate = salary.paidAt ? new Date(salary.paidAt) : new Date()
                const totalAmount = parseFloat(salary.totalSalary || "0")

                await db.insert(transactions).values({
                    date: paidDate,
                    type: "EXPENSE",
                    category: "SALARY",
                    amount: totalAmount,
                    description: `Pembayaran Gaji - ${employeeName}${joNumber !== "-" ? ` (${joNumber})` : ""}`,
                    reference: refNumber,
                })

                syncedCount++
            } catch (err) {
                errors.push(`Error syncing ${salary.id}: ${err}`)
            }
        }

        return NextResponse.json({
            success: true,
            message: `Sync completed`,
            synced: syncedCount,
            alreadyExists,
            errors: errors.length > 0 ? errors : undefined,
        })
    } catch (error) {
        console.error("Error syncing salary transactions:", error)
        return NextResponse.json({ error: "Failed to sync salary transactions" }, { status: 500 })
    }
}

export async function GET() {
    try {
        const salaryClaims = await db
            .select()
            .from(productionSalary)
            .where(eq(productionSalary.status, "PAID"))

        const syncStatus = await Promise.all(
            salaryClaims.map(async (salary) => {
                const refNumber = `SALARY-${salary.id.slice(0, 8).toUpperCase()}`
                
                const existingTransaction = await db
                    .select()
                    .from(transactions)
                    .where(eq(transactions.reference, refNumber))
                    .limit(1)

                return {
                    salaryId: salary.id,
                    totalSalary: salary.totalSalary,
                    paidAt: salary.paidAt,
                    hasTransaction: existingTransaction.length > 0,
                    transactionId: existingTransaction[0]?.id || null,
                }
            })
        )

        const needsSync = syncStatus.filter(s => !s.hasTransaction)

        return NextResponse.json({
            totalPaid: salaryClaims.length,
            synced: syncStatus.filter(s => s.hasTransaction).length,
            needsSync: needsSync.length,
            details: syncStatus,
        })
    } catch (error) {
        console.error("Error checking sync status:", error)
        return NextResponse.json({ error: "Failed to check sync status" }, { status: 500 })
    }
}
