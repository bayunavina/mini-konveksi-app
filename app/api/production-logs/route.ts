import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { productionLogs, employees, jobOrders } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get("employeeId")
    const periodWeek = searchParams.get("periodWeek")
    const periodYear = searchParams.get("periodYear")
    const jobOrderId = searchParams.get("jobOrderId")

    const query = db.select({
      id: productionLogs.id,
      employeeId: productionLogs.employeeId,
      jobOrderId: productionLogs.jobOrderId,
      completedQty: productionLogs.completedQty,
      unit: productionLogs.unit,
      periodWeek: productionLogs.periodWeek,
      periodYear: productionLogs.periodYear,
      notes: productionLogs.notes,
      createdAt: productionLogs.createdAt,
      employee: {
        id: employees.id,
        name: employees.name,
      },
      jobOrder: {
        id: jobOrders.id,
        joNumber: jobOrders.joNumber,
      },
    })
    .from(productionLogs)
    .leftJoin(employees, eq(productionLogs.employeeId, employees.id))
    .leftJoin(jobOrders, eq(productionLogs.jobOrderId, jobOrders.id))
    .orderBy(desc(productionLogs.createdAt))

    const conditions: ReturnType<typeof eq>[] = []
    
    if (employeeId) {
      conditions.push(eq(productionLogs.employeeId, employeeId))
    }
    if (periodWeek) {
      conditions.push(eq(productionLogs.periodWeek, periodWeek))
    }
    if (periodYear) {
      conditions.push(eq(productionLogs.periodYear, parseInt(periodYear)))
    }
    if (jobOrderId) {
      conditions.push(eq(productionLogs.jobOrderId, jobOrderId))
    }

    let results = await query
    
    if (conditions.length > 0) {
      results = results.filter(r => {
        return conditions.every((_, idx) => {
          if (idx === 0 && employeeId) return r.employeeId === employeeId
          if (idx === 1 && periodWeek) return r.periodWeek === periodWeek
          if (idx === 2 && periodYear) return r.periodYear === parseInt(periodYear)
          if (idx === 3 && jobOrderId) return r.jobOrderId === jobOrderId
          return true
        })
      })
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error("Error fetching production logs:", error)
    return NextResponse.json({ error: "Failed to fetch production logs" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      employeeId, 
      jobOrderId, 
      completedQty, 
      unit = "LUSIN", 
      periodWeek,
      periodYear,
      notes,
      createdBy 
    } = body

    if (!employeeId || !completedQty || !periodWeek || !periodYear) {
      return NextResponse.json({ 
        error: "employeeId, completedQty, periodWeek, and periodYear are required" 
      }, { status: 400 })
    }

    const newLog = await db.insert(productionLogs).values({
      employeeId,
      jobOrderId: jobOrderId || null,
      completedQty: parseInt(completedQty),
      unit,
      periodWeek,
      periodYear: parseInt(periodYear),
      notes,
      createdBy,
    }).returning()

    return NextResponse.json(newLog[0], { status: 201 })
  } catch (error) {
    console.error("Error creating production log:", error)
    return NextResponse.json({ error: "Failed to create production log" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    await db.delete(productionLogs).where(eq(productionLogs.id, id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting production log:", error)
    return NextResponse.json({ error: "Failed to delete production log" }, { status: 500 })
  }
}
