import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { teams, employees } from "@/db/schema"
import { eq, count } from "drizzle-orm"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const [team] = await db.select().from(teams).where(eq(teams.id, id)).limit(1)
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 })

    const members = await db
      .select({
        id: employees.id,
        name: employees.name,
        role: employees.role,
        email: employees.email,
        isActive: employees.isActive,
      })
      .from(employees)
      .where(eq(employees.teamId, id))

    return NextResponse.json({ ...team, members })
  } catch (error) {
    console.error("Error fetching team:", error)
    return NextResponse.json({ error: "Failed to fetch team" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, leaderName, isActive } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama tim wajib diisi" }, { status: 400 })
    }

    const [updated] = await db
      .update(teams)
      .set({
        name: name.trim(),
        leaderName: leaderName?.trim() || null,
        isActive: isActive ?? true,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, id))
      .returning()

    if (!updated) return NextResponse.json({ error: "Team not found" }, { status: 404 })
    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating team:", error)
    return NextResponse.json({ error: "Failed to update team" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const [{ value: memberCount }] = await db
      .select({ value: count() })
      .from(employees)
      .where(eq(employees.teamId, id))

    if (memberCount > 0) {
      return NextResponse.json(
        { error: `Tidak bisa hapus: masih ada ${memberCount} karyawan di tim ini. Pindahkan dulu.` },
        { status: 400 }
      )
    }

    const [deleted] = await db.delete(teams).where(eq(teams.id, id)).returning()
    if (!deleted) return NextResponse.json({ error: "Team not found" }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting team:", error)
    return NextResponse.json({ error: "Failed to delete team" }, { status: 500 })
  }
}
