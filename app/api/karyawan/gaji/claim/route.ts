import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { productionAssignments, jobOrders, qcReports, productionSalary, employees, notifications } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { sendNotificationToAdmin } from "@/lib/notification-utils"
import { formatCurrencyServer } from "@/lib/server-currency"
import { getActorEmployeeId } from "@/lib/auth-utils"

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { employeeId, joNumber, salaryId } = body

        if (!employeeId) {
            return NextResponse.json({ error: "employeeId is required" }, { status: 400 })
        }

        interface AssignmentData {
            id: string
            completedQty: number | null
            rejectedQty: number | null
            acceptedQty: number | null
            ratePerUnit: string | null
            jobOrderId: string | null
            createdAt: Date | null
        }

        let assignmentData: AssignmentData | null = null
        let assignmentId = ""

        if (salaryId) {
            const result = await db.select().from(productionAssignments).where(eq(productionAssignments.id, salaryId)).limit(1)
            assignmentData = result[0] as AssignmentData
            assignmentId = salaryId
        } else {
            const result = await db
                .select({
                    assignment: productionAssignments,
                    joNumber: jobOrders.joNumber,
                })
                .from(productionAssignments)
                .leftJoin(jobOrders, eq(productionAssignments.jobOrderId, jobOrders.id))
                .where(eq(productionAssignments.employeeId, employeeId))
                .orderBy(desc(productionAssignments.acceptedQty))
                .limit(1)
            
            if (result.length > 0 && result[0].assignment) {
                assignmentData = result[0].assignment
                if (assignmentData) {
                    assignmentId = assignmentData.id
                }
            }
        }

        if (!assignmentData) {
            return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
        }

        const completedQty = assignmentData.completedQty || 0
        const ratePerUnit = parseFloat(assignmentData.ratePerUnit || "0")

        if (completedQty === 0) {
            return NextResponse.json({ error: "Belum ada produksi yang diselesaikan" }, { status: 400 })
        }

        const jobOrderId = assignmentData.jobOrderId
        let qcPassed = false
        let qcSuccessQty = 0
        let qcRejectQty = 0

        if (jobOrderId) {
            const qcData = await db
                .select()
                .from(qcReports)
                .where(eq(qcReports.jobOrderId, jobOrderId))
                .orderBy(desc(qcReports.createdAt))
                .limit(1)
            
            if (qcData.length > 0) {
                qcPassed = true
                qcSuccessQty = qcData[0].successQty || 0
                qcRejectQty = qcData[0].rejectQty || 0
            }
        }

        if (!qcPassed) {
            return NextResponse.json({ error: "Hasil produksi belum melewati QC" }, { status: 400 })
        }

        const acceptedQty = qcSuccessQty
        const totalSalary = acceptedQty * ratePerUnit

        const existingSalary = await db
            .select()
            .from(productionSalary)
            .where(eq(productionSalary.assignmentId, assignmentId))
            .limit(1)

        if (existingSalary.length > 0) {
            return NextResponse.json({ error: "Gaji sudah pernah diklaim" }, { status: 400 })
        }

        const newSalary = await db.insert(productionSalary).values({
            employeeId,
            assignmentId: assignmentId,
            totalCompleted: completedQty,
            totalRejected: qcRejectQty,
            totalAccepted: acceptedQty,
            ratePerUnit: ratePerUnit.toString(),
            totalSalary: totalSalary.toString(),
            status: "CLAIMED",
        }).returning()

        const employee = await db
            .select()
            .from(employees)
            .where(eq(employees.id, employeeId))
            .limit(1)

        const actorId = await getActorEmployeeId(request.headers)
        await db.insert(notifications).values({
            employeeId,
            actorId,
            type: "SALARY_CLAIM",
            title: "Klaim Gaji Baru",
            message: `${employee[0]?.name || "Karyawan"} mengajukan klaim gaji ${await formatCurrencyServer(totalSalary)} untuk job order ${joNumber || "Manual"}`,
            reference: "SALARY_CLAIM",
            referenceId: newSalary[0].id,
        })

        // Notify Admin about new salary claim
        await sendNotificationToAdmin(
            "SALARY_CLAIM",
            "Klaim Gaji Baru",
            `${employee[0]?.name || "Karyawan"} klaim gaji ${await formatCurrencyServer(totalSalary)}`,
            "SALARY_CLAIM",
            newSalary[0].id,
            { employeeName: employee[0]?.name || "Karyawan", amount: totalSalary },
            actorId || undefined
        )

        return NextResponse.json({
            ...newSalary[0],
            message: "Klaim gaji berhasil diajukan",
        }, { status: 201 })
    } catch (error) {
        console.error("Error claiming salary:", error)
        return NextResponse.json({ error: "Failed to claim salary" }, { status: 500 })
    }
}
