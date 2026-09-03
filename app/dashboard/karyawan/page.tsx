"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSessionWithRole } from "@/lib/use-session-with-role"
import { Spinner } from "@/components/ui/spinner"
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
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Spinner className="size-8 text-primary" />
      </div>
    )
  }

  if (user?.role !== "KARYAWAN") {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Spinner className="size-8 text-primary" />
      </div>
    )
  }

  return <KaryawanDashboard />
}
