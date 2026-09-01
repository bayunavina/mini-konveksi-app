import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { jobOrders, productionAssignments } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const joId = searchParams.get("joId")

    if (joId) {
      const assignment = await db
        .select()
        .from(productionAssignments)
        .where(eq(productionAssignments.jobOrderId, joId))
      
      const totalCompleted = assignment.reduce((sum, a) => sum + (a.completedQty || 0), 0)
      const totalRejected = assignment.reduce((sum, a) => sum + (a.rejectedQty || 0), 0)
      const totalAccepted = totalCompleted - totalRejected

      const jo = await db
        .select()
        .from(jobOrders)
        .where(eq(jobOrders.id, joId))

      if (jo.length > 0) {
        let newStatus = jo[0].status
        if (totalAccepted >= jo[0].targetQty && jo[0].targetQty > 0) {
          newStatus = "QC_PENDING"
        } else if (totalCompleted > 0 && jo[0].status !== "APPROVED" && jo[0].status !== "DRAFT") {
          newStatus = "IN_PROGRESS"
        }

        await db
          .update(jobOrders)
          .set({
            completedQty: totalCompleted,
            rejectedQty: totalRejected,
            status: newStatus,
            updatedAt: new Date(),
          })
          .where(eq(jobOrders.id, joId))

        return NextResponse.json({ 
          success: true, 
          joId, 
          completedQty: totalCompleted, 
          rejectedQty: totalRejected,
          status: newStatus 
        })
      }

      return NextResponse.json({ error: "Job order not found" }, { status: 404 })
    }

    const allJobOrders = await db.select().from(jobOrders)
    let syncedCount = 0

    for (const jo of allJobOrders) {
      const assignments = await db
        .select()
        .from(productionAssignments)
        .where(eq(productionAssignments.jobOrderId, jo.id))
      
      const totalCompleted = assignments.reduce((sum, a) => sum + (a.completedQty || 0), 0)
      const totalRejected = assignments.reduce((sum, a) => sum + (a.rejectedQty || 0), 0)
      const totalAccepted = totalCompleted - totalRejected

      let newStatus = jo.status
      if (totalAccepted >= jo.targetQty && jo.targetQty > 0) {
        newStatus = "QC_PENDING"
      } else if (totalCompleted > 0 && jo.status !== "APPROVED" && jo.status !== "DRAFT") {
        newStatus = "IN_PROGRESS"
      }

      await db
        .update(jobOrders)
        .set({
          completedQty: totalCompleted,
          rejectedQty: totalRejected,
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(jobOrders.id, jo.id))

      syncedCount++
    }

    return NextResponse.json({ 
      success: true, 
      message: `Synced ${syncedCount} job orders`,
      syncedCount 
    })
  } catch (error) {
    console.error("Error syncing job orders:", error)
    return NextResponse.json({ error: "Failed to sync job orders" }, { status: 500 })
  }
}
