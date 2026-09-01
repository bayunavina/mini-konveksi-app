import { NextResponse } from "next/server"
import { db } from "@/db"
import { appSettings } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET() {
  try {
    const settings = await db.select().from(appSettings)
    const result: Record<string, string> = {}
    settings.forEach((s) => {
      result[s.key] = s.value || ""
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { key, value } = body

    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 })
    }

    const existing = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1)

    if (existing.length > 0) {
      await db.update(appSettings).set({ value, updatedAt: new Date() }).where(eq(appSettings.key, key))
    } else {
      await db.insert(appSettings).values({ key, value })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving setting:", error)
    return NextResponse.json({ error: "Failed to save setting" }, { status: 500 })
  }
}