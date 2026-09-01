import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { notifications } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employeeId } = body

    if (!employeeId) {
      return NextResponse.json({ error: "employeeId is required" }, { status: 400 })
    }

    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.employeeId, employeeId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking all as read:", error)
    return NextResponse.json({ error: "Failed to mark all as read" }, { status: 500 })
  }
}
