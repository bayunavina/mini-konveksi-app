import { NextResponse } from "next/server"
import { db } from "@/db"
import { appSettings } from "@/db/schema"
import { eq } from "drizzle-orm"
import { isEmailEnabled, testSmtpConnection } from "@/lib/email"

export async function GET() {
  try {
    const enabled = await isEmailEnabled()
    return NextResponse.json({ enabled })
  } catch (error) {
    console.error("Error fetching email smtp setting:", error)
    return NextResponse.json({ error: "Failed to fetch email smtp setting" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { enabled, test } = body

    if (test) {
      const result = await testSmtpConnection()
      return NextResponse.json(result)
    }

    if (typeof enabled !== "boolean") {
      return NextResponse.json({ error: "enabled (boolean) is required" }, { status: 400 })
    }

    const key = "email_smtp_enabled"
    const value = enabled ? "true" : "false"

    const existing = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1)

    if (existing.length > 0) {
      await db.update(appSettings).set({ value, updatedAt: new Date() }).where(eq(appSettings.key, key))
    } else {
      await db.insert(appSettings).values({ key, value })
    }

    return NextResponse.json({ success: true, enabled })
  } catch (error) {
    console.error("Error saving email smtp setting:", error)
    return NextResponse.json({ error: "Failed to save email smtp setting" }, { status: 500 })
  }
}
