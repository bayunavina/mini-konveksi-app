import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { salaries, employees } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period")

    const query = db.select({
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
    .orderBy(desc(salaries.createdAt))

    const results = await query

    if (period) {
      return NextResponse.json(results.filter(s => s.period === period))
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error("Error fetching salaries:", error)
    return NextResponse.json({ error: "Failed to fetch salaries" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employeeId, period, baseSalary, totalAllowances, totalDeductions, totalSalary } = body

    const newSalary = await db.insert(salaries).values({
      employeeId,
      period,
      baseSalary: baseSalary || 0,
      totalAllowances: totalAllowances || 0,
      totalDeductions: totalDeductions || 0,
      totalSalary: totalSalary || 0,
      status: "PENDING",
    }).returning()

    return NextResponse.json(newSalary[0], { status: 201 })
  } catch (error) {
    console.error("Error creating salary:", error)
    return NextResponse.json({ error: "Failed to create salary" }, { status: 500 })
  }
}
