import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { assetMaintenance } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await db.select().from(assetMaintenance).where(eq(assetMaintenance.id, id))
    
    if (result.length === 0) {
      return NextResponse.json({ error: "Maintenance not found" }, { status: 404 })
    }
    
    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error fetching maintenance:", error)
    return NextResponse.json({ error: "Failed to fetch maintenance" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { type, scheduledDate, completedDate, technician, cost, notes, status } = body

    const result = await db
      .update(assetMaintenance)
      .set({
        type,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        completedDate: completedDate ? new Date(completedDate) : null,
        technician,
        cost: cost || 0,
        notes,
        status,
        updatedAt: new Date(),
      })
      .where(eq(assetMaintenance.id, id))
      .returning()

    if (result.length === 0) {
      return NextResponse.json({ error: "Maintenance not found" }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating maintenance:", error)
    return NextResponse.json({ error: "Failed to update maintenance" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await db.delete(assetMaintenance).where(eq(assetMaintenance.id, id)).returning()
    
    if (result.length === 0) {
      return NextResponse.json({ error: "Maintenance not found" }, { status: 404 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting maintenance:", error)
    return NextResponse.json({ error: "Failed to delete maintenance" }, { status: 500 })
  }
}
