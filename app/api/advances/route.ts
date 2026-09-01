import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { advances, employees } from "@/db/schema"
import { eq, desc, like, sql } from "drizzle-orm"
import { generateKasbonCode } from "@/lib/utils"
import { sendNotificationToAdmin } from "@/lib/notification-utils"
import { formatCurrencyServer } from "@/lib/server-currency"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const employeeId = searchParams.get("employeeId")

    const results = await db
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
      .orderBy(desc(advances.createdAt))

    let mappedResults = results.map(row => ({
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
    }))

    // Filter by employeeId if provided
    if (employeeId) {
      mappedResults = mappedResults.filter(a => a.employee?.id === employeeId)
    }

    if (status && status !== "all") {
      mappedResults = mappedResults.filter(a => a.status === status)
    }

    return NextResponse.json(mappedResults)
  } catch (error) {
    console.error("Error fetching advances:", error)
    return NextResponse.json({ error: "Failed to fetch advances" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employeeId, amount, purpose, remark } = body

    // Generate kasbon code with format KB-YYYYMMDD-XXX
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "")
    const prefix = `KB-${dateStr}%`
    
    // Count existing kasbon for today
    const existingCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(advances)
      .where(like(advances.kode, prefix))
    
    const seq = (existingCount[0]?.count || 0) + 1
    const kode = generateKasbonCode(seq)

    const newAdvance = await db.insert(advances).values({
      kode,
      employeeId,
      amount,
      purpose,
      remark: remark || "",
      status: "PENDING",
      paidAmount: 0,
      paymentHistory: "[]",
    }).returning()

    // Get employee name for notification
    const employeeData = await db
      .select({ name: employees.name })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1)
    
    const employeeName = employeeData[0]?.name || "Karyawan"

    // Send notification to admin
    await sendNotificationToAdmin(
      "KASBON_REQUESTED",
      "Pengajuan Kasbon Baru",
      `${employeeName} mengajukan kasbon ${await formatCurrencyServer(Number(amount || 0))}`,
      "KASBON",
      newAdvance[0].id,
      { employeeName, amount: Number(amount || 0) }
    )

    return NextResponse.json(newAdvance[0], { status: 201 })
  } catch (error) {
    console.error("Error creating advance:", error)
    return NextResponse.json({ error: "Failed to create advance" }, { status: 500 })
  }
}
