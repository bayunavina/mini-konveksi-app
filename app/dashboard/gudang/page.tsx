"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSessionWithRole } from "@/lib/use-session-with-role"
import { Spinner } from "@/components/ui/spinner"
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
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Spinner className="size-8 text-primary" />
      </div>
    )
  }

  if (user?.role !== "GUDANG") {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Spinner className="size-8 text-primary" />
      </div>
    )
  }

  return <GudangDashboard />
}
