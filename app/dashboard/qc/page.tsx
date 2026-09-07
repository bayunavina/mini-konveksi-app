"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSessionWithRole } from "@/lib/use-session-with-role"
import { LoadingScreen } from "@/components/ui/loading-screen"
import { QCDashboard } from "../qc-dashboard"

export default function QCPage() {
  const { user, isLoading } = useSessionWithRole()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user && user.role !== "QC") {
      router.replace("/dashboard")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return <LoadingScreen />
  }

  if (user?.role !== "QC") {
    return <LoadingScreen />
  }

  return <QCDashboard />
}
