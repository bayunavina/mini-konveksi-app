"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { useSessionWithRole } from "@/lib/use-session-with-role"

const printStyles = `
  @media print {
    .no-print { display: none !important; }
    .print-only { display: block !important; }
    body { font-size: 12px; }
    .card { border: 1px solid #ddd !important; box-shadow: none !important; }
  }
  .print-only { display: none; }
`
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/shared"
import {
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon,
  PencilIcon,
  PrinterIcon,
  CubeIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline"
import { JOB_ORDER_STATUS_LABELS, JOB_ORDER_STATUS_COLORS, type JobOrderStatus } from "@/types/production"
import { formatDate } from "@/lib/utils"

interface JobOrderDetail {
  id: string
  joNumber: string
  targetQty: number
  completedQty: number
  rejectedQty: number
  acceptedQty?: number
  status: JobOrderStatus
  dueDate?: string
  notes?: string
  createdAt: string
  product?: {
    id: string
    sku: string
    name: string
  }
  team?: {
    id: string
    name: string
  }
  reports?: Array<{
    id: string
    date: string
    success: number
    reject: number
    notes?: string
    reportedBy?: string
  }>
}

export default function JobOrderDetailPage({ params }: { params: Promise<{ joNumber: string }> }) {
  const { joNumber } = use(params)
  const router = useRouter()
  const { user } = useSessionWithRole()
  const userRole = user?.role || "GUEST"
  const isKaryawan = userRole === "KARYAWAN"
  const backUrl = isKaryawan ? "/dashboard" : "/dashboard/produksi"
  
  const handleBack = () => {
    router.push(backUrl)
  }
  
  const [jobOrder, setJobOrder] = useState<JobOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [qcDialogOpen, setQCDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [reportData, setReportData] = useState({ success: "", reject: "", notes: "" })
  const [editData, setEditData] = useState({
    targetQty: 0,
    dueDate: "",
    notes: "",
  })

  useEffect(() => {
    fetchJobOrder()
  }, [joNumber])

  useEffect(() => {
    if (jobOrder?.joNumber) {
      document.title = `JO ${jobOrder.joNumber} - Mini Konveksi`
    }
  }, [jobOrder])

  const fetchJobOrder = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/job-orders/${joNumber}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setJobOrder(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  const progressPercent = jobOrder 
    ? Math.round((jobOrder.completedQty / jobOrder.targetQty) * 100) 
    : 0

  const handleSubmitReport = async () => {
    if (!jobOrder) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/qc-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobOrderId: jobOrder.id,
          successQty: parseInt(reportData.success || "0"),
          rejectQty: parseInt(reportData.reject || "0"),
          notes: reportData.notes,
          rejectReason: reportData.reject && parseInt(reportData.reject) > 0 ? "Tidak lolos QC" : null,
        }),
      })
      if (res.ok) {
        await fetchJobOrder()
        setReportDialogOpen(false)
        setReportData({ success: "", reject: "", notes: "" })
      } else {
        const error = await res.json()
        console.error("Error:", error)
      }
    } catch (err) {
      console.error("Error submitting report:", err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleApproveQC = async () => {
    if (!jobOrder) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/job-orders/${jobOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      })
      if (res.ok) {
        await fetchJobOrder()
        setQCDialogOpen(false)
      }
    } catch (err) {
      console.error("Error approving QC:", err)
    } finally {
      setSubmitting(false)
    }
  }

  const openEditDialog = () => {
    if (!jobOrder) return
    setEditData({
      targetQty: jobOrder.targetQty,
      dueDate: jobOrder.dueDate || "",
      notes: jobOrder.notes || "",
    })
    setEditDialogOpen(true)
  }

  const handleEdit = async () => {
    if (!jobOrder) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/job-orders/${jobOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetQty: parseInt(editData.targetQty.toString()) || jobOrder.targetQty,
          dueDate: editData.dueDate || null,
          notes: editData.notes || null,
        }),
      })
      if (res.ok) {
        await fetchJobOrder()
        setEditDialogOpen(false)
      }
    } catch (err) {
      console.error("Error editing job order:", err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-6 px-4 md:px-6 pt-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error || !jobOrder) {
    return (
      <div className="flex-1 space-y-6 px-4 md:px-6 pt-4">
        <PageHeader
          title="Error"
          description={error || "Job order not found"}
        />
        <Button asChild>
          <Link href="/dashboard/produksi">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Kembali
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <style>{printStyles}</style>
      <div className="flex-1 space-y-6 px-4 md:px-6 pt-4 no-print">
        <PageHeader
          title={jobOrder.joNumber}
          description="Detail job order produksi"
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Kembali
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <PrinterIcon className="mr-2 h-4 w-4" />
                Print
              </Button>
              {!isKaryawan && (
                <Button variant="outline" onClick={openEditDialog}>
                  <PencilIcon className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>
          }
        />
      </div>
      
      <div className="grid gap-6 px-4 md:px-6 pb-4 md:grid-cols-2">
        <Card className="p-0">
          <CardHeader className="pb-4 pt-5 px-5 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Informasi Job Order</CardTitle>
                <CardDescription>Detail JO #{jobOrder.joNumber}</CardDescription>
              </div>
              <Badge className={JOB_ORDER_STATUS_COLORS[jobOrder.status]}>
                {JOB_ORDER_STATUS_LABELS[jobOrder.status]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 px-5 py-5">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">SKU</p>
                <p className="font-medium">{jobOrder.product?.name || "-"}</p>
                <p className="text-xs text-muted-foreground">{jobOrder.product?.sku}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Tim Produksi</p>
                <p className="font-medium">{jobOrder.team?.name || "-"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Target</p>
                <p className="font-medium">{jobOrder.targetQty} Pcs</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Selesai</p>
                <p className="font-medium">{jobOrder.completedQty} Pcs</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Reject</p>
                <p className="font-medium">{jobOrder.rejectedQty} Pcs</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Deadline</p>
                <p className="font-medium">
                  {formatDate(jobOrder.dueDate)}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span className="font-medium">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-3" />
            </div>
          </CardContent>
        </Card>

        <Card className="p-0">
          <CardHeader className="pb-4 pt-5 px-5 border-b">
            <CardTitle>Statistik</CardTitle>
            <CardDescription>Ringkasan job order</CardDescription>
          </CardHeader>
          <CardContent className="px-5 py-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                <p className="text-sm text-green-600 font-medium">Berhasil (QC)</p>
                <p className="text-2xl font-bold text-green-700">{jobOrder.acceptedQty ?? jobOrder.completedQty}</p>
                <p className="text-xs text-green-600/70">Pcs</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                <p className="text-sm text-red-600 font-medium">Reject</p>
                <p className="text-2xl font-bold text-red-700">{jobOrder.rejectedQty}</p>
                <p className="text-xs text-red-600/70">Pcs</p>
              </div>
              <div className="p-4 bg-[var(--chart-blue)]/10 rounded-lg border border-[var(--chart-blue)]/20">
                <p className="text-sm text-[var(--chart-blue)] font-medium">Total Diproduksi</p>
                <p className="text-2xl font-bold text-[var(--chart-blue)]">
                  {(jobOrder.acceptedQty ?? jobOrder.completedQty) + jobOrder.rejectedQty}
                </p>
                <p className="text-xs text-[var(--chart-blue)]/70">Pcs</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                <p className="text-sm text-yellow-600 font-medium">Sisa Target</p>
                <p className="text-2xl font-bold text-yellow-700">
                  {Math.max(0, jobOrder.targetQty - (jobOrder.acceptedQty ?? jobOrder.completedQty) - jobOrder.rejectedQty)}
                </p>
                <p className="text-xs text-yellow-600/70">Pcs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mx-4 md:mx-6 mb-4 p-0">
        <CardHeader className="pb-4 pt-5 px-5 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Laporan Produksi</CardTitle>
              <CardDescription>Riwayat laporan hasil produksi</CardDescription>
            </div>
            <div className="flex gap-2">
              {!isKaryawan && jobOrder.status === "IN_PROGRESS" && (
                <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <CubeIcon className="mr-2 h-4 w-4" />
                      Input Hasil
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Input Hasil Produksi</DialogTitle>
                      <DialogDescription>
                        Masukkan jumlah hasil produksi hari ini
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Berhasil (Pcs)</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={reportData.success}
                          onChange={(e) => setReportData({ ...reportData, success: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Reject (Pcs)</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={reportData.reject}
                          onChange={(e) => setReportData({ ...reportData, reject: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Catatan</Label>
                        <Textarea
                          placeholder="Tambahkan catatan jika ada..."
                          value={reportData.notes}
                          onChange={(e) => setReportData({ ...reportData, notes: e.target.value })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
                        Batal
                      </Button>
                      <Button onClick={handleSubmitReport} disabled={submitting}>
                        {submitting && <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />}
                        Simpan
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              {jobOrder.status === "QC_PENDING" && (
                <Dialog open={qcDialogOpen} onOpenChange={setQCDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-green-600 hover:bg-green-700">
                      <CheckIcon className="mr-2 h-4 w-4" />
                      Approve QC
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Konfirmasi QC Approval</DialogTitle>
                      <DialogDescription>
                        Setujui {jobOrder.completedQty} Pcs barang jadi?
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setQCDialogOpen(false)}>
                        Batal
                      </Button>
                      <Button variant="destructive">
                        <XMarkIcon className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                      <Button onClick={handleApproveQC} disabled={submitting}>
                        {submitting && <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />}
                        <CheckIcon className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-5 py-5">
          {!jobOrder.reports || jobOrder.reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Belum ada laporan produksi</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Berhasil</TableHead>
                  <TableHead>Reject</TableHead>
                  <TableHead>Dilaporkan Oleh</TableHead>
                  <TableHead>Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobOrder.reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      {formatDate(report.date)}
                    </TableCell>
                    <TableCell className="text-green-600 font-medium">
                      {report.success} Pcs
                    </TableCell>
                    <TableCell className="text-red-600 font-medium">
                      {report.reject} Pcs
                    </TableCell>
                    <TableCell>{report.reportedBy || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {report.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Job Order</DialogTitle>
            <DialogDescription>Perbarui detail job order</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Target Qty (Pcs)</Label>
              <Input 
                type="number" 
                value={editData.targetQty} 
                onChange={(e) => setEditData({ ...editData, targetQty: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Deadline</Label>
              <Input 
                type="date" 
                value={editData.dueDate ? editData.dueDate.split("T")[0] : ""} 
                onChange={(e) => setEditData({ ...editData, dueDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea 
                value={editData.notes} 
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Batal</Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting && <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
