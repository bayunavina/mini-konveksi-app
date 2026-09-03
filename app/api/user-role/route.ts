import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { employees, user } from "@/db/schema"
import { eq, or, ilike } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ role: "GUEST", isAdmin: false })
    }

    const normalizedEmail = email.toLowerCase()
    
    const result = await db.select()
      .from(employees)
      .where(
        or(
          eq(employees.email, normalizedEmail),
          ilike(employees.email, normalizedEmail)
        )
      )
      .limit(1)

    if (result.length > 0) {
      const role = result[0].role || "KARYAWAN"
      const isSuperAdmin = role === "SUPERADMIN"
      const isAdmin = role === "ADMIN" || isSuperAdmin
      return NextResponse.json({
        role,
        isAdmin,
        isSuperAdmin,
        employeeId: result[0].id,
      })
    }

    const userExists = await db.select()
      .from(user)
      .where(
        or(
          eq(user.email, normalizedEmail),
          ilike(user.email, normalizedEmail)
        )
      )
      .limit(1)

    if (userExists.length > 0) {
      return NextResponse.json({
        role: "ADMIN",
        isAdmin: true,
        isSuperAdmin: false,
        employeeId: null,
        note: "User found but not in employees table - defaulting to ADMIN",
      })
    }

    return NextResponse.json({ role: "GUEST", isAdmin: false, isSuperAdmin: false })
  } catch (error) {
    console.error("Error fetching user role:", error)
    return NextResponse.json({ role: "GUEST", isAdmin: false, isSuperAdmin: false })
  }
}
