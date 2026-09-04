import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { employees } from "@/db/schema"
import { desc } from "drizzle-orm"

export async function GET() {
  try {
    const results = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        phone: employees.phone,
        role: employees.role,
        employmentType: employees.employmentType,
        baseSalary: employees.baseSalary,
        ratePerUnit: employees.ratePerUnit,
        pin: employees.pin,
        qrCode: employees.qrCode,
        isActive: employees.isActive,
        lastLogin: employees.lastLogin,
        createdAt: employees.createdAt,
      })
      .from(employees)
      .orderBy(desc(employees.createdAt))

    const allEmployees = results.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role,
      employmentType: row.employmentType || "HARIAN",
      baseSalary: row.baseSalary,
      ratePerUnit: row.ratePerUnit,
      pin: row.pin,
      qrCode: (row as { qrCode?: string }).qrCode || null,
      isActive: row.isActive,
      lastLogin: row.lastLogin,
      createdAt: row.createdAt,
      team: null,
    }))

    return NextResponse.json(allEmployees)
  } catch (error) {
    console.error("Error fetching employees:", error)
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 })
  }
}

function generateEmployeeQrCode(): string {
  const ts = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `EMP-${ts}${rand}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, role, teamId, employmentType, baseSalary, ratePerUnit, pin } = body

    const qrCode = generateEmployeeQrCode()

    const newEmployee = await db.insert(employees).values({
      name,
      email,
      phone,
      role: role || "KARYAWAN",
      teamId: teamId || null,
      employmentType: employmentType || "HARIAN",
      baseSalary: baseSalary || 0,
      ratePerUnit: ratePerUnit || 0,
      pin,
      qrCode,
    }).returning()

    return NextResponse.json(newEmployee[0], { status: 201 })
  } catch (error) {
    console.error("Error creating employee:", error)
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 })
  }
}
