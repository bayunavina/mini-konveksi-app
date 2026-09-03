import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { teams, employees } from "@/db/schema"
import { desc, eq, count } from "drizzle-orm"

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

    // include member count per team
    const withCounts = await Promise.all(
      results.map(async (t) => {
        const [{ value: memberCount }] = await db
          .select({ value: count() })
          .from(employees)
          .where(eq(employees.teamId, t.id))
        return { ...t, memberCount }
      })
    )

    return NextResponse.json(withCounts)
  } catch (error) {
    console.error("Error fetching teams:", error)
    return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, leaderName, isActive } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama tim wajib diisi" }, { status: 400 })
    }

    const [created] = await db
      .insert(teams)
      .values({
        name: name.trim(),
        leaderName: leaderName?.trim() || null,
        isActive: isActive ?? true,
      })
      .returning()

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("Error creating team:", error)
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 })
  }
}