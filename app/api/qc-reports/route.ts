import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { qcReports, jobOrders, employees, rejects, notifications, inventoryStock, inventoryMovements, warehouses, productionAssignments, products, masterSkus } from "@/db/schema"
import { eq, desc, and, sql } from "drizzle-orm"
import { sendNotificationToAdmin } from "@/lib/notification-utils"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobOrderId = searchParams.get("jobOrderId")
    const qcEmployeeId = searchParams.get("qcEmployeeId")

    let results = await db.select({
      id: qcReports.id,
      successQty: qcReports.successQty,
      rejectQty: qcReports.rejectQty,
      notes: qcReports.notes,
      createdAt: qcReports.createdAt,
      jobOrder: {
        id: jobOrders.id,
        joNumber: jobOrders.joNumber,
        qcEmployeeId: jobOrders.qcEmployeeId,
        productId: jobOrders.productId,
      },
      employee: {
        id: employees.id,
        name: employees.name,
      },
      product: {
        id: sql<string | null>`COALESCE(${products.id}, ${masterSkus.id})`,
        sku: sql<string | null>`COALESCE(${products.sku}, ${masterSkus.code})`,
        name: sql<string | null>`COALESCE(${products.name}, ${masterSkus.name})`,
      },
    })
    .from(qcReports)
    .leftJoin(jobOrders, eq(qcReports.jobOrderId, jobOrders.id))
    .leftJoin(employees, eq(qcReports.employeeId, employees.id))
    .leftJoin(products, eq(jobOrders.productId, products.id))
    .leftJoin(masterSkus, eq(jobOrders.productId, masterSkus.id))
    .orderBy(desc(qcReports.createdAt))

    if (jobOrderId) {
      results = results.filter(r => r.jobOrder?.id === jobOrderId)
    }

    if (qcEmployeeId) {
      results = results.filter(r => r.jobOrder?.qcEmployeeId === qcEmployeeId)
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error("Error fetching QC reports:", error)
    return NextResponse.json({ error: "Failed to fetch QC reports" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobOrderId, employeeId, successQty, rejectQty, notes, rejectReason } = body

    const newReport = await db.insert(qcReports).values({
      jobOrderId,
      employeeId,
      successQty: successQty || 0,
      rejectQty: rejectQty || 0,
      notes,
    }).returning()

    const reportId = newReport[0].id

    const assignments = await db
      .select({ id: productionAssignments.id, targetQty: productionAssignments.targetQty })
      .from(productionAssignments)
      .where(eq(productionAssignments.jobOrderId, jobOrderId))

    const jobOrder = await db
      .select()
      .from(jobOrders)
      .where(eq(jobOrders.id, jobOrderId))

    if (jobOrder.length === 0) {
      return NextResponse.json({ error: "Job order not found" }, { status: 404 })
    }

    const currentJo = jobOrder[0]
    const newCompletedQty = (currentJo.completedQty || 0) + (successQty || 0)
    const newRejectedQty = (currentJo.rejectedQty || 0) + (rejectQty || 0)

    // Update each assignment with QC result after we have currentJo
    // Move from pendingQty to completedQty/acceptedQty
    if (assignments.length > 0) {
      const totalTarget = assignments.reduce((sum, a) => sum + (a.targetQty || 0), 0)
      
      for (const assignment of assignments) {
        // Get current assignment data
        const assignmentData = await db
          .select()
          .from(productionAssignments)
          .where(eq(productionAssignments.id, assignment.id))
        
        if (assignmentData.length > 0) {
          const currentAss = assignmentData[0]
          
          const ratio = totalTarget > 0 ? (assignment.targetQty || 0) / totalTarget : 1/assignments.length
          const assignedSuccess = Math.round((successQty || 0) * ratio)
          const assignedReject = Math.round((rejectQty || 0) * ratio)
          
          // Move from pending to completed/accepted
          const newCompletedQty = (currentAss.completedQty || 0) + assignedSuccess
          const newRejectedQty = (currentAss.rejectedQty || 0) + assignedReject
          const newAcceptedQty = (currentAss.acceptedQty || 0) + assignedSuccess
          
          await db
            .update(productionAssignments)
            .set({
              completedQty: newCompletedQty,
              rejectedQty: newRejectedQty,
              acceptedQty: newAcceptedQty,
              pendingQty: 0,
              status: "COMPLETED",
              completedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(productionAssignments.id, assignment.id))
        }
      }
    }

    await db
      .update(jobOrders)
      .set({
        completedQty: newCompletedQty,
        rejectedQty: newRejectedQty,
        status: "IN_PROGRESS",
        updatedAt: new Date(),
      })
      .where(eq(jobOrders.id, jobOrderId))

    if (rejectQty > 0) {
      await db.insert(rejects).values({
        jobOrderId,
        productId: currentJo.productId,
        qcReportId: reportId,
        quantity: rejectQty,
        unit: "Pcs",
        reason: rejectReason || "Tidak lolos QC",
        description: notes,
        status: "PENDING",
      })

      if (employeeId) {
        await db.insert(notifications).values({
          employeeId,
          type: "QC_REJECTED",
          title: "Produksi Ditolak QC",
          message: `Job Order ${currentJo.joNumber} memiliki ${rejectQty} Pcs yang ditolak QC.`,
          reference: "QC_REPORT",
          referenceId: reportId,
        })
      }
    }

    if (successQty > 0 && employeeId) {
      await db.insert(notifications).values({
        employeeId,
        type: "QC_ACCEPTED",
        title: "Produksi Lolos QC - Klaim Gaji",
        message: `Job Order ${currentJo.joNumber}: ${successQty} Pcs diterima QC. Anda bisa klaim gaji sekarang!`,
        reference: "QC_REPORT",
        referenceId: reportId,
      })
    }

    // Notify Admin about QC completion
    await sendNotificationToAdmin(
      successQty > 0 ? "QC_ACCEPTED" : "QC_REJECTED",
      "QC Report Baru",
      `${currentJo.joNumber}: ${successQty} pcs OK, ${rejectQty} pcs reject`,
      "QC_REPORT",
      reportId
    )

    // Add finished good to inventory from QC if successQty > 0
    if (successQty > 0 && currentJo.productId) {
      const finishedGoodsWarehouse = await db
        .select()
        .from(warehouses)
        .where(eq(warehouses.name, "Gudang Bahan Jadi"))
        .limit(1)

      if (finishedGoodsWarehouse.length > 0) {
        const warehouseId = finishedGoodsWarehouse[0].id
        const productId = currentJo.productId

        // Check existing stock
        const existingStock = await db
          .select()
          .from(inventoryStock)
          .where(and(
            eq(inventoryStock.productId, productId),
            eq(inventoryStock.warehouseId, warehouseId)
          ))

        if (existingStock.length === 0) {
          await db.insert(inventoryStock).values({
            productId,
            warehouseId,
            quantity: successQty,
          })
        } else {
          await db.update(inventoryStock)
            .set({
              quantity: (existingStock[0].quantity ?? 0) + successQty,
              updatedAt: new Date()
            })
            .where(eq(inventoryStock.id, existingStock[0].id))
        }

        await db.insert(inventoryMovements).values({
          productId,
          warehouseId,
          type: "QC_COMPLETE",
          quantity: successQty,
          reference: "QC_REPORT",
          referenceId: reportId,
          notes: `QC Selesai - JO ${currentJo.joNumber}`,
        })

        console.log(`Added ${successQty} to finished goods inventory for product ${productId}`)
      }
    }

    // Update reject to inventory movements
    if (rejectQty > 0 && currentJo.productId) {
      const rejectWarehouse = await db
        .select()
        .from(warehouses)
        .where(eq(warehouses.name, "Gudang Reject"))
        .limit(1)

      if (rejectWarehouse.length > 0) {
        const warehouseId = rejectWarehouse[0].id
        const productId = currentJo.productId

        const existingStock = await db
          .select()
          .from(inventoryStock)
          .where(and(
            eq(inventoryStock.productId, productId),
            eq(inventoryStock.warehouseId, warehouseId)
          ))

        if (existingStock.length === 0) {
          await db.insert(inventoryStock).values({
            productId,
            warehouseId,
            quantity: rejectQty,
          })
        } else {
          await db.update(inventoryStock)
            .set({ 
              quantity: (existingStock[0].quantity ?? 0) + rejectQty,
              updatedAt: new Date()
            })
            .where(eq(inventoryStock.id, existingStock[0].id))
        }

        await db.insert(inventoryMovements).values({
          productId,
          warehouseId,
          type: "REJECT",
          quantity: -rejectQty,
          reference: "QC_REPORT",
          referenceId: reportId,
          notes: `Reject QC - JO ${currentJo.joNumber}`,
        })
      }
    }

    return NextResponse.json({
      ...newReport[0],
      jobOrder: {
        completedQty: newCompletedQty,
        rejectedQty: newRejectedQty,
      },
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating QC report:", error)
    return NextResponse.json({ error: "Failed to create QC report" }, { status: 500 })
  }
}
