"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BuildingOfficeIcon,
  ClipboardDocumentCheckIcon,
  QrCodeIcon,
  CalendarDaysIcon,
  ArrowRightIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline"
import Link from "next/link"
import { useFetch } from "@/hooks/useFetch"
import { useSessionWithRole } from "@/lib/use-session-with-role"

interface JobOrder {
  id: string
  joNumber: string
  targetQty: number
  completedQty: number
  rejectedQty: number
  status: string
  createdAt: string
  product: {
    id: string
    name: string
    sku: string
  } | null
}

interface QCReport {
  id: string
  successQty: number
  rejectQty: number
  notes: string | null
  createdAt: string
  jobOrder: {
    id: string
    joNumber: string
  }
  employee: {
    id: string
    name: string
  } | null
}

const statusColors: Record<string, string> = {
  ASSIGNED: "bg-[var(--chart-blue)]/10 text-[var(--chart-blue)] dark:text-[var(--chart-blue)]",
  IN_PROGRESS: "bg-warning-light text-warning-foreground dark:bg-warning-light dark:text-warning-foreground",
  COMPLETED: "bg-success-light text-success-foreground dark:bg-success-light dark:text-success-foreground",
  DRAFT: "bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground",
  APPROVED: "bg-[var(--chart-blue)]/10 text-[var(--chart-blue)] dark:text-[var(--chart-blue)]",
  QC_PENDING: "bg-warning-light text-warning-foreground dark:bg-warning-light dark:text-warning-foreground",
  PENDING: "bg-warning-light text-warning-foreground dark:bg-warning-light dark:text-warning-foreground",
}

const statusLabels: Record<string, string> = {
  ASSIGNED: "Assigned",
  IN_PROGRESS: "Produksi",
  COMPLETED: "Selesai",
  QC_PENDING: "Menunggu QC",
  PENDING: "Menunggu",
  DRAFT: "Draft",
}

interface Assignment {
  id: string
  status: string
  pendingQty: number
  jobOrder?: {
    id: string
    joNumber: string
    status: string
  }
}

