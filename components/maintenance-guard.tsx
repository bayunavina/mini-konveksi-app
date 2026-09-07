"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LoadingScreen } from "@/components/ui/loading-screen"
import { useSessionWithRole } from "@/lib/use-session-with-role"

export function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, isLoading } = useSessionWithRole()
  const [checking, setChecking] = useState(true)

  // Fallback: never block the UI forever waiting on role/maintenance checks.
  useEffect(() => {
    const t = setTimeout(() => setChecking(false), 8000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (isLoading) return

    // Admin can always access
    if (user?.role === "ADMIN" || user?.role === "SUPERADMIN") {
      setChecking(false)
      return
    }

    // Check maintenance mode
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    fetch("/api/settings/maintenance", { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (data.maintenanceMode) {
          router.push("/maintenance")
        }
      })
      .catch(() => {})
      .finally(() => {
        clearTimeout(timeout)
        setChecking(false)
      })

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [user, isLoading, router])

  if (isLoading || checking) {
    return <LoadingScreen />
  }

  return <>{children}</>
}