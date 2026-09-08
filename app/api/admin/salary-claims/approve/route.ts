import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { productionSalary, productionAssignments, jobOrders, employees, transactions, notifications } from "@/db/schema"
import { eq } from "drizzle-orm"
import { formatCurrencyServer } from "@/lib/server-currency"
import { getActorEmployeeId } from "@/lib/auth-utils"

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { salaryId, action } = body

        if (!salaryId || !action) {
            return NextResponse.json({ error: "salaryId and action are required" }, { status: 400 })
        }

        const salary = await db
            .select()
            .from(productionSalary)
            .where(eq(productionSalary.id, salaryId))
            .limit(1)

        if (salary.length === 0) {
            return NextResponse.json({ error: "Salary record not found" }, { status: 404 })
        }

        let newStatus = salary[0].status
        let notificationTitle = ""
        let notificationMessage = ""
        const totalSalary = parseFloat(salary[0].totalSalary || "0")

        if (action === "approve") {
            newStatus = "APPROVED"
            notificationTitle = "Klaim Gaji Disetujui"
            notificationMessage = `Klaim gaji Anda sebesar ${await formatCurrencyServer(totalSalary)} telah disetujui.`
        } else if (action === "reject") {
            newStatus = "REJECTED"
            notificationTitle = "Klaim Gaji Ditolak"
            notificationMessage = `Klaim gaji Anda telah ditolak. Silakan hubungi admin untuk informasi lebih lanjut.`
        } else if (action === "mark_paid") {
            newStatus = "PAID"
            notificationTitle = "Gaji Sudah Dibayar"
            notificationMessage = `Gaji Anda sebesar ${await formatCurrencyServer(totalSalary)} telah dibayarkan.`
        } else {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 })
        }

        await db
            .update(productionSalary)
            .set({
                status: newStatus,
                paidAt: action === "mark_paid" ? new Date() : undefined,
            })
            .where(eq(productionSalary.id, salaryId))

        let employeeName = "Karyawan"
        let joNumber = "-"

        if (salary[0].employeeId) {
            const employee = await db
                .select()
                .from(employees)
                .where(eq(employees.id, salary[0].employeeId))
                .limit(1)
            
            if (employee.length > 0) {
                employeeName = employee[0].name || "Karyawan"
            }

            if (salary[0].assignmentId) {
                const assignment = await db
                    .select()
                    .from(productionAssignments)
                    .where(eq(productionAssignments.id, salary[0].assignmentId))
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

            const actorId = await getActorEmployeeId(request.headers)
            await db.insert(notifications).values({
                employeeId: salary[0].employeeId,
                actorId,
                type: "SALARY_PAID",
                title: notificationTitle,
                message: notificationMessage + (joNumber !== "-" ? ` Job Order: ${joNumber}` : ""),
                reference: "SALARY_CLAIM",
                referenceId: salaryId,
            })
        }

        if (action === "mark_paid") {
            const totalAmount = parseFloat(salary[0].totalSalary || "0")
            const paidDate = new Date()
            
            await db.insert(transactions).values({
                date: paidDate,
                type: "EXPENSE",
                category: "SALARY",
                amount: totalAmount,
                description: `Pembayaran Gaji - ${employeeName}${joNumber !== "-" ? ` (${joNumber})` : ""}`,
                reference: `SALARY-${salaryId.slice(0, 8).toUpperCase()}`,
            })
        }

        return NextResponse.json({
            message: `Salary claim ${action}ed successfully`,
            newStatus,
            transactionCreated: action === "mark_paid",
        })
    } catch (error) {
        console.error("Error updating salary claim:", error)
        return NextResponse.json({ error: "Failed to update salary claim" }, { status: 500 })
    }
}
