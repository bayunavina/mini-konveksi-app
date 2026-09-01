import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { advances, employees, notifications, transactions } from "@/db/schema"
import { eq } from "drizzle-orm"
import { formatCurrencyServer } from "@/lib/server-currency"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const result = await db
      .select({
        id: advances.id,
        kode: advances.kode,
        amount: advances.amount,
        paidAmount: advances.paidAmount,
        purpose: advances.purpose,
        status: advances.status,
        approvedBy: advances.approvedBy,
        paidAt: advances.paidAt,
        createdAt: advances.createdAt,
        employeeId: advances.employeeId,
        employeeName: employees.name,
        employeeRole: employees.role,
        remark: advances.remark,
        paymentHistory: advances.paymentHistory,
      })
      .from(advances)
      .leftJoin(employees, eq(advances.employeeId, employees.id))
      .where(eq(advances.id, id))
    
    if (result.length === 0) {
      return NextResponse.json({ error: "Advance not found" }, { status: 404 })
    }
    
    const row = result[0]
    return NextResponse.json({
      id: row.id,
      kode: row.kode,
      amount: row.amount,
      paidAmount: row.paidAmount || 0,
      purpose: row.purpose,
      status: row.status,
      approvedBy: row.approvedBy,
      paidAt: row.paidAt,
      createdAt: row.createdAt,
      remark: row.remark || "",
      paymentHistory: row.paymentHistory ? JSON.parse(row.paymentHistory) : [],
      employee: row.employeeId ? {
        id: row.employeeId,
        name: row.employeeName || null,
        role: row.employeeRole || null,
      } : null,
    })
  } catch (error) {
    console.error("Error fetching advance:", error)
    return NextResponse.json({ error: "Failed to fetch advance" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { 
      amount, 
      purpose, 
      status, 
      approvedBy,
      remark,
      paymentAmount,
      paymentDate,
      paymentRemark 
    } = body

    // Get current advance
    const currentAdvance = await db
      .select()
      .from(advances)
      .where(eq(advances.id, id))
      .limit(1)

    if (currentAdvance.length === 0) {
      return NextResponse.json({ error: "Advance not found" }, { status: 404 })
    }

    const current = currentAdvance[0]
    const updateData: Record<string, unknown> = {}
    const amountDisplay = await formatCurrencyServer(current.amount || 0)
    
    if (amount !== undefined) updateData.amount = amount
    if (purpose !== undefined) updateData.purpose = purpose
    if (approvedBy !== undefined) updateData.approvedBy = approvedBy
    if (remark !== undefined) updateData.remark = remark

    // Handle status changes
    if (status !== undefined) {
      updateData.status = status
      
      if (status === "APPROVED") {
        // Notify employee about approval
        if (current.employeeId) {
          await db.insert(notifications).values({
            employeeId: current.employeeId,
            type: "KASBON_APPROVED",
            title: "Kasbon Disetujui",
            message: `Pengajuan kasbon ${current.kode} sebesar ${amountDisplay} telah disetujui.`,
            reference: "KASBON",
            referenceId: current.id,
          })
        }
      } else if (status === "REJECTED") {
        // Notify employee about rejection
        if (current.employeeId) {
          await db.insert(notifications).values({
            employeeId: current.employeeId,
            type: "KASBON_REJECTED",
            title: "Kasbon Ditolak",
            message: `Pengajuan kasbon ${current.kode} sebesar ${amountDisplay} ditolak.`,
            reference: "KASBON",
            referenceId: current.id,
          })
        }
      } else if (status === "PAID") {
        updateData.paidAt = new Date()
        
        // Notify employee about full payment
        if (current.employeeId) {
          await db.insert(notifications).values({
            employeeId: current.employeeId,
            type: "KASBON_PAID",
            title: "Kasbon Lunas",
            message: `Kasbon ${current.kode} sebesar ${amountDisplay} telah dilunasi.`,
            reference: "KASBON",
            referenceId: current.id,
          })
        }
      }
    }

    // Handle payment
    if (paymentAmount !== undefined && paymentAmount > 0) {
      const currentPaidAmount = current.paidAmount || 0
      const newPaidAmount = currentPaidAmount + paymentAmount
      const totalAmount = current.amount || 0
      
      // Create INCOME transaction for kasbon payment
      const employeeResult = await db
        .select({ name: employees.name })
        .from(employees)
        .where(eq(employees.id, current.employeeId!))
        .limit(1)
      
      const employeeName = employeeResult[0]?.name || "Karyawan"
      
      // Create INCOME transaction (kasbon payment is income for company)
      await db.insert(transactions).values({
        date: paymentDate ? new Date(paymentDate) : new Date(),
        type: "INCOME",
        category: "KASBON_PAYMENT",
        amount: paymentAmount,
        description: `Pembayaran Kasbon ${current.kode} - ${employeeName}${paymentRemark ? ` (${paymentRemark})` : ""}`,
        reference: current.kode,
      })

      // Update payment history
      const currentHistory = current.paymentHistory ? JSON.parse(current.paymentHistory) : []
      currentHistory.push({
        amount: paymentAmount,
        date: paymentDate || new Date().toISOString(),
        remark: paymentRemark || "",
      })
      
      updateData.paidAmount = newPaidAmount
      updateData.paymentHistory = JSON.stringify(currentHistory)
      
      // Auto-set status to LUNAS if fully paid
      if (newPaidAmount >= totalAmount) {
        updateData.status = "LUNAS"
        updateData.paidAt = new Date()
        
        // Notify employee about full payment
        if (current.employeeId) {
          await db.insert(notifications).values({
            employeeId: current.employeeId,
            type: "KASBON_PAID",
            title: "Kasbon Lunas",
            message: `Kasbon ${current.kode} sebesar ${await formatCurrencyServer(totalAmount)} telah dilunasi.`,
            reference: "KASBON",
            referenceId: current.id,
          })
        }
      }

      // Notify admin about partial payment
      await db.insert(notifications).values({
        type: "TRANSACTION_INCOME",
        title: "Pembayaran Kasbon",
        message: `Pembayaran kasbon ${current.kode} oleh ${employeeName} sebesar ${await formatCurrencyServer(paymentAmount)}.`,
        reference: "KASBON",
        referenceId: current.id,
      })
    }

    // Update the advance
    updateData.updatedAt = new Date()
    const result = await db.update(advances)
      .set(updateData)
      .where(eq(advances.id, id))
      .returning()

    if (result.length === 0) {
      return NextResponse.json({ error: "Failed to update advance" }, { status: 500 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating advance:", error)
    return NextResponse.json({ error: "Failed to update advance" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.delete(advances).where(eq(advances.id, id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting advance:", error)
    return NextResponse.json({ error: "Failed to delete advance" }, { status: 500 })
  }
}
