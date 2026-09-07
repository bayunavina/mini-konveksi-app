"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSessionWithRole } from "@/lib/use-session-with-role"
import { LoadingScreen } from "@/components/ui/loading-screen"
import { KaryawanDashboard } from "../karyawan-dashboard"

export default function KaryawanPage() {
  const { user, isLoading } = useSessionWithRole()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user && user.role !== "KARYAWAN") {
      // ADMIN / GUDANG / QC yang akses /dashboard/karyawan akan diarahkan ke dashboard sesuai role
      router.replace("/dashboard")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return <LoadingScreen />
  }

  if (user?.role !== "KARYAWAN") {
    return <LoadingScreen />
  }

  return <KaryawanDashboard />
}
