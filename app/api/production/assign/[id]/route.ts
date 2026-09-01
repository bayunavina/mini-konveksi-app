import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { productionAssignments, jobOrders, notifications } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const { status, completedQty, rejectedQty, notes } = body

        const updateData: Record<string, unknown> = {}

        if (status) {
            updateData.status = status
            if (status === "IN_PROGRESS") {
                updateData.startedAt = new Date()
            } else if (status === "COMPLETED") {
                updateData.completedAt = new Date()
            }
        }

        if (completedQty !== undefined) {
            updateData.completedQty = completedQty
        }

        if (rejectedQty !== undefined) {
            updateData.rejectedQty = rejectedQty
        }

        if (notes !== undefined) {
            updateData.notes = notes
        }

        const updated = await db
            .update(productionAssignments)
            .set(updateData)
            .where(eq(productionAssignments.id, id))
            .returning()

        if (updated.length === 0) {
            return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
        }

        // If status changed, update job order totals
        if (status && updated[0].jobOrderId) {
            const assignment = updated[0]
            
            // Get all assignments for this job order
            const allAssignments = await db
                .select()
                .from(productionAssignments)
                .where(eq(productionAssignments.jobOrderId, assignment.jobOrderId!))

            // Calculate totals
            const totalCompleted = allAssignments.reduce((sum, a) => sum + (a.completedQty || 0), 0)
            const totalRejected = allAssignments.reduce((sum, a) => sum + (a.rejectedQty || 0), 0)

            // Update job order
            await db
                .update(jobOrders)
                .set({
                    completedQty: totalCompleted,
                    rejectedQty: totalRejected,
                })
                .where(eq(jobOrders.id, assignment.jobOrderId!))

            // If assignment is rejected, send notification
            if (status === "REJECTED") {
                const jo = await db.select().from(jobOrders).where(eq(jobOrders.id, assignment.jobOrderId!))
                if (jo[0]) {
                    await db.insert(notifications).values({
                        employeeId: assignment.employeeId,
                        type: "QC_REJECTED",
                        title: "Job Order Ditolak",
                        message: `Job order ${jo[0].joNumber} telah ditolak.`,
                        reference: "JOB_ORDER",
                        referenceId: jo[0].joNumber,
                    })
                }
            }
        }

        return NextResponse.json(updated[0])
    } catch (error) {
        console.error("Error updating assignment:", error)
        return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 })
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        const result = await db
            .select()
            .from(productionAssignments)
            .where(eq(productionAssignments.id, id))
            .limit(1)

        if (result.length === 0) {
            return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
        }

        return NextResponse.json(result[0])
    } catch (error) {
        console.error("Error fetching assignment:", error)
        return NextResponse.json({ error: "Failed to fetch assignment" }, { status: 500 })
    }
}
