"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSessionWithRole } from "@/lib/use-session-with-role"
import { Spinner } from "@/components/ui/spinner"

export default function DashboardPage() {
  const { user, isLoading } = useSessionWithRole()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user) {
      switch (user.role) {
        case "SUPERADMIN":
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
          router.replace("/sign-in")
      }
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner className="size-8 text-primary" />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner className="size-8 text-primary" />
    </div>
  )
}
