import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { notifications, employees } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

const NOTIFICATION_EXPIRY_DAYS = 14

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get("employeeId")
    const unreadOnly = searchParams.get("unreadOnly") === "true"
    const type = searchParams.get("type")

    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() - NOTIFICATION_EXPIRY_DAYS)

    let results

    if (employeeId) {
      const query = db.select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        reference: notifications.reference,
        referenceId: notifications.referenceId,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
        employee: {
          id: employees.id,
          name: employees.name,
        },
      })
      .from(notifications)
      .leftJoin(employees, eq(notifications.employeeId, employees.id))
      .where(eq(notifications.employeeId, employeeId))
      .orderBy(desc(notifications.createdAt))
      .limit(50)

      results = unreadOnly 
        ? (await query).filter(n => !n.isRead)
        : await query
    } else {
      results = await db.select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        reference: notifications.reference,
        referenceId: notifications.referenceId,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .orderBy(desc(notifications.createdAt))
      .limit(100)
    }

    if (type) {
      results = results.filter(n => n.type === type)
    }

    results = results.filter(n => n.createdAt && new Date(n.createdAt) >= expiryDate)

    const unreadCount = results.filter(n => !n.isRead).length

    return NextResponse.json({
      notifications: results,
      unreadCount,
      expiresIn: `${NOTIFICATION_EXPIRY_DAYS} hari`,
    })
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employeeId, type, title, message, reference, referenceId } = body

    if (!type || !title || !message) {
      return NextResponse.json({ error: "type, title, and message are required" }, { status: 400 })
    }

    const newNotification = await db.insert(notifications).values({
      employeeId: employeeId || null,
      type,
      title,
      message,
      reference: reference || null,
      referenceId: referenceId || null,
      isRead: false,
    }).returning()

    return NextResponse.json(newNotification[0], { status: 201 })
  } catch (error) {
    console.error("Error creating notification:", error)
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 })
  }
}
