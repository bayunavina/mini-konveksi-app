import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { db } from "@/db"
import { employees, user } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function getSession() {
  try {
    const session = await auth.api.getSession({
      headers: new Headers()
    })
    return session
  } catch {
    return null
  }
}

export async function getSessionFromHeaders(headers: Headers) {
  try {
    const session = await auth.api.getSession({
      headers
    })
    return session
  } catch {
    return null
  }
}

export type UserRole = "ADMIN" | "QC" | "SUPERVISOR" | "KARYAWAN"

export const QC_ADMIN_ROLES: UserRole[] = ["ADMIN", "QC"]

export function canProcessReject(role?: string): boolean {
  if (!role) return false
  return QC_ADMIN_ROLES.includes(role as UserRole)
}

export async function requireQcOrAdmin(headers: Headers) {
  const session = await getSessionFromHeaders(headers)
  
  if (!session) {
    return { authorized: false, error: NextResponse.json({ error: "Unauthorized - Please login" }, { status: 401 }) }
  }

  const userRole = (session.user as { role?: string }).role as UserRole || "KARYAWAN"
  
  if (!canProcessReject(userRole)) {
    return { 
      authorized: false, 
      user: session.user,
      error: NextResponse.json({ error: "Forbidden - Only Admin and QC can process rejects" }, { status: 403 }) 
    }
  }

  return { authorized: true, user: session.user, role: userRole }
}

export async function canUserAccess(userEmail: string): Promise<{ canAccess: boolean, role: UserRole, isActive: boolean }> {
  try {
    const employee = await db.select()
      .from(employees)
      .where(eq(employees.email, userEmail.toLowerCase()))
      .limit(1)

    if (employee.length > 0) {
      const isActive = employee[0].isActive as boolean ?? true
      const roleString = employee[0].role || "KARYAWAN"
      const role: UserRole = (roleString as UserRole) || "KARYAWAN"
      
      // If user is inactive, they can still access the application
      // Exception: when user's status becomes active, normal rules apply
      const canAccess = true
      
      return { canAccess, role, isActive }
    }

    // If employee not found, check auth user
    const authUser = await db.select()
      .from(user)
      .where(eq(user.email, userEmail.toLowerCase()))
      .limit(1)

    if (authUser.length > 0) {
      return { canAccess: true, role: "ADMIN" as UserRole, isActive: true }
    }

    return { canAccess: false, role: "GUEST" as UserRole, isActive: false }
  } catch (error) {
    console.error("Error checking user access:", error)
    return { canAccess: false, role: "GUEST" as UserRole, isActive: false }
  }
}
