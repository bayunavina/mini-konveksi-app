import { NextResponse } from "next/server"
import { db } from "@/db"
import { employees } from "@/db/schema"
import { account } from "@/db/schema/auth"
import { desc, eq } from "drizzle-orm"

export async function GET() {
  try {
    const employeeResults = await db
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
        isActive: employees.isActive,
        lastLogin: employees.lastLogin,
        createdAt: employees.createdAt,
      })
      .from(employees)
      .orderBy(desc(employees.createdAt))

    const accountResults = await db
      .select({
        userId: account.userId,
        hasPassword: account.password,
      })
      .from(account)
      .where(eq(account.providerId, "credential"))

    const passwordMap = new Map(
      accountResults.map(a => [a.userId, !!a.hasPassword])
    )

    const allEmployees = employeeResults.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role,
      employmentType: row.employmentType || "HARIAN",
      baseSalary: row.baseSalary,
      ratePerUnit: row.ratePerUnit,
      pin: row.pin,
      isActive: row.isActive,
      lastLogin: row.lastLogin,
      createdAt: row.createdAt,
      team: null,
      hasPassword: passwordMap.get(row.id) || false,
    }))

    return NextResponse.json(allEmployees)
  } catch (error) {
    console.error("Error fetching employees:", error)
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 })
  }
}
