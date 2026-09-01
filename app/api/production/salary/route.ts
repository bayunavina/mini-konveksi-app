import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { productionSalary, productionAssignments, employees } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { generateKode } from "@/lib/utils"

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const employeeId = searchParams.get("employeeId")
        const status = searchParams.get("status")

        let results = await db
            .select({
                id: productionSalary.id,
                kode: productionSalary.kode,
                totalCompleted: productionSalary.totalCompleted,
                totalRejected: productionSalary.totalRejected,
                totalAccepted: productionSalary.totalAccepted,
                ratePerUnit: productionSalary.ratePerUnit,
                totalSalary: productionSalary.totalSalary,
                periodStart: productionSalary.periodStart,
                periodEnd: productionSalary.periodEnd,
                status: productionSalary.status,
                paidAt: productionSalary.paidAt,
                createdAt: productionSalary.createdAt,
                employee: {
                    id: employees.id,
                    name: employees.name,
                    email: employees.email,
                    role: employees.role,
                },
            })
            .from(productionSalary)
            .leftJoin(employees, eq(productionSalary.employeeId, employees.id))
            .orderBy(desc(productionSalary.createdAt))

        if (employeeId) {
            results = results.filter(r => r.employee?.id === employeeId)
        }

        if (status) {
            results = results.filter(r => r.status === status)
        }

        return NextResponse.json(results)
    } catch (error) {
        console.error("Error fetching salary:", error)
        return NextResponse.json({ error: "Failed to fetch salary" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { assignmentId, employeeId, periodStart, periodEnd } = body

        if (!assignmentId || !employeeId) {
            return NextResponse.json({ error: "assignmentId and employeeId are required" }, { status: 400 })
        }

        const assignment = await db
            .select()
            .from(productionAssignments)
            .where(eq(productionAssignments.id, assignmentId))

        if (assignment.length === 0) {
            return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
        }

        const a = assignment[0]
        const totalCompleted = a.completedQty || 0
        const totalRejected = a.rejectedQty || 0
        const totalAccepted = totalCompleted - totalRejected
        const ratePerUnit = parseFloat(a.ratePerUnit || "0")
        const totalSalary = totalAccepted * ratePerUnit

        const newSalary = await db.insert(productionSalary).values({
            kode: generateKode("PJ"),
            assignmentId,
            employeeId,
            totalCompleted,
            totalRejected,
            totalAccepted,
            ratePerUnit: ratePerUnit.toString(),
            totalSalary: totalSalary.toString(),
            periodStart: periodStart ? new Date(periodStart) : null,
            periodEnd: periodEnd ? new Date(periodEnd) : null,
            status: "CALCULATED",
        }).returning()

        return NextResponse.json({
            ...newSalary[0],
            breakdown: {
                completed: totalCompleted,
                rejected: totalRejected,
                accepted: totalAccepted,
                ratePerUnit,
                totalSalary,
            },
        }, { status: 201 })
    } catch (error) {
        console.error("Error calculating salary:", error)
        return NextResponse.json({ error: "Failed to calculate salary" }, { status: 500 })
    }
}
