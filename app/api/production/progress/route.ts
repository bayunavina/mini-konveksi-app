import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { productionProgress, productionAssignments, jobOrders, notifications } from "@/db/schema"
import { eq } from "drizzle-orm"
import { sendNotificationToAdmin, sendNotificationToQC } from "@/lib/notification-utils"
import { getActorEmployeeId } from "@/lib/auth-utils"

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const assignmentId = searchParams.get("assignmentId")
        const employeeId = searchParams.get("employeeId")

        let results = await db
            .select()
            .from(productionProgress)
            .orderBy(productionProgress.createdAt)

        if (assignmentId) {
            results = results.filter(r => r.assignmentId === assignmentId)
        }

        if (employeeId) {
            results = results.filter(r => r.employeeId === employeeId)
        }

        return NextResponse.json(results)
    } catch (error) {
        console.error("Error fetching progress:", error)
        return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { assignmentId, employeeId, qtyCompleted, qtyRejected, notes } = body

        if (!assignmentId || !employeeId || !qtyCompleted) {
            return NextResponse.json({ error: "assignmentId, employeeId, and qtyCompleted are required" }, { status: 400 })
        }

        // Check if assignment's job order is on HOLD
        const assignment = await db
            .select()
            .from(productionAssignments)
            .where(eq(productionAssignments.id, assignmentId))

        if (assignment.length > 0 && assignment[0].jobOrderId) {
            const jo = await db
                .select({ status: jobOrders.status })
                .from(jobOrders)
                .where(eq(jobOrders.id, assignment[0].jobOrderId))
            
            if (jo.length > 0 && jo[0].status === "HOLD") {
                return NextResponse.json({ error: "Job Order sedang di-hold, tidak bisa input progress" }, { status: 400 })
            }
        }

        const qtyRejectedInt = parseInt(qtyRejected) || 0
        const qtyCompletedInt = parseInt(qtyCompleted)

        const newProgress = await db.insert(productionProgress).values({
            assignmentId,
            employeeId,
            qtyCompleted: qtyCompletedInt,
            qtyRejected: qtyRejectedInt,
            notes,
        }).returning()

        let joNumber = ""

        if (assignment.length > 0) {
            const current = assignment[0]
            const newPending = (current.pendingQty || 0) + qtyCompletedInt
            
            await db
                .update(productionAssignments)
                .set({
                    pendingQty: newPending,
                    startedAt: current.startedAt || new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(productionAssignments.id, assignmentId))

            if (current.jobOrderId) {
                const jobOrder = await db
                    .select()
                    .from(jobOrders)
                    .where(eq(jobOrders.id, current.jobOrderId))
                
                if (jobOrder.length > 0) {
                    joNumber = jobOrder[0].joNumber
                    
                    // Sync job order pendingQty from all assignments
                    const allAssignments = await db
                        .select()
                        .from(productionAssignments)
                        .where(eq(productionAssignments.jobOrderId, current.jobOrderId))
                    
                    const totalPending = allAssignments.reduce((sum, a) => sum + (a.pendingQty || 0), 0)
                    
                    // Update job order status to IN_PROGRESS if has pending
                    if (totalPending > 0 && jobOrder[0].status === "ASSIGNED") {
                        await db
                            .update(jobOrders)
                            .set({
                                status: "IN_PROGRESS",
                                updatedAt: new Date(),
                            })
                            .where(eq(jobOrders.id, current.jobOrderId))
                    }
                }
            }

            const actorId = await getActorEmployeeId(request.headers)

            await db.insert(notifications).values({
                type: "PROGRESS_UPDATE",
                title: "Progress Produksi Baru",
                message: `Job Order ${joNumber}: ${qtyCompletedInt} pcs selesai, ${qtyRejectedInt} pcs reject`,
                reference: "PRODUCTION",
                referenceId: assignmentId,
                actorId,
                isRead: false,
            })

            // Notify Admin and QC about production progress
            await sendNotificationToAdmin(
                "PROGRESS_UPDATE",
                "Progress Produksi Baru",
                `${joNumber}: ${qtyCompletedInt} pcs selesai`,
                "PRODUCTION",
                assignmentId,
                {},
                actorId || undefined
            )

            await sendNotificationToQC(
                "PROGRESS_UPDATE",
                "Progress Produksi Baru",
                `${joNumber}: ${qtyCompletedInt} pcs selesai - Siap QC`,
                "PRODUCTION",
                assignmentId,
                {},
                actorId || undefined
            )
        }

        return NextResponse.json({
            ...newProgress[0],
            pendingQty: qtyCompletedInt,
            message: `Progress recorded. Total pending QC: ${(assignment[0]?.pendingQty || 0) + qtyCompletedInt} pcs. Klik "Request QC" untuk mengajukan verifikasi.`,
        }, { status: 201 })
    } catch (error) {
        console.error("Error updating progress:", error)
        return NextResponse.json({ error: "Failed to update progress" }, { status: 500 })
    }
}
