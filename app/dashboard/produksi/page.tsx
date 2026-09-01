"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  PlusIcon,
  EyeIcon,
  TrashIcon,
  PauseIcon,
  PlayIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { PageHeader } from "@/components/shared"
import { ExportPrint } from "@/components/shared/export-print"
import { useFetch } from "@/hooks/useFetch"
import { useSessionWithRole } from "@/lib/use-session-with-role"
import { toast } from "sonner"
import { 
  JOB_ORDER_STATUS_LABELS, 
  JOB_ORDER_STATUS_COLORS, 
  type JobOrder, 
  type JobOrderStatus 
} from "@/types/production"

const SUPERADMIN_EMAIL = "erpkonveksi@gmail.com"

export default function ProduksiPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  
  const { user } = useSessionWithRole()
  const isSuperadmin = user?.email === SUPERADMIN_EMAIL
  
  const { data: response, loading, refetch } = useFetch<{
    data: JobOrder[]
    pagination: { hasMore: boolean; limit: number; offset: number }
  }>(`/api/job-orders?limit=100`)

  const jobOrders = response?.data || []

  const filteredJobOrders = jobOrders.filter((jo) => {
    const matchesSearch = jo.joNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      jo.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      jo.product?.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      jo.employee?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === "ALL" || jo.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const handleResetProduction = async () => {
    setResetting(true)
    try {
      const response = await fetch("/api/production/reset", {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Semua data produksi berhasil di-reset")
        setShowResetDialog(false)
        refetch()
      } else {
        const data = await response.json()
        toast.error(data.error || "Gagal reset data produksi")
      }
    } catch {
      toast.error("Terjadi kesalahan saat reset")
    } finally {
      setResetting(false)
    }
  }

  const handleSyncJobOrders = async () => {
    setSyncing(true)
    try {
      const response = await fetch("/api/job-orders/sync", {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Berhasil sinkronisasi ${data.syncedCount} job orders`)
        refetch()
      } else {
        const data = await response.json()
        toast.error(data.error || "Gagal sinkronisasi data")
      }
    } catch {
      toast.error("Terjadi kesalahan saat sinkronisasi")
    } finally {
      setSyncing(false)
    }
  }

  const handleHoldToggle = async (joId: string, currentStatus: string) => {
    const newStatus = currentStatus === "HOLD" ? "IN_PROGRESS" : "HOLD"
    try {
      const response = await fetch(`/api/job-orders/${joId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (response.ok) {
        toast.success(newStatus === "HOLD" ? "Job Order di-hold" : "Job Order dilanjutkan")
        refetch()
      } else {
        toast.error("Gagal mengubah status")
      }
    } catch {
      toast.error("Terjadi kesalahan")
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 pt-4">
      <PageHeader
        title="Produksi"
        description="Kelola job order dan progres produksi"
        actions={
          <Button asChild className="dark:bg-[#304ffe] dark:hover:bg-[#304ffe]/80">
            <Link href="/dashboard/produksi/new">
              <PlusIcon className="mr-2 h-4 w-4" />
              Job Order Baru
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Daftar Job Order</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSyncJobOrders}
                disabled={syncing}
                className="text-blue-600 hover:text-blue-700"
              >
                <ArrowPathIcon className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing..." : "Sync Data"}
              </Button>
              {isSuperadmin && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  className="text-white"
                  onClick={() => setShowResetDialog(true)}
                >
                  <TrashIcon className="mr-2 h-4 w-4" />
                  Reset Data
                </Button>
              )}
              <ExportPrint
                columns={[
                  { key: "joNumber", label: "Nomor JO" },
                  { key: "tanggal", label: "Tanggal" },
                  { key: "productName", label: "Produk" },
                  { key: "productSku", label: "SKU" },
                  { key: "employeeName", label: "Karyawan" },
                  { key: "targetQty", label: "Target" },
                  { key: "completedQty", label: "Selesai" },
                  { key: "status", label: "Status" },
                ]}
                data={filteredJobOrders.map(jo => ({
                  ...jo,
                  tanggal: jo.createdAt ? new Date(jo.createdAt).toLocaleDateString("id-ID") : "-",
                  productName: jo.product?.name || "-",
                  productSku: jo.product?.sku || "-",
                  employeeName: jo.employee?.name || "-",
                  status: JOB_ORDER_STATUS_LABELS[jo.status as JobOrderStatus] || jo.status,
                }))}
                title="Daftar Job Order Produksi"
                filename="job-order-produksi"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <Input
              type="search"
              placeholder="Cari nomor JO, SKU, atau karyawan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:max-w-sm"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Status</SelectItem>
                {Object.entries(JOB_ORDER_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-md" />
              ))}
            </div>
          ) : filteredJobOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/20">
              <p>Belum ada Job Order ditemukan.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor JO</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Produk / SKU</TableHead>
                  <TableHead>Nama Karyawan</TableHead>
                  <TableHead>Target / Selesai</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobOrders.map((jo) => (
                  <TableRow key={jo.id}>
                    <TableCell className="font-medium text-primary hover:underline cursor-pointer" onClick={() => window.location.href = `/dashboard/produksi/${jo.joNumber}`}>
                      {jo.joNumber}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {jo.createdAt ? new Date(jo.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{jo.product?.name || "-"}</span>
                        <span className="text-xs text-muted-foreground">{jo.product?.sku || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {jo.employee?.name || "-"}
                    </TableCell>
                    <TableCell>
                      {(jo.acceptedQty ?? jo.completedQty)} / {jo.targetQty}
                    </TableCell>
                    <TableCell>
                      <div className="w-[100px] flex items-center gap-2">
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary"
                            style={{ width: `${Math.min(((jo.acceptedQty ?? jo.completedQty) / (jo.targetQty || 1)) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs">{Math.round(((jo.acceptedQty ?? jo.completedQty) / (jo.targetQty || 1)) * 100)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={JOB_ORDER_STATUS_COLORS[jo.status as JobOrderStatus] || "bg-gray-100 text-gray-800"}>
                        {JOB_ORDER_STATUS_LABELS[jo.status as JobOrderStatus] || jo.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {jo.status !== "COMPLETED" && jo.status !== "CANCELLED" && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            title={jo.status === "HOLD" ? "Lanjutkan" : "Hold"}
                            onClick={() => handleHoldToggle(jo.id, jo.status)}
                          >
                            {jo.status === "HOLD" ? (
                              <PlayIcon className="h-4 w-4 text-green-600" />
                            ) : (
                              <PauseIcon className="h-4 w-4 text-orange-600" />
                            )}
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.location.href = `/dashboard/produksi/${jo.joNumber}`}>
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Semua Data Produksi?</AlertDialogTitle>
            <AlertDialogDescription>
              Peringatan: Semua progress produksi akan di-reset ke nol. Job Order tetap ada dengan status &quot;Draft&quot;. QC Reports dan Stok Material juga akan di-reset. Tindakan ini tidak dapat dibatalkan!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetProduction}
              disabled={resetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {resetting ? "Mereset..." : "Ya, Reset Semua"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
