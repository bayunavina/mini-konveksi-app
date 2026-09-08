import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { employees, user } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })
    
    if (!session || !session.user) {
      return NextResponse.json({ user: null })
    }

    const email = (session.user.email || "").toLowerCase()
    let role: string | null = null

    try {
      if (email) {
        const employee = await db
          .select({ role: employees.role })
          .from(employees)
          .where(eq(employees.email, email))
          .limit(1)
        if (employee.length > 0) role = employee[0].role || "KARYAWAN"
      }
      if (!role && session.user.id) {
        const byUserId = await db
          .select({ role: employees.role })
          .from(employees)
          .where(eq(employees.userId, session.user.id))
          .limit(1)
        if (byUserId.length > 0) role = byUserId[0].role || "KARYAWAN"
      }
      if (!role && email) {
        const authUser = await db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.email, email))
          .limit(1)
        if (authUser.length > 0) role = "ADMIN"
      }
    } catch (err) {
      console.error("Error resolving role:", err)
    }

    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        role,
      }
    })
  } catch (error) {
    console.error("Session error:", error)
    return NextResponse.json({ user: null })
  }
}
