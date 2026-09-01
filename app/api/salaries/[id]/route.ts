import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { salaries, employees, transactions, notifications } from "@/db/schema"
import { eq } from "drizzle-orm"
import { formatCurrencyServer } from "@/lib/server-currency"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const result = await db.select({
      id: salaries.id,
      period: salaries.period,
      baseSalary: salaries.baseSalary,
      totalAllowances: salaries.totalAllowances,
      totalDeductions: salaries.totalDeductions,
      totalSalary: salaries.totalSalary,
      status: salaries.status,
      paidAt: salaries.paidAt,
      createdAt: salaries.createdAt,
      employee: {
        id: employees.id,
        name: employees.name,
      },
    })
    .from(salaries)
    .leftJoin(employees, eq(salaries.employeeId, employees.id))
    .where(eq(salaries.id, id))
    
    if (result.length === 0) {
      return NextResponse.json({ error: "Salary not found" }, { status: 404 })
    }
    
    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error fetching salary:", error)
    return NextResponse.json({ error: "Failed to fetch salary" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { period, baseSalary, totalAllowances, totalDeductions, totalSalary, status } = body

    const updateData: Record<string, unknown> = {}
    if (period !== undefined) updateData.period = period
    if (baseSalary !== undefined) updateData.baseSalary = baseSalary
    if (totalAllowances !== undefined) updateData.totalAllowances = totalAllowances
    if (totalDeductions !== undefined) updateData.totalDeductions = totalDeductions
    if (totalSalary !== undefined) updateData.totalSalary = totalSalary
    if (status !== undefined) updateData.status = status
    if (status === "PAID") updateData.paidAt = new Date()

    const result = await db.update(salaries)
      .set(updateData)
      .where(eq(salaries.id, id))
      .returning()

    if (result.length === 0) {
      return NextResponse.json({ error: "Salary not found" }, { status: 404 })
    }

    if (status === "PAID") {
      const salary = result[0]
      const employeeResult = await db.select({
        id: employees.id,
        name: employees.name,
      })
      .from(employees)
      .where(eq(employees.id, salary.employeeId!))
      
      const employeeName = employeeResult[0]?.name || "Unknown"
      
      await db.insert(transactions).values({
        type: "EXPENSE",
        category: "GAJI",
        amount: salary.totalSalary!,
        description: `Pembayaran gaji karyawan ${employeeName} untuk periode ${salary.period}`,
        reference: `SALARY-${salary.id}`,
        date: new Date(),
      })

      await db.insert(notifications).values({
        employeeId: salary.employeeId,
        type: "SALARY_PAID",
        title: "Gaji Telah Ditransfer",
        message: `Gaji periode ${salary.period} sebesar ${await formatCurrencyServer(salary.totalSalary || 0)} telah ditransfer.`,
        reference: "SALARY",
        referenceId: salary.id,
      })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating salary:", error)
    return NextResponse.json({ error: "Failed to update salary" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.delete(salaries).where(eq(salaries.id, id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting salary:", error)
    return NextResponse.json({ error: "Failed to delete salary" }, { status: 500 })
  }
}
