import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

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
