"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"
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
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner className="size-8 text-primary" />
      </div>
    )
  }

  return <>{children}</>
}