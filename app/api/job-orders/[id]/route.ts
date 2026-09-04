import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { jobOrders, products, teams, qcReports, employees, notifications, productionAssignments, productionLogs, rejects, productionProgress, productionSalary, jobOrderCosts, transactions, inventoryMovements, materialLots } from "@/db/schema"
import { eq, inArray, sql } from "drizzle-orm"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Check if id is a UUID or JO number
    const isUUID = id.includes("-") && id.length === 36
    
    const results = await db
      .select({
        id: jobOrders.id,
        joNumber: jobOrders.joNumber,
        targetQty: jobOrders.targetQty,
        completedQty: jobOrders.completedQty,
        rejectedQty: jobOrders.rejectedQty,
        status: jobOrders.status,
        dueDate: jobOrders.dueDate,
        notes: jobOrders.notes,
        createdAt: jobOrders.createdAt,
        qcEmployeeId: jobOrders.qcEmployeeId,
        productId: products.id,
        productSku: products.sku,
        productName: products.name,
        teamId: teams.id,
        teamName: teams.name,
        acceptedQty: sql<number>`(
          SELECT COALESCE(SUM(pa.accepted_qty), 0)
          FROM ${productionAssignments} pa
          WHERE pa.job_order_id = ${jobOrders.id}
        )`,
      })
      .from(jobOrders)
      .leftJoin(products, eq(jobOrders.productId, products.id))
      .leftJoin(teams, eq(jobOrders.teamId, teams.id))
      .where(isUUID ? eq(jobOrders.id, id) : eq(jobOrders.joNumber, id))

    if (results.length === 0) {
      return NextResponse.json({ error: "Job order not found" }, { status: 404 })
    }

    const row = results[0]
    const qc = await db
      .select({
        id: qcReports.id,
        successQty: qcReports.successQty,
        rejectQty: qcReports.rejectQty,
        notes: qcReports.notes,
        createdAt: qcReports.createdAt,
        employeeName: employees.name,
      })
      .from(qcReports)
      .leftJoin(employees, eq(qcReports.employeeId, employees.id))
      .where(eq(qcReports.jobOrderId, row.id))
      .orderBy(qcReports.createdAt)

    const formatted = {
      id: row.id,
      joNumber: row.joNumber,
      targetQty: row.targetQty,
      completedQty: row.completedQty,
      rejectedQty: row.rejectedQty,
      status: row.status,
      dueDate: row.dueDate,
      notes: row.notes,
      createdAt: row.createdAt,
      qcEmployeeId: row.qcEmployeeId,
      product: row.productId ? {
        id: row.productId,
        sku: row.productSku,
        name: row.productName,
      } : null,
      team: row.teamId ? {
        id: row.teamId,
        name: row.teamName,
      } : null,
      reports: qc.map(r => ({
        id: r.id,
        date: r.createdAt,
        success: r.successQty,
        reject: r.rejectQty,
        notes: r.notes,
        reportedBy: r.employeeName,
      })),
    }

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Error fetching job order:", error)
    return NextResponse.json({ error: "Failed to fetch job order" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, completedQty, rejectedQty, notes, qcEmployeeId } = body

    // Find job order by ID or JO number
    const isUUID = id.includes("-") && id.length === 36
    const findCondition = isUUID ? eq(jobOrders.id, id) : eq(jobOrders.joNumber, id)
    const existingJO = await db.select({ id: jobOrders.id, joNumber: jobOrders.joNumber, status: jobOrders.status }).from(jobOrders).where(findCondition).limit(1)
    
    if (existingJO.length === 0) {
      return NextResponse.json({ error: "Job order not found" }, { status: 404 })
    }

    const actualId = existingJO[0].id
    const joNumber = existingJO[0].joNumber
    const prevStatus = (existingJO[0] as any).status
    const updateData: Record<string, unknown> = {}
    if (status !== undefined) updateData.status = status
    if (completedQty !== undefined) updateData.completedQty = completedQty
    if (rejectedQty !== undefined) updateData.rejectedQty = rejectedQty
    if (notes !== undefined) updateData.notes = notes
    if (qcEmployeeId !== undefined) updateData.qcEmployeeId = qcEmployeeId

    // If status changed to CANCELLED, also delete related notifications
    if (status === "CANCELLED") {
      // Delete notifications by referenceId (could be UUID or JO number)
      await db.delete(notifications).where(eq(notifications.referenceId, actualId))
      await db.delete(notifications).where(eq(notifications.referenceId, joNumber))
    }

    // P2-2: Jika status COMPLETED (dan sebelumnya belum COMPLETED), auto potong stok material lot terkait
    if (status === "COMPLETED" && prevStatus !== "COMPLETED") {
      try {
        const assignments = await db.select({ materialLotId: productionAssignments.materialLotId, targetQty: productionAssignments.targetQty, completedQty: productionAssignments.completedQty, acceptedQty: productionAssignments.acceptedQty })
          .from(productionAssignments).where(eq(productionAssignments.jobOrderId, actualId))
        for (const a of assignments) {
          if (!a.materialLotId) continue
          const lotRows = await db.select().from(materialLots).where(eq(materialLots.id, a.materialLotId)).limit(1)
          if (lotRows.length === 0) continue
          const lot = lotRows[0]
          // pakai acceptedQty jika ada, fallback completedQty, fallback targetQty
          const usedQty = (a.acceptedQty && a.acceptedQty > 0 ? a.acceptedQty : (a.completedQty && a.completedQty > 0 ? a.completedQty : a.targetQty)) || 0
          if (usedQty <= 0) continue
          const newQty = Math.max(0, (lot.quantity || 0) - usedQty)
          const newStatus = newQty <= 0 ? "DEPLETED" : newQty < ((lot.initialQty || 0) * 0.2) ? "LOW" : lot.status
          await db.update(materialLots).set({ quantity: newQty, status: newStatus, updatedAt: new Date() }).where(eq(materialLots.id, a.materialLotId))
        }
      } catch (e) {
        console.error("P2-2 auto potong lot failed", e)
      }
    }

    const updated = await db
      .update(jobOrders)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(jobOrders.id, actualId))
      .returning()

    return NextResponse.json(updated[0])
  } catch (error) {
    console.error("Error updating job order:", error)
    return NextResponse.json({ error: "Failed to update job order" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const force = searchParams.get("force") === "true"
    const deleteTransactions = searchParams.get("deleteTransactions") === "true"

    // Find job order by ID or JO number
    const isUUID = id.includes("-") && id.length === 36
    const findCondition = isUUID ? eq(jobOrders.id, id) : eq(jobOrders.joNumber, id)
    const existingJO = await db.select({ id: jobOrders.id, joNumber: jobOrders.joNumber, status: jobOrders.status, targetQty: jobOrders.targetQty, completedQty: jobOrders.completedQty }).from(jobOrders).where(findCondition).limit(1)

    if (existingJO.length === 0) {
      return NextResponse.json({ error: "Job order not found" }, { status: 404 })
    }

    const actualId = existingJO[0].id
    const joNumber = existingJO[0].joNumber

    // Kumpulkan data terkait untuk guard + laporan ke UI
    const assignments = await db
      .select({ id: productionAssignments.id })
      .from(productionAssignments)
      .where(eq(productionAssignments.jobOrderId, actualId))
    const assignmentIds = assignments.map((a) => a.id)

    const qcReportsToDelete = await db
      .select({ id: qcReports.id })
      .from(qcReports)
      .where(eq(qcReports.jobOrderId, actualId))
    const qcReportIds = qcReportsToDelete.map((r) => r.id)

    const [costRows, txRows, logRows] = await Promise.all([
      db.select({ id: jobOrderCosts.id }).from(jobOrderCosts).where(eq(jobOrderCosts.jobOrderId, actualId)),
      db.select({ id: transactions.id }).from(transactions).where(eq(transactions.jobOrderId, actualId)),
      db.select({ id: productionLogs.id }).from(productionLogs).where(eq(productionLogs.jobOrderId, actualId)),
    ])

    const hasProgress =
      assignmentIds.length > 0 ||
      qcReportIds.length > 0 ||
      logRows.length > 0 ||
      (existingJO[0].completedQty ?? 0) > 0

    // Guard: JO yang sudah berjalan butuh ?force=true agar tidak terhapus tak sengaja.
    // JO Draft 0 (seperti JO260905-07GV) lolos tanpa force.
    if (hasProgress && !force) {
      return NextResponse.json(
        {
          error: "JO sudah memiliki progress produksi/QC. Gunakan force untuk hapus paksa.",
          linked: {
            assignments: assignmentIds.length,
            qcReports: qcReportIds.length,
            productionLogs: logRows.length,
            costs: costRows.length,
            transactions: txRows.length,
            completedQty: existingJO[0].completedQty ?? 0,
          },
          hint: "Ulangi dengan ?force=true, dan tambah &deleteTransactions=true jika transaksi keuangan terkait juga mau dihapus (default: transaksi hanya di-unlink, tidak dihapus).",
        },
        { status: 409 }
      )
    }

    const deleted: Record<string, number> = {}

    await db.transaction(async (tx) => {
      // Child paling dalam dulu (FK-safe)
      if (assignmentIds.length > 0) {
        await tx.delete(productionProgress).where(inArray(productionProgress.assignmentId, assignmentIds))
        deleted.productionProgress = assignmentIds.length
        await tx.delete(productionSalary).where(inArray(productionSalary.assignmentId, assignmentIds))
      }

      if (qcReportIds.length > 0) {
        await tx.delete(rejects).where(inArray(rejects.qcReportId, qcReportIds))
      }
      // Rejects juga bisa tertaut langsung via jobOrderId (bukan hanya via qcReportId)
      await tx.delete(rejects).where(eq(rejects.jobOrderId, actualId))

      if (qcReportIds.length > 0) {
        await tx.delete(qcReports).where(inArray(qcReports.jobOrderId, [actualId]))
        deleted.qcReports = qcReportIds.length
      } else {
        await tx.delete(qcReports).where(eq(qcReports.jobOrderId, actualId))
      }

      if (assignmentIds.length > 0) {
        await tx.delete(productionAssignments).where(eq(productionAssignments.jobOrderId, actualId))
        deleted.assignments = assignmentIds.length
      } else {
        await tx.delete(productionAssignments).where(eq(productionAssignments.jobOrderId, actualId))
      }

      if (logRows.length > 0) {
        await tx.delete(productionLogs).where(eq(productionLogs.jobOrderId, actualId))
        deleted.productionLogs = logRows.length
      } else {
        await tx.delete(productionLogs).where(eq(productionLogs.jobOrderId, actualId))
      }

      // Biaya HPP per JO: hapus eksplisit (walau schema onDelete cascade, eksplisit lebih aman)
      if (costRows.length > 0) {
        await tx.delete(jobOrderCosts).where(eq(jobOrderCosts.jobOrderId, actualId))
        deleted.costs = costRows.length
      }

      // Transaksi keuangan: default hanya unlink (pertahankan audit finance),
      // hapus permanen hanya jika ?deleteTransactions=true
      if (txRows.length > 0) {
        if (deleteTransactions) {
          await tx.delete(transactions).where(eq(transactions.jobOrderId, actualId))
          deleted.transactionsDeleted = txRows.length
        } else {
          await tx.update(transactions).set({ jobOrderId: null }).where(eq(transactions.jobOrderId, actualId))
          deleted.transactionsUnlinked = txRows.length
        }
      }

      // Movements & notifikasi yang merujuk JO / QC-nya (referenceId bertipe text)
      const refIds = [actualId, joNumber, ...qcReportIds]
      await tx.delete(inventoryMovements).where(inArray(inventoryMovements.referenceId, refIds))
      await tx.delete(notifications).where(inArray(notifications.referenceId, refIds))

      // Terakhir: JO-nya sendiri
      await tx.delete(jobOrders).where(eq(jobOrders.id, actualId))
      deleted.jobOrders = 1
    })

    return NextResponse.json({ success: true, joNumber, deleted })
  } catch (error) {
    console.error("Error deleting job order:", error)
    return NextResponse.json({ error: "Failed to delete job order" }, { status: 500 })
  }
}
