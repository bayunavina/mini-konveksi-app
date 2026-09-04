"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useSessionWithRole } from "@/lib/use-session-with-role"
import { canAccess, getRedirectForRole } from "@/lib/rbac"
import { LoadingScreen } from "@/components/ui/loading-screen"

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading } = useSessionWithRole()

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      // Not authenticated — middleware should handle, but fallback
      router.replace("/sign-in")
      return
    }
    // GUEST means user exists in auth but no employees row — force to sign-in with message
    if (user.role === "GUEST") {
      // Allow dashboard root to show loading, but redirect GUEST to sign-in
      // Could also show error, but redirect is cleaner
      return
    }
    if (!canAccess(pathname, user.role)) {
      const target = getRedirectForRole(user.role)
      // Avoid redirect loop if already at target
      if (pathname !== target) {
        router.replace(target)
      }
    }
  }, [pathname, user, isLoading, router])

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <LoadingScreen />
  }

  if (user.role === "GUEST") {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh] p-8">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">Akun belum terdaftar sebagai karyawan</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Email <span className="font-mono">{user.email}</span> tidak ditemukan di data karyawan.
            Hubungi admin untuk menambahkan akun Anda ke daftar karyawan dengan role KARYAWAN / QC / GUDANG.
          </p>
          <p className="text-xs text-muted-foreground">
            Default akun aplikasi: <span className="font-mono">erpkonveksi@gmail.com</span> (ADMIN)
          </p>
        </div>
      </div>
    )
  }

  if (!canAccess(pathname, user.role)) {
    return <LoadingScreen />
  }

  return <>{children}</>
}
