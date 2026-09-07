"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSessionWithRole } from "@/lib/use-session-with-role"
import { LoadingScreen } from "@/components/ui/loading-screen"
import { GudangDashboard } from "../gudang-dashboard"

export default function GudangPage() {
  const { user, isLoading } = useSessionWithRole()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user && user.role !== "GUDANG") {
      router.replace("/dashboard")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return <LoadingScreen />
  }

  if (user?.role !== "GUDANG") {
    return <LoadingScreen />
  }

  return <GudangDashboard />
}
