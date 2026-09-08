import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { productionAssignments, jobOrders, notifications, materialLots } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getActorEmployeeId } from "@/lib/auth-utils"

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const { status, completedQty, rejectedQty, notes } = body

        const existing = await db.select().from(productionAssignments).where(eq(productionAssignments.id, id)).limit(1)
        if (existing.length === 0) {
            return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
        }
        const prevStatus = existing[0].status
        const materialLotId = existing[0].materialLotId

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

        // P2-2: Auto potong material lot saat assignment COMPLETED
        if (status === "COMPLETED" && prevStatus !== "COMPLETED" && materialLotId) {
            try {
                const usedQty = (updated[0].completedQty || 0)
                if (usedQty > 0) {
                    const lotRows = await db.select().from(materialLots).where(eq(materialLots.id, materialLotId)).limit(1)
                    if (lotRows.length > 0) {
                        const lot = lotRows[0]
                        const newQty = Math.max(0, (lot.quantity || 0) - usedQty)
                        const newLotStatus = newQty <= 0 ? "DEPLETED" : newQty < ((lot.initialQty || 0) * 0.2) ? "LOW" : lot.status
                        await db.update(materialLots).set({ quantity: newQty, status: newLotStatus, updatedAt: new Date() }).where(eq(materialLots.id, materialLotId))
                    }
                }
            } catch (lotErr) {
                console.error("P2-2 auto potong lot gagal", lotErr)
            }
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
                    const actorId = await getActorEmployeeId(request.headers)
                    await db.insert(notifications).values({
                        employeeId: assignment.employeeId,
                        actorId,
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
