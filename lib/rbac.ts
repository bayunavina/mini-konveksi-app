import type { UserRole } from "./use-session-with-role"
import { PERMISSION, hasPermission, hasAnyPermission } from "./constants"
export { PERMISSION } from "./constants"

// Central RBAC mapping: path prefix -> allowed roles
// ADMIN = superadmin (erpkonveksi@gmail.com) + any admin account
// Order matters: more specific paths first

export interface RouteRule {
  prefix: string
  roles: UserRole[]
  description: string
}

export const ROUTE_RULES: RouteRule[] = [
  // KARYAWAN only
  { prefix: "/dashboard/karyawan", roles: ["KARYAWAN"], description: "Karyawan dashboard & subpages" },
  // QC only
  { prefix: "/dashboard/qc", roles: ["QC"], description: "QC dashboard" },
  { prefix: "/dashboard/qc/overview", roles: ["QC"], description: "QC overview" },
  { prefix: "/dashboard/qc/report", roles: ["QC"], description: "QC report" },
  { prefix: "/dashboard/qc/scan", roles: ["QC"], description: "QC scan" },
  // GUDANG only
  { prefix: "/dashboard/gudang", roles: ["GUDANG"], description: "Gudang dashboard" },
  // ADMIN and SUPERADMIN (superadmin can access all admin routes)
  { prefix: "/dashboard/admin", roles: ["ADMIN", "SUPERADMIN"], description: "Admin dashboard" },
  { prefix: "/dashboard/produksi", roles: ["ADMIN", "SUPERADMIN"], description: "Produksi (Job Order)" },
  { prefix: "/dashboard/inventory/materials", roles: ["ADMIN", "SUPERADMIN"], description: "Bahan Baku" },
  { prefix: "/dashboard/inventory/rejects", roles: ["ADMIN", "SUPERADMIN"], description: "Reject (admin view)" },
  { prefix: "/dashboard/inventory", roles: ["ADMIN", "SUPERADMIN", "GUDANG"], description: "Stok overview - admin & gudang" },
  { prefix: "/dashboard/employees", roles: ["ADMIN", "SUPERADMIN"], description: "Karyawan management" },
  { prefix: "/dashboard/assets", roles: ["ADMIN", "SUPERADMIN"], description: "Assets" },
  { prefix: "/dashboard/qr-generator", roles: ["ADMIN", "SUPERADMIN"], description: "QR Generator" },
  { prefix: "/dashboard/balance", roles: ["ADMIN", "SUPERADMIN"], description: "Balance Report" },
  { prefix: "/dashboard/log-aktivitas", roles: ["ADMIN", "SUPERADMIN"], description: "Log Aktivitas" },
  { prefix: "/dashboard/settings", roles: ["ADMIN", "SUPERADMIN"], description: "Settings" },
  { prefix: "/dashboard/qc-reports", roles: ["ADMIN", "SUPERADMIN"], description: "QC Reports (admin)" },
  { prefix: "/overview/finance", roles: ["ADMIN", "SUPERADMIN"], description: "Finance" },
  // Shared: Transfer - ADMIN/SUPERADMIN and GUDANG
  { prefix: "/dashboard/transfer/warehouses", roles: ["ADMIN", "SUPERADMIN"], description: "Master Gudang" },
  { prefix: "/dashboard/transfer/incoming", roles: ["ADMIN", "SUPERADMIN", "GUDANG"], description: "Barang Masuk" },
  { prefix: "/dashboard/transfer/outgoing", roles: ["ADMIN", "SUPERADMIN", "GUDANG"], description: "Barang Keluar" },
  { prefix: "/dashboard/transfer/finished", roles: ["ADMIN", "SUPERADMIN", "GUDANG"], description: "Barang Jadi transfer" },
  { prefix: "/dashboard/transfer/new", roles: ["ADMIN", "SUPERADMIN"], description: "New transfer" },
  { prefix: "/dashboard/transfer", roles: ["ADMIN", "SUPERADMIN", "GUDANG"], description: "Transfer overview" },
  // Inventory finished is shared
  { prefix: "/dashboard/inventory/finished", roles: ["ADMIN", "SUPERADMIN", "GUDANG"], description: "Stok Barang Jadi" },
  // Scan generic - ADMIN/SUPERADMIN quick action
  { prefix: "/dashboard/scan", roles: ["ADMIN", "SUPERADMIN"], description: "Scan generic" },
]

export function getAllowedRoles(pathname: string): UserRole[] | null {
  let matched: RouteRule | null = null
  for (const rule of ROUTE_RULES) {
    if (pathname === rule.prefix || pathname.startsWith(rule.prefix + "/") || pathname.startsWith(rule.prefix + "?") || pathname === rule.prefix) {
      if (!matched || rule.prefix.length > matched.prefix.length) {
        matched = rule
      }
    }
    if (pathname.split("?")[0].startsWith(rule.prefix) && pathname.split("?")[0] === rule.prefix) {
      if (!matched || rule.prefix.length > matched.prefix.length) matched = rule
    }
  }
  if (!matched) {
    for (const rule of ROUTE_RULES) {
      if (pathname.startsWith(rule.prefix)) {
        if (!matched || rule.prefix.length > matched.prefix.length) matched = rule
      }
    }
  }
  return matched ? matched.roles : null
}

export function canAccess(pathname: string, role: UserRole): boolean {
  const allowed = getAllowedRoles(pathname)
  if (allowed === null) return true
  if (role === "SUPERADMIN" && allowed.includes("ADMIN")) return true
  return allowed.includes(role)
}

export function isAdminLike(role: UserRole): boolean {
  return role === "ADMIN" || role === "SUPERADMIN"
}

export function getRedirectForRole(role: UserRole): string {
  switch (role) {
    case "SUPERADMIN":
    case "ADMIN": return "/dashboard/admin"
    case "QC": return "/dashboard/qc"
    case "GUDANG": return "/dashboard/gudang"
    case "KARYAWAN": return "/dashboard/karyawan"
    default: return "/sign-in"
  }
}

// Permission-based access control for API endpoints
export function checkPermission(role: string, permission: PERMISSION): boolean {
  return hasPermission(role, permission)
}

export function checkAnyPermission(role: string, permissions: PERMISSION[]): boolean {
  return hasAnyPermission(role, permissions)
}

export function requirePermission(role: string, permission: PERMISSION): { authorized: boolean; error?: Response } {
  if (!checkPermission(role, permission)) {
    return {
      authorized: false,
      error: new Response(JSON.stringify({ error: "Forbidden - Permission denied: " + permission }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    }
  }
  return { authorized: true }
}

export function requireAnyPermission(role: string, permissions: PERMISSION[]): { authorized: boolean; error?: Response } {
  if (!checkAnyPermission(role, permissions)) {
    return {
      authorized: false,
      error: new Response(JSON.stringify({ error: "Forbidden - Insufficient permissions" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    }
  }
  return { authorized: true }
}
