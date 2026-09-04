"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSessionWithRole } from "@/lib/use-session-with-role"
import { LoadingScreen } from "@/components/ui/loading-screen"
import { AdminDashboard } from "../admin-dashboard"

export default function AdminPage() {
  const { user, isLoading } = useSessionWithRole()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user && user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
      router.replace("/dashboard")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return <LoadingScreen />
  }

  if (user?.role !== "ADMIN" && user?.role !== "SUPERADMIN") {
    return <LoadingScreen />
  }

  return <AdminDashboard />
}
