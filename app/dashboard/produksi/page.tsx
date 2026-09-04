"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  ArrowPathIcon,
  PlusIcon,
  EyeIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
} from "@heroicons/react/24/outline"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useFetch } from "@/hooks/useFetch"
import { useSessionWithRole } from "@/lib/use-session-with-role"
import { useCurrency } from "@/hooks/useCurrency"
import { toast } from "sonner"
import {
  JOB_ORDER_STATUS_LABELS, 
  JOB_ORDER_STATUS_COLORS, 
  type JobOrder, 
  type JobOrderStatus 
} from "@/types/production"

interface DeleteLinked {
  assignments: number
  qcReports: number
  productionLogs: number
  costs: number
  transactions: number
  completedQty: number
}

export default function ProduksiPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [syncing, setSyncing] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<JobOrder | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteTransactions, setDeleteTransactions] = useState(false)
  const [deleteBlocked, setDeleteBlocked] = useState<DeleteLinked | null>(null)
  
  const { user } = useSessionWithRole()
  const { formatCurrency } = useCurrency()
  const canDeleteJO = user?.isAdmin ?? false
  
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

  const openDeleteDialog = (jo: JobOrder) => {
    setDeleteTarget(jo)
    setDeleteTransactions(false)
    setDeleteBlocked(null)
    setShowDeleteDialog(true)
  }

  const handleDeleteJO = async (force = false) => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const params = new URLSearchParams()
      if (force) params.set("force", "true")
      if (deleteTransactions) params.set("deleteTransactions", "true")
      const qs = params.toString() ? `?${params.toString()}` : ""
      const res = await fetch(`/api/job-orders/${deleteTarget.id}${qs}`, {
        method: "DELETE",
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        const parts: string[] = [`JO ${deleteTarget.joNumber} dihapus`]
        if (data.deleted?.costs) parts.push(`${data.deleted.costs} biaya`)
        if (data.deleted?.transactionsDeleted) parts.push(`${data.deleted.transactionsDeleted} transaksi dihapus`)
        else if (data.deleted?.transactionsUnlinked) parts.push(`${data.deleted.transactionsUnlinked} transaksi di-unlink`)
        toast.success(parts.join(" • "))
        setShowDeleteDialog(false)
        setDeleteTarget(null)
        setDeleteBlocked(null)
        refetch()
      } else if (res.status === 409 && data.linked) {
        setDeleteBlocked(data.linked as DeleteLinked)
        toast.warning("JO sudah ada progress — perlu hapus paksa")
      } else {
        toast.error(data.error || "Gagal menghapus JO")
      }
    } catch {
      toast.error("Terjadi kesalahan saat menghapus")
    } finally {
      setDeleting(false)
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
    <div className="page-container p-3 md:p-6 pt-4">
      <PageHeader
        title="Produksi"
        description="Kelola job order dan progres produksi"
        actions={
          <Button asChild className="dark:bg-[var(--brand-primary)] dark:hover:bg-[var(--brand-primary)]/80">
            <Link href="/dashboard/produksi/new">
              <PlusIcon className="mr-2 h-4 w-4" />
              Job Order Baru
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Daftar Job Order</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <ArrowPathIcon className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSyncJobOrders}
                disabled={syncing}
                className="text-blue-600 hover:text-blue-700"
              >
                {syncing ? <Spinner data-icon="inline-start" /> : <ArrowPathIcon className="mr-2 h-4 w-4" />}
                {syncing ? "Syncing..." : "Sync Data"}
              </Button>
              <div className="h-6 w-px bg-border mx-1 hidden sm:block" />
              <ExportPrint
                columns={[
                  { key: "joNumber", label: "Nomor JO" },
                  { key: "tanggal", label: "Tanggal" },
                  { key: "productName", label: "Produk" },
                  { key: "productSku", label: "SKU" },
                  { key: "employeeName", label: "Karyawan" },
                  { key: "targetQty", label: "Target" },
                  { key: "completedQty", label: "Selesai" },
                  { key: "hppEstimated", label: "HPP Est" },
                  { key: "hppPerPcs", label: "HPP/Pcs" },
                  { key: "status", label: "Status" },
                ]}
                data={filteredJobOrders.map(jo => ({
                  ...jo,
                  tanggal: jo.createdAt ? new Date(jo.createdAt).toLocaleDateString("id-ID") : "-",
                  productName: jo.product?.name || "-",
                  productSku: jo.product?.sku || "-",
                  employeeName: jo.employee?.name || "-",
                  hppEstimated: formatCurrency(jo.hppEstimated || 0),
                  hppPerPcs: formatCurrency(jo.hppPerPcs || 0),
                  status: JOB_ORDER_STATUS_LABELS[jo.status as JobOrderStatus] || jo.status,
                }))}
                title="Daftar Job Order Produksi"
                filename="job-order-produksi"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
            <Input
              type="search"
              placeholder="Cari nomor JO, SKU, atau karyawan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:max-w-sm"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[170px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent position="popper">
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
                  <TableHead>HPP Est</TableHead>
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
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-amber-700">{jo.hppEstimated ? formatCurrency(jo.hppEstimated) : "-"}</span>
                        <span className="text-xs text-muted-foreground">{jo.hppPerPcs ? `${formatCurrency(jo.hppPerPcs)}/pcs` : "-"}</span>
                      </div>
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
                      <Badge className={`${JOB_ORDER_STATUS_COLORS[jo.status as JobOrderStatus] || "bg-gray-100 text-gray-800"}`}>
                        {JOB_ORDER_STATUS_LABELS[jo.status as JobOrderStatus] || jo.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {jo.status !== "COMPLETED" && jo.status !== "CANCELLED" && (
                          <Button 
                            variant="ghost" 
                            size="icon-lg" 
                            
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
                        <Button variant="ghost" size="icon-lg" title="Lihat detail" onClick={() => window.location.href = `/dashboard/produksi/${jo.joNumber}`}>
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                        {canDeleteJO && (
                          <Button variant="ghost" size="icon-lg" className="text-destructive hover:text-destructive hover:bg-destructive/10" title="Hapus JO" onClick={() => openDeleteDialog(jo)}>
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => { setShowDeleteDialog(open); if (!open) { setDeleteTarget(null); setDeleteBlocked(null) } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {deleteTarget?.joNumber}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  JO <strong>{deleteTarget?.joNumber}</strong> ({deleteTarget?.product?.name || "-"} • target {deleteTarget?.targetQty} pcs • status {deleteTarget ? (JOB_ORDER_STATUS_LABELS[deleteTarget.status as JobOrderStatus] || deleteTarget.status) : ""}) akan dihapus permanen beserta assignment, progress, laporan QC, rejects, logs, biaya HPP, dan notifikasi terkait. Tindakan ini tidak dapat dibatalkan!
                </p>
                <div className="flex items-start gap-2 rounded-md border p-2.5">
                  <Checkbox
                    id="delete-transactions"
                    checked={deleteTransactions}
                    onCheckedChange={(v) => setDeleteTransactions(v === true)}
                  />
                  <Label htmlFor="delete-transactions" className="text-xs font-normal leading-5 cursor-pointer">
                    Hapus juga transaksi keuangan yang tertaut ke JO ini. Jika tidak dicentang, transaksi tetap ada tapi kolom JO-nya dikosongkan (audit finance aman).
                  </Label>
                </div>
                {deleteBlocked && (
                  <div className="rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800">
                    <p className="font-semibold mb-1">JO ini sudah ada progress:</p>
                    <p>
                      {deleteBlocked.assignments} assignment • {deleteBlocked.qcReports} QC • {deleteBlocked.productionLogs} logs • {deleteBlocked.costs} biaya • {deleteBlocked.transactions} transaksi • selesai {deleteBlocked.completedQty} pcs.
                    </p>
                    <p className="mt-1">Gunakan tombol Hapus Paksa jika benar-benar yakin.</p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            {deleteBlocked ? (
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); handleDeleteJO(true) }}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Menghapus..." : "Ya, Hapus Paksa"}
              </AlertDialogAction>
            ) : (
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); handleDeleteJO(false) }}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Menghapus..." : "Ya, Hapus"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
