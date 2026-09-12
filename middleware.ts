import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { canAccess } from "@/lib/rbac"

const protectedRoutes = ["/dashboard"]
const authRoutes = ["/sign-in"]
const maintenanceRoute = "/maintenance"

// API route permission mapping: path prefix -> required role
const API_PERMISSION_ROUTES: Record<string, string[]> = {
  "/api/transfers": ["ADMIN", "SUPERADMIN", "GUDANG"],
  "/api/transfers/": ["ADMIN", "SUPERADMIN", "GUDANG"],
}

const INTERNAL_ORIGIN =
  process.env.INTERNAL_ORIGIN ||
  (process.env.NODE_ENV === "production"
    ? "http://erp-konveksi-app:3000"
    : "http://localhost:3000")

const MW_DEBUG = process.env.MW_DEBUG === "true"

function mwDebug(message: string) {
  if (MW_DEBUG) console.log(`[MW-DEBUG] ${message}`)
}

async function hasValidSession(request: NextRequest): Promise<boolean> {
  try {
    const sessionResponse = await fetch(
      new URL("/api/debug-session2", INTERNAL_ORIGIN).toString(),
      { headers: { "Cookie": request.headers.get("cookie") || "" } }
    )
    const sessionData = await sessionResponse.json()
    mwDebug(`debug-session2 status: ${sessionResponse.status} user: ${Boolean(sessionData.user)}`)
    return Boolean(sessionData.user)
  } catch (error) {
    mwDebug(`debug-session2 error: ${error}`)
    return false
  }
}

async function getSessionRole(request: NextRequest): Promise<string> {
  try {
    const sessionResponse = await fetch(
      new URL("/api/debug-session2", INTERNAL_ORIGIN).toString(),
      { headers: { "Cookie": request.headers.get("cookie") || "" } }
    )
    const sessionData = await sessionResponse.json()
    mwDebug(`debug-session2 role: ${sessionData.user?.role || "GUEST"}`)
    return sessionData.user?.role || "GUEST"
  } catch {
    return "GUEST"
  }
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some((route) => pathname === route)
  const isMaintenancePage = pathname === maintenanceRoute
  const isApiRoute = pathname.startsWith("/api")
  const isStaticRoute = pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.startsWith("/public")
  const isSettingsPage = pathname.startsWith("/dashboard/settings")
  
  if (isStaticRoute) {
    return NextResponse.next()
  }

  const cookieHeader = request.headers.get("cookie")
  const hasSession = (isAuthRoute || isProtectedRoute)
    ? await hasValidSession(request)
    : false

  // Check maintenance mode first (before auth check)
  const maintenanceCookie = cookieHeader?.includes("maintenance=true")
  
  // Allow admin to access settings during maintenance
  if (maintenanceCookie && !isApiRoute && !isAuthRoute && pathname !== maintenanceRoute && !isSettingsPage) {
    return NextResponse.redirect(new URL(maintenanceRoute, request.url))
  }

  // Allow access to maintenance page
  if (isMaintenancePage) {
    return NextResponse.next()
  }

  // Allow access to settings page during maintenance (for admin)
  if (isSettingsPage) {
    return NextResponse.next()
  }

  if (isAuthRoute && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  if (isProtectedRoute && !hasSession) {
    const signInUrl = new URL("/sign-in", request.url)
    signInUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(signInUrl)
  }

  // Page route RBAC check (after session check, before API handling)
  if (isProtectedRoute && hasSession) {
    const role = await getSessionRole(request)
    if (!canAccess(pathname, role as any)) {
      const redirectUrl = new URL(role === "KARYAWAN" ? "/dashboard/karyawan" : role === "QC" ? "/dashboard/qc" : role === "GUDANG" ? "/dashboard/gudang" : "/dashboard", request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // API route permission check
  if (isApiRoute && hasSession) {
    const role = await getSessionRole(request)
    
    // Check permission-based routes
    for (const [prefix, allowedRoles] of Object.entries(API_PERMISSION_ROUTES)) {
      if (pathname === prefix || pathname.startsWith(prefix + "/")) {
        if (!allowedRoles.includes(role)) {
          return NextResponse.json(
            { error: "Forbidden - Insufficient permissions. Required roles: " + allowedRoles.join(", ") },
            { status: 403 }
          )
        }
      }
    }

    // Also check RBAC route access
    if (!canAccess(pathname, role as any)) {
      return NextResponse.json(
        { error: "Forbidden - Access denied for your role" },
        { status: 403 }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public|api).*)",
  ],
}