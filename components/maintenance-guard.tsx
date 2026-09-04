"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LoadingScreen } from "@/components/ui/loading-screen"
import { useSessionWithRole } from "@/lib/use-session-with-role"

export function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, isLoading } = useSessionWithRole()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (isLoading) return

    // Admin can always access
    if (user?.role === "ADMIN" || user?.role === "SUPERADMIN") {
      setChecking(false)
      return
    }

    // Check maintenance mode
    fetch("/api/settings/maintenance")
      .then(res => res.json())
      .then(data => {
        if (data.maintenanceMode) {
          router.push("/maintenance")
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [user, isLoading, router])

  if (isLoading || checking) {
    return <LoadingScreen />
  }

  return <>{children}</>
}