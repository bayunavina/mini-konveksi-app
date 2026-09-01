import { NextResponse } from "next/server"
import { db } from "@/db"
import { appSettings } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET() {
  try {
    const result = await db.select().from(appSettings).where(eq(appSettings.key, "maintenance_mode")).limit(1)
    const isMaintenance = result.length > 0 && result[0].value === "true"
    return NextResponse.json({ maintenanceMode: isMaintenance })
  } catch (error) {
    console.error("Error checking maintenance mode:", error)
    return NextResponse.json({ maintenanceMode: false }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { enabled } = body

    const existing = await db.select().from(appSettings).where(eq(appSettings.key, "maintenance_mode")).limit(1)

    if (existing.length > 0) {
      await db.update(appSettings).set({ value: enabled ? "true" : "false", updatedAt: new Date() }).where(eq(appSettings.key, "maintenance_mode"))
    } else {
      await db.insert(appSettings).values({ key: "maintenance_mode", value: enabled ? "true" : "false" })
    }

    return NextResponse.json({ success: true, maintenanceMode: enabled })
  } catch (error) {
    console.error("Error toggling maintenance mode:", error)
    return NextResponse.json({ error: "Failed to toggle maintenance mode" }, { status: 500 })
  }
}