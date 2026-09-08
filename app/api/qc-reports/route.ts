import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import {
  qcReports,
  jobOrders,
  employees,
  rejects,
  notifications,
  inventoryStock,
  inventoryMovements,
  warehouses,
  productionAssignments,
  products,
  masterSkus,
  transactions,
  productionSalary,
  jobOrderCosts,
} from "@/db/schema"
import { eq, desc, and, sql } from "drizzle-orm"
import { sendNotificationToAdmin } from "@/lib/notification-utils"
import { generateKode } from "@/lib/utils"
import { MTC_PER_PCS, REJECT_RATE_THRESHOLD } from "@/lib/constants"
import { getActorEmployeeId } from "@/lib/auth-utils"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobOrderId = searchParams.get("jobOrderId")
    const qcEmployeeId = searchParams.get("qcEmployeeId")

    let results = await db
      .select({
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
    const actorId = await getActorEmployeeId(request.headers)

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
    // FIX: Use remainder distribution to ensure Σ allocated == total (no rounding drift)
    if (assignments.length > 0) {
      const totalTarget = assignments.reduce((sum, a) => sum + (a.targetQty || 0), 0)
      const totalSuccess = successQty || 0
      const totalReject = rejectQty || 0
      let allocatedSuccess = 0
      let allocatedReject = 0

      for (let idx = 0; idx < assignments.length; idx++) {
        const assignment = assignments[idx]
        const isLast = idx === assignments.length - 1

        const assignmentData = await db
          .select()
          .from(productionAssignments)
          .where(eq(productionAssignments.id, assignment.id))

        if (assignmentData.length > 0) {
          const currentAss = assignmentData[0]

          let assignedSuccess: number
          let assignedReject: number

          if (isLast) {
            // Last assignment gets remainder to ensure Σ == total
            assignedSuccess = totalSuccess - allocatedSuccess
            assignedReject = totalReject - allocatedReject
          } else {
            const ratio = totalTarget > 0 ? (assignment.targetQty || 0) / totalTarget : 1 / assignments.length
            assignedSuccess = Math.round(totalSuccess * ratio)
            assignedReject = Math.round(totalReject * ratio)
            // Clamp to remaining to avoid overshoot from rounding
            assignedSuccess = Math.min(assignedSuccess, totalSuccess - allocatedSuccess)
            assignedReject = Math.min(assignedReject, totalReject - allocatedReject)
            allocatedSuccess += assignedSuccess
            allocatedReject += assignedReject
          }

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

    // AUTO GAJI BORONGAN TKL - P1-2: buat salary + transaksi TKL per assignment yang lolos QC
    if (successQty > 0 && assignments.length > 0) {
      for (let idx = 0; idx < assignments.length; idx++) {
        const assignment = assignments[idx]
        const totalTarget = assignments.reduce((sum, a) => sum + (a.targetQty || 0), 0)
        const totalSuccess = successQty || 0
        let assignedSuccess: number
        if (idx === assignments.length - 1) {
          // remainder already computed above, but recompute for salary
          const allocated = assignments.slice(0, idx).reduce((sum, a) => {
            const ratio = totalTarget > 0 ? (a.targetQty || 0) / totalTarget : 1 / assignments.length
            return sum + Math.round(totalSuccess * ratio)
          }, 0)
          assignedSuccess = totalSuccess - allocated
        } else {
          const ratio = totalTarget > 0 ? (assignment.targetQty || 0) / totalTarget : 1 / assignments.length
          assignedSuccess = Math.round(totalSuccess * ratio)
        }
        if (assignedSuccess <= 0) continue
        try {
          const assData = await db.select().from(productionAssignments).where(eq(productionAssignments.id, assignment.id)).limit(1)
          if (assData.length === 0) continue
          const ass = assData[0]
          const rate = parseFloat(ass.ratePerUnit?.toString() || "0")
          if (rate <= 0) continue
          const amount = assignedSuccess * rate
          const empId = ass.employeeId
          // 1. Insert productionSalary auto
          try {
            await db.insert(productionSalary).values({
              kode: generateKode("PJ"),
              employeeId: empId,
              assignmentId: assignment.id,
              totalCompleted: assignedSuccess,
              totalRejected: 0,
              totalAccepted: assignedSuccess,
              ratePerUnit: rate.toString(),
              totalSalary: amount.toString(),
              status: "PENDING",
            })
          } catch (e) {
            console.warn("Auto salary insert failed (mungkin duplikat kode):", e)
          }
          // 2. Insert transaksi TKL linked JO - job_order_costs terupdate via transactions POST logic
          try {
            await db.insert(transactions).values({
              type: "EXPENSE",
              category: "TKL",
              amount,
              description: `Gaji borongan ${assignedSuccess} pcs × ${rate} - JO ${currentJo.joNumber} - ${assData[0].id.slice(0,6)}`,
              reference: currentJo.joNumber,
              jobOrderId: jobOrderId,
            })
          } catch (e) { console.warn("Auto TKL tx failed", e) }
          // 3. Update job_order_costs actual_amount untuk TKL
          try {
            await db
              .update(jobOrderCosts)
              .set({ actualAmount: sql`${jobOrderCosts.actualAmount} + ${amount}`, updatedAt: new Date() })
              .where(and(eq(jobOrderCosts.jobOrderId, jobOrderId), eq(jobOrderCosts.costCategoryCode, "TKL")))
            // jika belum ada row, buat baru dengan actual
            const check = await db.select().from(jobOrderCosts).where(and(eq(jobOrderCosts.jobOrderId, jobOrderId), eq(jobOrderCosts.costCategoryCode, "TKL")))
            if (check.length === 0) {
              await db.insert(jobOrderCosts).values({
                jobOrderId,
                costCategoryCode: "TKL",
                costCategoryName: "Upah Jahit Borongan",
                type: "DIRECT",
                estimatedAmount: 0,
                actualAmount: amount,
              })
            }
          } catch (e) { console.error("Auto job_order_costs TKL error for assignment", assignment.id, e) }
        } catch (e) {
          console.error("Auto gaji error for assignment", assignment.id, e)
        }
      }
    }

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
        const actorId = await getActorEmployeeId(request.headers)
        await db.insert(notifications).values({
          employeeId,
          actorId,
          type: "QC_REJECTED",
          title: "Produksi Ditolak QC",
          message: `Job Order ${currentJo.joNumber} memiliki ${rejectQty} Pcs yang ditolak QC.`,
          reference: "QC_REPORT",
          referenceId: reportId,
        })
      }

      // P1-3: Jika reject >5%, auto buat transaksi MTC + update job_order_costs + notifikasi admin
      const totalChecked = (successQty || 0) + (rejectQty || 0)
      const rejectRate = totalChecked > 0 ? rejectQty / totalChecked : 0
      if (rejectRate > REJECT_RATE_THRESHOLD) {
        const mtcAmount = rejectQty * MTC_PER_PCS
        try {
          await db.insert(transactions).values({
            type: "EXPENSE",
            category: "MTC",
            amount: mtcAmount,
            description: `Biaya rework ${rejectQty} pcs reject (${Math.round(rejectRate * 100)}%) - JO ${currentJo.joNumber} - QC ${reportId.slice(0,6)}`,
            reference: currentJo.joNumber,
            jobOrderId: jobOrderId,
          })
        } catch (e) { console.warn("Auto MTC tx failed", e) }
        try {
          await db
            .update(jobOrderCosts)
            .set({ actualAmount: sql`${jobOrderCosts.actualAmount} + ${mtcAmount}`, updatedAt: new Date() })
            .where(and(eq(jobOrderCosts.jobOrderId, jobOrderId), eq(jobOrderCosts.costCategoryCode, "MTC")))
          // jika belum ada row, buat baru dengan actual
          const checkMtc = await db.select().from(jobOrderCosts).where(and(eq(jobOrderCosts.jobOrderId, jobOrderId), eq(jobOrderCosts.costCategoryCode, "MTC")))
          if (checkMtc.length === 0) {
            await db.insert(jobOrderCosts).values({
              jobOrderId,
              costCategoryCode: "MTC",
              costCategoryName: "Service & Penyusutan Mesin",
              type: "INDIRECT",
              estimatedAmount: 0,
              actualAmount: mtcAmount,
              notes: `Auto reject ${Math.round(rejectRate * 100)}%`,
            })
          }
        } catch (e) { console.warn("Auto job_order_costs MTC error", e) }
        await sendNotificationToAdmin(
          "QC_REJECTED",
          `Reject Tinggi ${Math.round(rejectRate * 100)}% - JO ${currentJo.joNumber}`,
          `Reject ${rejectQty}/${totalChecked} pcs (${Math.round(rejectRate * 100)}%) → auto biaya MTC ${mtcAmount.toLocaleString("id-ID")}`,
          "QC_REPORT",
          reportId,
          { joNumber: currentJo.joNumber, rejectQty, rejectRate },
          actorId || undefined
        )
      }
    }

    if (successQty > 0 && employeeId) {
        const actorId = await getActorEmployeeId(request.headers)
        await db.insert(notifications).values({
          employeeId,
          actorId,
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
      reportId,
      { joNumber: currentJo.joNumber, qty: successQty || rejectQty },
      actorId || undefined
    )

    // Add finished good to inventory from QC if successQty > 0
    if (successQty > 0 && currentJo.productId) {
      let finishedGoodsWarehouse = await db
        .select()
        .from(warehouses)
        .where(eq(warehouses.name, "Gudang Bahan Jadi"))
        .limit(1)

      // Fallback: use first warehouse if "Gudang Bahan Jadi" not found
      if (finishedGoodsWarehouse.length === 0) {
        finishedGoodsWarehouse = await db.select().from(warehouses).limit(1)
        if (finishedGoodsWarehouse.length > 0) {
          console.warn(`Warehouse "Gudang Bahan Jadi" not found, fallback to ${finishedGoodsWarehouse[0].name}`)
        }
      }

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
      let rejectWarehouse = await db
        .select()
        .from(warehouses)
        .where(eq(warehouses.name, "Gudang Reject"))
        .limit(1)

      // Fallback: use first warehouse if "Gudang Reject" not found
      if (rejectWarehouse.length === 0) {
        rejectWarehouse = await db.select().from(warehouses).limit(1)
        if (rejectWarehouse.length > 0) {
          console.warn(`Warehouse "Gudang Reject" not found, fallback to ${rejectWarehouse[0].name}`)
        }
      }

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
          quantity: rejectQty,
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