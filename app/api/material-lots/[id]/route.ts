import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { materialLots, productionFromMaterials, productionAssignments, productionProgress } from "@/db/schema"
import { eq, sql } from "drizzle-orm"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        
        const lot = await db
            .select()
            .from(materialLots)
            .where(eq(materialLots.id, id))

        if (lot.length === 0) {
            return NextResponse.json({ error: "Lot not found" }, { status: 404 })
        }

        return NextResponse.json(lot[0])
    } catch (error) {
        console.error("Error fetching lot:", error)
        return NextResponse.json({ error: "Failed to fetch lot" }, { status: 500 })
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const { notes } = body

        const updated = await db
            .update(materialLots)
            .set({ notes, updatedAt: new Date() })
            .where(eq(materialLots.id, id))
            .returning()

        if (updated.length === 0) {
            return NextResponse.json({ error: "Lot not found" }, { status: 404 })
        }

        return NextResponse.json(updated[0])
    } catch (error) {
        console.error("Error updating lot:", error)
        return NextResponse.json({ error: "Failed to update lot" }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        // Get all production assignments for this lot first
        const assignments = await db
            .select({ id: productionAssignments.id })
            .from(productionAssignments)
            .where(eq(productionAssignments.materialLotId, id))

        // Delete progress logs for these assignments
        if (assignments.length > 0) {
            const assignmentIds = assignments.map(a => a.id)
            await db
                .delete(productionProgress)
                .where(sql`${productionProgress.assignmentId} IN (${sql.join(assignmentIds, sql`,`)})`)
        }

        // Delete production assignments that reference this lot
        await db
            .delete(productionAssignments)
            .where(eq(productionAssignments.materialLotId, id))

        // Delete production from materials records
        await db
            .delete(productionFromMaterials)
            .where(eq(productionFromMaterials.lotId, id))

        const deleted = await db
            .delete(materialLots)
            .where(eq(materialLots.id, id))
            .returning()

        if (deleted.length === 0) {
            return NextResponse.json({ error: "Lot not found" }, { status: 404 })
        }

        return NextResponse.json({ success: true, deleted: deleted[0] })
    } catch (error) {
        console.error("Error deleting lot:", error)
        const message = error instanceof Error ? error.message : "Unknown error"
        return NextResponse.json({ error: "Failed to delete lot", details: message }, { status: 500 })
    }
}
