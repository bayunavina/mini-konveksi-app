import { NextResponse } from "next/server"
import { db } from "@/db"
import { appSettings } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET() {
  try {
    const result = await db
      .select({ value: appSettings.value })
      .from(appSettings)
      .where(eq(appSettings.key, "push_notification_enabled"))
      .limit(1)
    return NextResponse.json({ enabled: result[0]?.value === "true" })
  } catch (error) {
    console.error("Error fetching push setting:", error)
    return NextResponse.json({ error: "Failed to fetch push setting" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { enabled } = body

    if (typeof enabled !== "boolean") {
      return NextResponse.json({ error: "enabled (boolean) is required" }, { status: 400 })
    }

    const key = "push_notification_enabled"
    const value = enabled ? "true" : "false"

    const existing = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1)
    if (existing.length > 0) {
      await db.update(appSettings).set({ value, updatedAt: new Date() }).where(eq(appSettings.key, key))
    } else {
      await db.insert(appSettings).values({ key, value })
    }

    return NextResponse.json({ success: true, enabled })
  } catch (error) {
    console.error("Error saving push setting:", error)
    return NextResponse.json({ error: "Failed to save push setting" }, { status: 500 })
  }
}