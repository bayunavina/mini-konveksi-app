"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSessionWithRole } from "@/lib/use-session-with-role"
import { Loader2 } from "lucide-react"

export default function DashboardPage() {
  const { user, isLoading } = useSessionWithRole()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user) {
      switch (user.role) {
        case "ADMIN":
          router.replace("/dashboard/admin")
          break
        case "QC":
          router.replace("/dashboard/qc")
          break
        case "GUDANG":
          router.replace("/dashboard/gudang")
          break
        case "KARYAWAN":
          router.replace("/dashboard/karyawan")
          break
        default:
          router.replace("/dashboard/karyawan")
      }
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}
