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
  IN_PROGRESS: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  APPROVED: "bg-[var(--chart-blue)]/10 text-[var(--chart-blue)] dark:text-[var(--chart-blue)]",
  QC_PENDING: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
}

const statusLabels: Record<string, string> = {
  ASSIGNED: "Assigned",
  IN_PROGRESS: "Produksi",
  COMPLETED: "Selesai",
  QC_PENDING: "Menunggu QC",
  PENDING: "Menunggu",
  DRAFT: "Draft",
}

export function QCDashboard() {
  const { user } = useSessionWithRole()
  
  const { data: jobOrdersResponse } = useFetch<{ data: JobOrder[]; pagination: { limit: number; offset: number; hasMore: boolean } }>("/api/job-orders?limit=100")
  const jobOrders = jobOrdersResponse?.data || []
  const { data: assignments } = useFetch<any[]>("/api/production/assign")
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
    const joMap = new Map(jobOrders.map(jo => [jo.id, jo]))
    const inProgressAssignments = (assignments as any[]).filter(a => 
      a.status === "IN_PROGRESS" && a.pendingQty > 0
    )
    return inProgressAssignments.slice(0, 5).map(a => ({
      ...a.jobOrder,
      pendingQty: a.pendingQty,
    }))
  }, [assignments, jobOrders])
  
  const recentReports = (qcReports || []).slice(0, 5)

  return (
    <div className="flex-1 space-y-4 p-3 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">QC Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome, {user?.name || "QC Staff"} - Quality Control Dashboard
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <CalendarDaysIcon className="mr-2 h-4 w-4" />
            {new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sedang Produksi</CardTitle>
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <BuildingOfficeIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Job order dalam produksi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menunggu QC</CardTitle>
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <ExclamationCircleIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingQC}</div>
            <p className="text-xs text-muted-foreground">Job order perlu di-QC</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hari Ini</CardTitle>
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <ClipboardDocumentCheckIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{qcLoading ? "-" : stats.completedToday}</div>
            <p className="text-xs text-muted-foreground">Laporan QC selesai</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sukses</CardTitle>
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{qcLoading ? "-" : `${stats.totalSuccess}`}</div>
            <p className="text-xs text-muted-foreground">Pcs lolos QC</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reject</CardTitle>
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <XMarkIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{qcLoading ? "-" : stats.totalReject}</div>
            <p className="text-xs text-muted-foreground">Pcs reject</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sedang Produksi</CardTitle>
                <CardDescription>Job order dalam proses produksi</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {inProgressJobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BuildingOfficeIcon className="h-12 w-12 mx-auto mb-2 text-yellow-500" />
                <p>Tidak ada job order dalam produksi</p>
              </div>
            ) : (
              <div className="space-y-4">
                {inProgressJobs.map((jo: any) => (
                  <div key={jo.id} className="flex items-center gap-4 p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-950/20">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{jo.joNumber}</span>
                        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                          Produksi
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Pending: {jo.pendingQty} pcs</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Job Order Perlu QC</CardTitle>
                <CardDescription>Job order yang menunggu quality control</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/qc/overview">
                  Lihat Semua
                  <ArrowRightIcon className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {notifLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : pendingJobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckIcon className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>Semua job order sudah di-QC!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingJobs.map((jo) => (
                  <div key={jo.id} className="flex items-center gap-4 p-3 rounded-lg border bg-orange-50 dark:bg-orange-950/20">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{jo.joNumber}</span>
                        <Badge className={statusColors[jo.status] || "bg-gray-100"}>
                          {statusLabels[jo.status] || jo.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{jo.product?.name || "-"}</p>
                      <p className="text-xs text-muted-foreground">Target: {jo.targetQty} pcs</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{(jo.completedQty || 0) + (jo.rejectedQty || 0)} / {jo.targetQty} Pcs</p>
                      <Link href="/dashboard/qc/overview">
                        <Button size="sm" className="mt-1">QC</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>QC Reports Terbaru</CardTitle>
                <CardDescription>Riwayat laporan quality control</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/qc-reports">
                  Lihat Semua
                  <ArrowRightIcon className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {qcLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentReports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Belum ada laporan QC</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentReports.map((report) => (
                  <div key={report.id} className="flex items-center gap-4 p-3 rounded-lg border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{report.jobOrder?.joNumber || "-"}</span>
                        <Badge variant="outline" className="text-green-600 bg-green-50 dark:bg-green-900/30">
                          +{report.successQty}
                        </Badge>
                        {report.rejectQty > 0 && (
                          <Badge variant="outline" className="text-red-600 bg-red-50 dark:bg-red-900/30">
                            -{report.rejectQty}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
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

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Aksi cepat untuk QC</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4 flex-wrap">
          <Link href="/dashboard/qc-reports">
            <Button variant="outline">
              <ClipboardDocumentCheckIcon className="mr-2 h-4 w-4" />
              Lihat Semua QC Reports
            </Button>
          </Link>
          <Link href="/dashboard/produksi">
            <Button variant="outline">
              <BuildingOfficeIcon className="mr-2 h-4 w-4" />
              Daftar Job Orders
            </Button>
          </Link>
          <Link href="/dashboard/qc/scan">
            <Button variant="outline">
              <QrCodeIcon className="mr-2 h-4 w-4" />
              Scan Barcode
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
