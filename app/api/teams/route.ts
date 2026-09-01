import { NextResponse } from "next/server"
import { db } from "@/db"
import { teams } from "@/db/schema"
import { desc } from "drizzle-orm"

export async function GET() {
  try {
    const results = await db
      .select({
        id: teams.id,
        name: teams.name,
        leaderName: teams.leaderName,
        isActive: teams.isActive,
        createdAt: teams.createdAt,
      })
      .from(teams)
      .orderBy(desc(teams.createdAt))

    return NextResponse.json(results)
  } catch (error) {
    console.error("Error fetching teams:", error)
    return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 })
  }
}