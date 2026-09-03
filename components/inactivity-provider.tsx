"use client"

import { useInactivityLogout } from "@/hooks/useInactivityLogout"
import { useSessionWithRole } from "@/lib/use-session-with-role"

export function InactivityProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useSessionWithRole()
  // Only enable when user is authenticated (not GUEST and not null)
  const enabled = !isLoading && !!user && user.role !== "GUEST"

  useInactivityLogout({ enabled, timeoutMs: 5 * 60 * 1000 })

  return <>{children}</>
}
