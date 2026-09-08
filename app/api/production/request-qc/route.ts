import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { productionAssignments, jobOrders, notifications } from "@/db/schema"
import { eq } from "drizzle-orm"
import { sendNotificationToQC } from "@/lib/notification-utils"
import { getActorEmployeeId } from "@/lib/auth-utils"

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { assignmentId } = body

        if (!assignmentId) {
            return NextResponse.json({ error: "assignmentId is required" }, { status: 400 })
        }

        const assignment = await db
            .select()
            .from(productionAssignments)
            .where(eq(productionAssignments.id, assignmentId))

        if (assignment.length === 0) {
            return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
        }

        const current = assignment[0]
        const pendingQty = Number(current.pendingQty) || 0

        if (!current.qcRequestedAt && pendingQty > 0) {
            await db
                .update(productionAssignments)
                .set({
                    qcRequestedAt: new Date(),
                    status: "QC_REQUESTED",
                    updatedAt: new Date(),
                })
                .where(eq(productionAssignments.id, assignmentId))

            let joNumber = ""
            if (current.jobOrderId) {
                const jobOrder = await db
                    .select()
                    .from(jobOrders)
                    .where(eq(jobOrders.id, current.jobOrderId))
                
                if (jobOrder.length > 0) {
                    joNumber = jobOrder[0].joNumber

                    await db
                        .update(jobOrders)
                        .set({
                            status: "QC_PENDING",
                            updatedAt: new Date(),
                        })
                        .where(eq(jobOrders.id, current.jobOrderId))

                    const actorId = await getActorEmployeeId(request.headers)

                    await db.insert(notifications).values({
                        type: "QC_PENDING",
                        title: "Request QC Baru",
                        message: `Job Order ${joNumber}: ${pendingQty} pcs menunggu QC`,
                        reference: "PRODUCTION",
                        referenceId: assignmentId,
                        actorId,
                        isRead: false,
                    })

                    await sendNotificationToQC(
                        "QC_PENDING",
                        "Request QC Baru",
                        `${joNumber}: ${pendingQty} pcs menunggu verifikasi QC`,
                        "PRODUCTION",
                        assignmentId,
                        {},
                        actorId || undefined
                    )
                }
            }

            return NextResponse.json({
                success: true,
                message: `Request QC submitted. ${pendingQty} pcs menunggu verifikasi QC.`,
            }, { status: 200 })
        } else if (current.qcRequestedAt) {
            return NextResponse.json({
                error: "QC sudah diminta",
                message: "QC sudah diajukan untuk batch ini. Menunggu hasil QC."
            }, { status: 400 })
        } else {
            return NextResponse.json({
                error: "Tidak ada qty untuk di-QC",
                message: "Input qty produksi terlebih dahulu."
            }, { status: 400 })
        }
    } catch (error) {
        console.error("Error requesting QC:", error)
        return NextResponse.json({ error: "Failed to request QC" }, { status: 500 })
    }
}
