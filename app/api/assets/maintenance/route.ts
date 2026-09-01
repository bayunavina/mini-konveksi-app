import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { assetMaintenance, assets } from "@/db/schema"
import { desc, eq } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const assetId = searchParams.get("assetId")

    let results = await db
      .select({
        id: assetMaintenance.id,
        assetId: assetMaintenance.assetId,
        type: assetMaintenance.type,
        scheduledDate: assetMaintenance.scheduledDate,
        completedDate: assetMaintenance.completedDate,
        technician: assetMaintenance.technician,
        cost: assetMaintenance.cost,
        notes: assetMaintenance.notes,
        status: assetMaintenance.status,
        createdAt: assetMaintenance.createdAt,
        asset: {
          id: assets.id,
          code: assets.code,
          name: assets.name,
        },
      })
      .from(assetMaintenance)
      .leftJoin(assets, eq(assetMaintenance.assetId, assets.id))
      .orderBy(desc(assetMaintenance.createdAt))

    if (assetId) {
      results = results.filter(r => r.assetId === assetId)
    }

    const formatted = results.map(row => ({
      id: row.id,
      assetId: row.assetId,
      type: row.type,
      scheduledDate: row.scheduledDate,
      completedDate: row.completedDate,
      technician: row.technician,
      cost: row.cost,
      notes: row.notes,
      status: row.status,
      createdAt: row.createdAt,
      asset: row.asset,
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Error fetching maintenance:", error)
    return NextResponse.json({ error: "Failed to fetch maintenance" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { assetId, type, scheduledDate, technician, notes } = body

    const newMaintenance = await db.insert(assetMaintenance).values({
      assetId,
      type,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      technician,
      notes,
      status: "PENDING",
    }).returning()

    return NextResponse.json(newMaintenance[0], { status: 201 })
  } catch (error) {
    console.error("Error creating maintenance:", error)
    return NextResponse.json({ error: "Failed to create maintenance" }, { status: 500 })
  }
}