export function QCDashboard() {
  const { user } = useSessionWithRole()
  
  const { data: jobOrdersResponse, loading: joLoading } = useFetch<{ data: JobOrder[]; pagination: { limit: number; offset: number; hasMore: boolean } }>("/api/job-orders?limit=100")
  const jobOrders = jobOrdersResponse?.data || []
  const { data: assignments, loading: assignLoading } = useFetch<Assignment[]>("/api/production/assign")
  const { data: qcReports, loading: qcLoading } = useFetch<QCReport[]>("/api/qc-reports")
  const { loading: notifLoading } = useFetch("/api/notifications?type=PROGRESS_UPDATE")

  const [stats, setStats] = useState({
    pendingQC: 0,
    inProgress: 0,
    completedToday: 0,
    totalSuccess: 0,
    totalReject: 0,
  })

  useEffect(() => {
    if (jobOrders && Array.isArray(jobOrders) && assignments && Array.isArray(assignments)) {
      const qcPending = jobOrders.filter(jo => jo.status === "QC_PENDING").length
      const inProgressWithPending = assignments.filter(a => 
        a.status === "IN_PROGRESS" && a.pendingQty > 0
      ).length
      setStats(prev => {
        if (prev.pendingQC === qcPending && prev.inProgress === inProgressWithPending) return prev
        return { ...prev, pendingQC: qcPending, inProgress: inProgressWithPending }
      })
    }
  }, [jobOrders, assignments])

  useEffect(() => {
    if (qcReports && Array.isArray(qcReports)) {
      const today = new Date().toDateString()
      const todayCount = qcReports.filter(r => new Date(r.createdAt).toDateString() === today).length
      const totalSuccess = qcReports.reduce((sum, r) => sum + (r.successQty || 0), 0)
      const totalReject = qcReports.reduce((sum, r) => sum + (r.rejectQty || 0), 0)
      setStats(prev => {
        if (prev.completedToday === todayCount && prev.totalSuccess === totalSuccess && prev.totalReject === totalReject) return prev
        return { ...prev, completedToday: todayCount, totalSuccess, totalReject }
      })
    }
  }, [qcReports])

  const pendingJobs = useMemo(() => {
    const pendingJO = jobOrders?.filter(jo => jo.status === "QC_PENDING") || []
    return pendingJO.slice(0, 5)
  }, [jobOrders])
  
  const inProgressJobs = useMemo(() => {
    if (!assignments || !jobOrders) return []
    const inProgressAssignments = assignments.filter(a => 
      a.status === "IN_PROGRESS" && a.pendingQty > 0
    )
    return inProgressAssignments.slice(0, 5).map(a => ({
      ...a.jobOrder,
      pendingQty: a.pendingQty,
    }))
  }, [assignments, jobOrders])
  
  const recentReports = (qcReports || []).slice(0, 5)

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-2 sm:mb-3 animate-slide-up">
        <div className="min-w-0">
          <h2 className="text-base sm:text-xl lg:text-2xl font-bold tracking-tight truncate">QC Dashboard</h2>
          <p className="text-[10px] sm:text-sm text-muted-foreground truncate">
            Welcome, {user?.name || "QC Staff"} - Quality Control Dashboard
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline">
            <CalendarDaysIcon className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Card className="overflow-hidden animate-slide-up">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 sm:pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
            <CardTitle className="text-[10px] sm:text-xs md:text-sm font-medium truncate pr-1">Sedang Produksi</CardTitle>
            <div className="p-1.5 sm:p-2 rounded-lg bg-warning-light dark:bg-warning-light shrink-0">
              <BuildingOfficeIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-warning-foreground dark:text-warning-foreground" />
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
            <div className="text-xl sm:text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Job order dalam produksi</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden animate-slide-up" style={{ animationDelay: '40ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 sm:pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
            <CardTitle className="text-[10px] sm:text-xs md:text-sm font-medium truncate pr-1">Menunggu QC</CardTitle>
            <div className="p-1.5 sm:p-2 rounded-lg bg-warning-light dark:bg-warning-light shrink-0">
              <ExclamationCircleIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-warning-foreground dark:text-warning-foreground" />
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
            <div className="text-xl sm:text-2xl font-bold">{stats.pendingQC}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Job order perlu di-QC</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden animate-slide-up" style={{ animationDelay: '80ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 sm:pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
            <CardTitle className="text-[10px] sm:text-xs md:text-sm font-medium truncate pr-1">Hari Ini</CardTitle>
            <div className="p-1.5 sm:p-2 rounded-lg bg-success-light dark:bg-success-light shrink-0">
              <ClipboardDocumentCheckIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-success-foreground dark:text-success-foreground" />
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
            <div className="text-xl sm:text-2xl font-bold">{qcLoading ? "-" : stats.completedToday}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Laporan QC selesai</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden animate-slide-up" style={{ animationDelay: '120ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 sm:pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
            <CardTitle className="text-[10px] sm:text-xs md:text-sm font-medium truncate pr-1">Total Sukses</CardTitle>
            <div className="p-1.5 sm:p-2 rounded-lg bg-success-light dark:bg-success-light shrink-0">
              <CheckIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-success-foreground dark:text-success-foreground" />
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
            <div className="text-xl sm:text-2xl font-bold">{qcLoading ? "-" : `${stats.totalSuccess}`}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Pcs lolos QC</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden animate-slide-up" style={{ animationDelay: '160ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 sm:pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
            <CardTitle className="text-[10px] sm:text-xs md:text-sm font-medium truncate pr-1">Total Reject</CardTitle>
            <div className="p-1.5 sm:p-2 rounded-lg bg-destructive/10 dark:bg-destructive/10 shrink-0">
              <XMarkIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive dark:text-destructive" />
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
            <div className="text-xl sm:text-2xl font-bold text-destructive dark:text-destructive">{qcLoading ? "-" : stats.totalReject}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Pcs reject</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-5 md:grid-cols-2">
        <Card className="overflow-hidden animate-slide-up" style={{ animationDelay: '200ms' }}>
          <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-4 pb-0">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <CardTitle className="text-sm sm:text-base">Sedang Produksi</CardTitle>
                <CardDescription className="text-[10px] sm:text-xs">Job order dalam proses produksi</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 py-3 sm:py-4">
            {(joLoading || assignLoading) ? (
              <div className="space-y-3 sm:space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 sm:h-16 w-full" />
                ))}
              </div>
            ) : inProgressJobs.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <BuildingOfficeIcon className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 text-warning-foreground" />
                <p className="text-xs sm:text-sm">Tidak ada job order dalam produksi</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-4">
                {inProgressJobs.map((jo) => (
                  <div key={jo.id} className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg border bg-warning-light dark:bg-warning-light/20">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="font-medium text-xs sm:text-sm truncate">{jo.joNumber}</span>
                        <Badge className="bg-warning-light text-warning-foreground dark:bg-warning-light dark:text-warning-foreground text-[10px] sm:text-xs">
                          Produksi
                        </Badge>
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Pending: {jo.pendingQty} pcs</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden animate-slide-up" style={{ animationDelay: '240ms' }}>
          <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-4 pb-0">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <CardTitle className="text-sm sm:text-base">Job Order Perlu QC</CardTitle>
                <CardDescription className="text-[10px] sm:text-xs">Job order yang menunggu quality control</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="shrink-0">
                <Link href="/dashboard/qc/overview">
                  <span className="hidden sm:inline">Lihat Semua</span>
                  <ArrowRightIcon className="ml-0.5 sm:ml-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 py-3 sm:py-4">
            {notifLoading ? (
              <div className="space-y-3 sm:space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 sm:h-16 w-full" />
                ))}
              </div>
            ) : pendingJobs.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <CheckIcon className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 text-success-foreground" />
                <p className="text-xs sm:text-sm">Semua job order sudah di-QC!</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-4">
                {pendingJobs.map((jo) => (
                  <div key={jo.id} className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg border bg-warning-light dark:bg-warning-light/20">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="font-medium text-xs sm:text-sm truncate">{jo.joNumber}</span>
                        <Badge className={`${statusColors[jo.status] || "bg-muted"} text-[10px] sm:text-xs`}>
                          {statusLabels[jo.status] || jo.status}
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{jo.product?.name || "-"}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Target: {jo.targetQty} pcs</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs sm:text-sm font-medium">{(jo.completedQty || 0) + (jo.rejectedQty || 0)} / {jo.targetQty} Pcs</p>
                      <Link href="/dashboard/qc/overview">
                        <Button size="sm" className="mt-1 text-xs">QC</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden animate-slide-up md:col-span-2 lg:col-span-1" style={{ animationDelay: '280ms' }}>
          <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-4 pb-0">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <CardTitle className="text-sm sm:text-base">QC Reports Terbaru</CardTitle>
                <CardDescription className="text-[10px] sm:text-xs">Riwayat laporan quality control</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="shrink-0">
                <Link href="/dashboard/qc-reports">
                  <span className="hidden sm:inline">Lihat Semua</span>
                  <ArrowRightIcon className="ml-0.5 sm:ml-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 py-3 sm:py-4">
            {qcLoading ? (
              <div className="space-y-2 sm:space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 sm:h-12 w-full" />
                ))}
              </div>
            ) : recentReports.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <p className="text-xs sm:text-sm">Belum ada laporan QC</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {recentReports.map((report) => (
                  <div key={report.id} className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="font-medium text-xs sm:text-sm truncate">{report.jobOrder?.joNumber || "-"}</span>
                        <Badge variant="outline" className="text-success-foreground bg-success-light dark:bg-success-light text-[10px] sm:text-xs">
                          +{report.successQty}
                        </Badge>
                        {report.rejectQty > 0 && (
                          <Badge variant="outline" className="text-destructive bg-destructive-light dark:bg-destructive/10 text-[10px] sm:text-xs">
                            -{report.rejectQty}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                        {report.employee?.name || "System"} • {new Date(report.createdAt).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden animate-slide-up" style={{ animationDelay: '320ms' }}>
        <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-4 pb-0">
          <CardTitle className="text-sm sm:text-base">Quick Actions</CardTitle>
          <CardDescription className="text-[10px] sm:text-xs">Aksi cepat untuk QC</CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 py-3 sm:py-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            <Link href="/dashboard/qc-reports" className="min-w-0">
              <Button variant="outline" size="lg" className="w-full flex-col gap-0.5 px-1 text-[10px] leading-tight whitespace-normal sm:flex-row sm:gap-1 sm:px-2.5 sm:text-xs sm:leading-relaxed sm:whitespace-nowrap">
                <ClipboardDocumentCheckIcon className="h-3.5 w-3.5 shrink-0 sm:mr-1 sm:h-4 sm:w-4" />
                <span><span className="hidden xs:inline">Lihat Semua </span>QC Reports</span>
              </Button>
            </Link>
            <Link href="/dashboard/produksi" className="min-w-0">
              <Button variant="outline" size="lg" className="w-full flex-col gap-0.5 px-1 text-[10px] leading-tight whitespace-normal sm:flex-row sm:gap-1 sm:px-2.5 sm:text-xs sm:leading-relaxed sm:whitespace-nowrap">
                <BuildingOfficeIcon className="h-3.5 w-3.5 shrink-0 sm:mr-1 sm:h-4 sm:w-4" />
                <span>Daftar Job Orders</span>
              </Button>
            </Link>
            <Link href="/dashboard/qc/scan" className="min-w-0">
              <Button variant="outline" size="lg" className="w-full flex-col gap-0.5 px-1 text-[10px] leading-tight whitespace-normal sm:flex-row sm:gap-1 sm:px-2.5 sm:text-xs sm:leading-relaxed sm:whitespace-nowrap">
                <QrCodeIcon className="h-3.5 w-3.5 shrink-0 sm:mr-1 sm:h-4 sm:w-4" />
                <span>Scan Barcode</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Spacing for Mobile Gesture Bar */}
      <div className="h-2 md:hidden" />
    </div>
  )
}
