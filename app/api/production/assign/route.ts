import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { productionAssignments, employees, materialLots, masterSkus, productionProgress, jobOrders, notifications, products } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { getActorEmployeeId } from "@/lib/auth-utils"

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const employeeId = searchParams.get("employeeId")
        const jobOrderId = searchParams.get("jobOrderId")
        const status = searchParams.get("status")

        let results = await db
            .select({
                id: productionAssignments.id,
                jobOrderId: productionAssignments.jobOrderId,
                targetQty: productionAssignments.targetQty,
                completedQty: productionAssignments.completedQty,
                rejectedQty: productionAssignments.rejectedQty,
                acceptedQty: productionAssignments.acceptedQty,
                pendingQty: productionAssignments.pendingQty,
                qcRequestedAt: productionAssignments.qcRequestedAt,
                ratePerUnit: productionAssignments.ratePerUnit,
                status: productionAssignments.status,
                notes: productionAssignments.notes,
                assignedAt: productionAssignments.assignedAt,
                startedAt: productionAssignments.startedAt,
                completedAt: productionAssignments.completedAt,
                employee: {
                    id: employees.id,
                    name: employees.name,
                    email: employees.email,
                    role: employees.role,
                },
                materialLot: {
                    id: materialLots.id,
                    lotNumber: materialLots.lotNumber,
                    qrCode: materialLots.qrCode,
                },
                product: {
                    id: masterSkus.id,
                    name: masterSkus.name,
                    code: masterSkus.code,
                    category: masterSkus.category,
                    unit: masterSkus.unit,
                },
                jobOrder: {
                    id: jobOrders.id,
                    joNumber: jobOrders.joNumber,
                    status: jobOrders.status,
                },
                jobOrderProduct: {
                    id: products.id,
                    name: products.name,
                    sku: products.sku,
                    category: products.category,
                    unit: products.unit,
                },
            })
            .from(productionAssignments)
            .leftJoin(employees, eq(productionAssignments.employeeId, employees.id))
            .leftJoin(materialLots, eq(productionAssignments.materialLotId, materialLots.id))
            .leftJoin(masterSkus, eq(materialLots.productId, masterSkus.id))
            .leftJoin(jobOrders, eq(productionAssignments.jobOrderId, jobOrders.id))
            .leftJoin(products, eq(jobOrders.productId, products.id))
            .orderBy(desc(productionAssignments.createdAt))

        if (employeeId) {
            results = results.filter(r => r.employee?.id === employeeId)
        }

        if (jobOrderId) {
            results = results.filter(r => r.jobOrderId === jobOrderId)
        }

        if (status) {
            results = results.filter(r => r.status === status)
        }

        const enrichedResults = await Promise.all(
            results.map(async (r) => {
                const progress = await db
                    .select()
                    .from(productionProgress)
                    .where(eq(productionProgress.assignmentId, r.id))

                const productFromMaster = r.product
                const productFromJobOrder = r.jobOrderProduct

                const finalProduct = productFromMaster?.id ? {
                    id: productFromMaster.id,
                    name: productFromMaster.name,
                    code: productFromMaster.code,
                    category: productFromMaster.category,
                    unit: productFromMaster.unit,
                } : productFromJobOrder?.id ? {
                    id: productFromJobOrder.id,
                    name: productFromJobOrder.name,
                    code: productFromJobOrder.sku,
                    category: productFromJobOrder.category,
                    unit: productFromJobOrder.unit,
                } : null

                return {
                    ...r,
                    product: finalProduct,
                    acceptedQty: r.acceptedQty ?? 0,
                    progressLogs: progress,
                }
            })
        )

        return NextResponse.json(enrichedResults)
    } catch (error) {
        console.error("Error fetching assignments:", error)
        return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        let { jobOrderId, materialLotId } = body
        const { employeeId, targetQty, ratePerUnit, notes } = body

        // Validate and sanitize IDs
        if (!employeeId || !targetQty) {
            return NextResponse.json({ error: "employeeId and targetQty are required" }, { status: 400 })
        }

        // Ensure jobOrderId is a valid UUID or null
        if (jobOrderId === "" || jobOrderId === undefined) {
            jobOrderId = null
        }

        // Ensure materialLotId is a valid UUID or null  
        if (materialLotId === "" || materialLotId === undefined) {
            materialLotId = null
        }

        // Validate employee exists
        const employeeCheck = await db.select().from(employees).where(eq(employees.id, employeeId))
        if (employeeCheck.length === 0) {
            return NextResponse.json({ error: "Employee not found" }, { status: 400 })
        }

        console.log("Creating assignment with:", { jobOrderId, materialLotId, employeeId, targetQty, ratePerUnit })

        const newAssignment = await db.insert(productionAssignments).values({
            jobOrderId,
            materialLotId,
            employeeId,
            targetQty: parseInt(targetQty),
            ratePerUnit: ratePerUnit?.toString() || "0",
            status: "ASSIGNED",
            notes,
        }).returning()

        const result = newAssignment[0]

        // Get related data
        const employee = await db.select().from(employees).where(eq(employees.id, employeeId))
        const jobOrder = jobOrderId ? await db.select().from(jobOrders).where(eq(jobOrders.id, jobOrderId)) : []
        const lot = materialLotId ? await db.select().from(materialLots).where(eq(materialLots.id, materialLotId)) : []

        // Send notification to employee
        const actorId = await getActorEmployeeId(request.headers)
        if (employee[0] && jobOrder[0]) {
            await db.insert(notifications).values({
                employeeId,
                actorId,
                type: "JOB_ORDER",
                title: "Job Order Baru",
                message: `Anda mendapat job order ${jobOrder[0].joNumber} dengan target ${targetQty} Pcs.`,
                reference: "JOB_ORDER",
                referenceId: jobOrder[0].joNumber,
            })
        }

        return NextResponse.json({
            ...result,
            employee: employee[0] || null,
            jobOrder: jobOrder[0] || null,
            materialLot: lot[0] || null,
        }, { status: 201 })
    } catch (error) {
        console.error("Error creating assignment:", error)
        return NextResponse.json({ error: "Failed to create assignment: " + String(error) }, { status: 500 })
    }
}
