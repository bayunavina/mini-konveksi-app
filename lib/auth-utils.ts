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

export async function getSessionRoleFromHeaders(headers: Headers): Promise<string> {
  try {
    const session = await getSessionFromHeaders(headers)
    if (!session?.user) return "GUEST"

    const email = (session.user.email || "").toLowerCase()

    if (email) {
      const employee = await db
        .select({ role: employees.role })
        .from(employees)
        .where(eq(employees.email, email))
        .limit(1)
      if (employee.length > 0) return employee[0].role || "KARYAWAN"
    }

    if (session.user.id) {
      const byUserId = await db
        .select({ role: employees.role })
        .from(employees)
        .where(eq(employees.userId, session.user.id))
        .limit(1)
      if (byUserId.length > 0) return byUserId[0].role || "KARYAWAN"
    }

    if (email) {
      const authUser = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, email))
        .limit(1)
      if (authUser.length > 0) return "ADMIN"
    }

    return "GUEST"
  } catch (error) {
    console.error("Error resolving session role:", error)
    return "GUEST"
  }
}

export async function getActorEmployeeId(headers: Headers): Promise<string | null> {
  try {
    const session = await getSessionFromHeaders(headers)
    if (!session?.user) return null

    if (session.user.id) {
      const byUserId = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.userId, session.user.id))
        .limit(1)
      if (byUserId.length > 0) return byUserId[0].id
    }

    if (session.user.email) {
      const byEmail = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.email, session.user.email.toLowerCase()))
        .limit(1)
      if (byEmail.length > 0) return byEmail[0].id
    }

    return null
  } catch (error) {
    console.error("Error resolving actor employee:", error)
    return null
  }
}

export type UserRole = "ADMIN" | "QC" | "SUPERVISOR" | "KARYAWAN" | "GUDANG"

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
