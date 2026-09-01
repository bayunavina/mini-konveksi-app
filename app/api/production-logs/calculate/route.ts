import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { productionLogs, employees, productionAssignments, productionProgress } from "@/db/schema"
import { eq, and, desc } from "drizzle-orm"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employeeId, periodWeek, periodYear, allowances = 0, deductions = 0 } = body

    if (!employeeId || !periodWeek || !periodYear) {
      return NextResponse.json({ 
        error: "employeeId, periodWeek, and periodYear are required" 
      }, { status: 400 })
    }

    const employee = await db.select()
      .from(employees)
      .where(eq(employees.id, employeeId))

    if (employee.length === 0) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    const emp = employee[0]
    const employmentType = emp.employmentType || "HARIAN"

    // Get from production logs (weekly manual entries)
    const logs = await db.select()
      .from(productionLogs)
      .where(and(
        eq(productionLogs.employeeId, employeeId),
        eq(productionLogs.periodWeek, periodWeek),
        eq(productionLogs.periodYear, parseInt(periodYear))
      ))

    // Get from production assignments (accepted qty from QC)
    const assignments = await db.select()
      .from(productionAssignments)
      .where(eq(productionAssignments.employeeId, employeeId))

    // Get from production progress
    const progressData = await db.select()
      .from(productionProgress)
      .where(eq(productionProgress.employeeId, employeeId))
      .orderBy(desc(productionProgress.createdAt))

    // Calculate total from all sources
    const logQty = logs.reduce((sum, log) => sum + log.completedQty, 0)
    // Use acceptedQty (already passed QC)
    const assignmentQty = assignments.reduce((sum, a) => sum + (a.acceptedQty || 0), 0)
    // Use acceptedQty from progress
    const progressQty = progressData.reduce((sum, p) => sum + ((p.qtyCompleted || 0) - (p.qtyRejected || 0)), 0)

    // Use the highest value from the sources
    const totalCompletedQty = Math.max(logQty, assignmentQty, progressQty)
    
    // Get ratePerUnit from the first assignment with a rate, fallback to employee rate
    let ratePerUnit = parseFloat(String(emp.ratePerUnit || "0"))
    if (assignments.length > 0) {
      const assignmentWithRate = assignments.find(a => a.ratePerUnit && parseFloat(String(a.ratePerUnit)) > 0)
      if (assignmentWithRate && assignmentWithRate.ratePerUnit) {
        ratePerUnit = parseFloat(String(assignmentWithRate.ratePerUnit))
      }
    }
    
    const baseSalary = emp.baseSalary || 0
    
    let productionSalary = 0
    let estimatedSalary = 0
    
    if (employmentType === "PERMANENT") {
      estimatedSalary = baseSalary
    } else {
      productionSalary = totalCompletedQty * ratePerUnit
      estimatedSalary = productionSalary
    }

    const totalGaji = estimatedSalary + allowances - deductions

    const calculation = {
      employeeId,
      employeeName: emp.name,
      employmentType,
      periodWeek,
      periodYear,
      ratePerUnit,
      baseSalary,
      totalCompletedQty,
      productionSalary,
      allowances,
      deductions,
      totalSalary: totalGaji,
      logCount: logs.length,
      breakdown: {
        fromLogs: logQty,
        fromAssignments: assignmentQty,
        fromProgress: progressQty,
      }
    }

    return NextResponse.json(calculation)
  } catch (error) {
    console.error("Error calculating salary:", error)
    return NextResponse.json({ error: "Failed to calculate salary" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get("employeeId")
    const periodWeek = searchParams.get("periodWeek")
    const periodYear = searchParams.get("periodYear")

    if (!employeeId || !periodWeek || !periodYear) {
      return NextResponse.json({ 
        error: "employeeId, periodWeek, and periodYear are required" 
      }, { status: 400 })
    }

    const employee = await db.select()
      .from(employees)
      .where(eq(employees.id, employeeId))

    if (employee.length === 0) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    const emp = employee[0]

    // Get from production logs
    const logs = await db.select()
      .from(productionLogs)
      .where(and(
        eq(productionLogs.employeeId, employeeId),
        eq(productionLogs.periodWeek, periodWeek),
        eq(productionLogs.periodYear, parseInt(periodYear))
      ))

    // Get from production assignments
    const assignments = await db.select()
      .from(productionAssignments)
      .where(eq(productionAssignments.employeeId, employeeId))

    // Get from production progress
    const progressData = await db.select()
      .from(productionProgress)
      .where(eq(productionProgress.employeeId, employeeId))
      .orderBy(desc(productionProgress.createdAt))

    // Calculate total from all sources
    const logQty = logs.reduce((sum, log) => sum + log.completedQty, 0)
    const assignmentQty = assignments.reduce((sum, a) => sum + ((a.completedQty || 0) - (a.rejectedQty || 0)), 0)
    const progressQty = progressData.reduce((sum, p) => sum + ((p.qtyCompleted || 0) - (p.qtyRejected || 0)), 0)

    // Use the highest value
    const totalCompletedQty = Math.max(logQty, assignmentQty, progressQty)
    const ratePerUnit = emp.ratePerUnit || 0
    const estimatedSalary = totalCompletedQty * ratePerUnit

    return NextResponse.json({
      employeeId,
      employeeName: emp.name,
      periodWeek,
      periodYear,
      ratePerUnit,
      totalCompletedQty,
      estimatedSalary,
      logs,
      breakdown: {
        fromLogs: logQty,
        fromAssignments: assignmentQty,
        fromProgress: progressQty,
      }
    })
  } catch (error) {
    console.error("Error fetching salary calculation:", error)
    return NextResponse.json({ error: "Failed to calculate salary" }, { status: 500 })
  }
}
