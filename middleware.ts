import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { canAccess } from "@/lib/rbac"

const protectedRoutes = ["/dashboard"]
const authRoutes = ["/sign-in"]
const maintenanceRoute = "/maintenance"

const SESSION_COOKIE_NAMES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
  "better-auth.session_token.0",
  "__Secure-better-auth.session_token.0",
]

// API route permission mapping: path prefix -> required role
const API_PERMISSION_ROUTES: Record<string, string[]> = {
  "/api/transfers": ["ADMIN", "SUPERADMIN", "GUDANG"],
  "/api/transfers/": ["ADMIN", "SUPERADMIN", "GUDANG"],
}

function getSessionToken(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined
  const cookies = cookieHeader.split(";").map((c) => c.trim())
  for (const cookieName of SESSION_COOKIE_NAMES) {
    const found = cookies.find((c) => c.startsWith(`${cookieName}=`))
    if (found) return found.split("=").slice(1).join("=")
  }
  return undefined
}

async function getSessionRole(cookieHeader: string | null): Promise<string> {
  try {
    const sessionResponse = await fetch(new URL("/api/debug-session2", "http://localhost").toString(), {
      headers: { "Cookie": cookieHeader || "" }
    })
    const sessionData = await sessionResponse.json()
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
  const sessionToken = getSessionToken(cookieHeader)
  const hasSession = !!sessionToken

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

  // API route permission check
  if (isApiRoute && hasSession) {
    const role = await getSessionRole(cookieHeader)
    
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