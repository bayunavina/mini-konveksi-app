"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  BuildingLibraryIcon,
  CheckIcon,
  ExclamationCircleIcon,
  ClipboardDocumentCheckIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline"
import { ExportPrint } from "@/components/shared/export-print"
import { formatDate } from "@/lib/utils"
import { useSessionWithRole } from "@/lib/use-session-with-role"
import { toast } from "sonner"

interface Assignment {
  id: string
  jobOrderId: string | null
  targetQty: number
  completedQty: number
  rejectedQty: number
  status: string
  assignedAt: string
  employee: {
    id: string
    name: string
  } | null
  product: {
    id: string
    name: string
    sku: string
  } | null
  jobOrder: {
    id: string
    joNumber: string
  } | null
}

interface Notification {
  id: string
  type: string
  referenceId: string | null
  isRead: boolean
}

const STATUS_LABELS: Record<string, string> = {
  ASSIGNED: "Assigned",
  IN_PROGRESS: "Produksi",
  COMPLETED: "Selesai",
}

const STATUS_COLORS: Record<string, string> = {
  ASSIGNED: "bg-[var(--chart-blue)]/10 text-[var(--chart-blue)]",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
}

const REJECT_REASONS = [
  " Cacat Jahitan",
  " Ukuran Tidak Sesuai",
  " Benang Terurai",
  " Kain Rusak",
  " Jahitan Loose Stitch",
  " Saku Miring",
  " Kerah Tidak Rapi",
  " Kancing Kurang",
  " Bordir Rusak",
  " Lainnya",
]

export default function QCOverviewPage() {
  const { user } = useSessionWithRole()
  const [searchQuery, setSearchQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [qcDialogOpen, setQCDialogOpen] = useState(false)
  const [qcForm, setQcForm] = useState({
    successQty: "",
    rejectQty: "",
    notes: "",
    rejectReason: "",
  })

  const fetchData = async () => {
    try {
      setLoading(true)
      const [assignRes, notifRes] = await Promise.all([
        fetch("/api/production/assign"),
        fetch("/api/notifications?type=PROGRESS_UPDATE"),
      ])
      
      if (assignRes.ok) {
        const assignData = await assignRes.json()
        setAssignments(assignData)
      }
      
      if (notifRes.ok) {
        const notifData = await notifRes.json()
        setNotifications(notifData.notifications || [])
      }
    } catch (err) {
      console.error("Error:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    document.title = "QC Overview"
    fetchData()
  }, [])

  const hasQCRequest = (assignmentId: string) => {
    return notifications.some(n => n.referenceId === assignmentId && n.type === "PROGRESS_UPDATE")
  }

  const stats = {
    total: assignments.length,
    qcRequest: assignments.filter(a => hasQCRequest(a.id)).length,
  }

  const filtered = assignments.filter(a =>
    a.jobOrder?.joNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.employee?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getSuggestions = () => {
    if (!searchQuery || searchQuery.length < 2) return []
    
    const suggestions: { type: string; value: string; label: string }[] = []
    const seen = new Set<string>()
    
    assignments.forEach((a) => {
      if (a.jobOrder?.joNumber?.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(a.jobOrder.joNumber)) {
        seen.add(a.jobOrder.joNumber)
        suggestions.push({ type: "jo", value: a.jobOrder.joNumber, label: a.jobOrder.joNumber })
      }
    })
    
    assignments.forEach((a) => {
      if (a.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(a.product.name)) {
        seen.add(a.product.name)
        suggestions.push({ type: "product", value: a.product.name, label: a.product.name })
      }
    })
    
    assignments.forEach((a) => {
      if (a.employee?.name?.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(a.employee.name)) {
        seen.add(a.employee.name)
        suggestions.push({ type: "employee", value: a.employee.name, label: a.employee.name })
      }
    })
    
    return suggestions.slice(0, 10)
  }

  const suggestions = getSuggestions()

  const selectSuggestion = (value: string) => {
    setSearchQuery(value)
    setShowSuggestions(false)
  }

  const qcRequestItems = filtered.filter(a => hasQCRequest(a.id))

  const toggleSelectAll = () => {
    if (selectedRows.size === qcRequestItems.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(qcRequestItems.map(a => a.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedRows(newSelected)
  }

  const openQCDialog = () => {
    if (selectedRows.size === 0) {
      toast.error("Pilih item yang akan di-QC")
      return
    }
    setQcForm({ successQty: "", rejectQty: "", notes: "", rejectReason: "" })
    setQCDialogOpen(true)
  }

  const handleSubmitQC = async () => {
    if (!user?.employeeId) {
      toast.error("Employee ID not found")
      return
    }

    const successQty = parseInt(qcForm.successQty || "0")
    const rejectQty = parseInt(qcForm.rejectQty || "0")

    if (successQty === 0 && rejectQty === 0) {
      toast.error("Masukkan jumlah Pass atau Reject")
      return
    }

    setSubmitting(true)

    try {
      const selectedAssignments = assignments.filter(a => selectedRows.has(a.id))
      
      for (const assignment of selectedAssignments) {
        if (!assignment.jobOrderId) continue

        const response = await fetch("/api/qc-reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobOrderId: assignment.jobOrderId,
            employeeId: user.employeeId,
            successQty,
            rejectQty,
            notes: qcForm.notes || null,
            rejectReason: rejectQty > 0 ? (qcForm.rejectReason || "Tidak lolos QC") : null,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          toast.error(`Gagal QC ${assignment.jobOrder?.joNumber}: ${error.message}`)
        }
      }

      toast.success(`QC Report berhasil disimpan untuk ${selectedRows.size} item`)
      setQCDialogOpen(false)
      setSelectedRows(new Set())
      fetchData()
    } catch (err) {
      console.error("Error:", err)
      toast.error("Terjadi kesalahan saat menyimpan QC")
    } finally {
      setSubmitting(false)
    }
  }

  const getTotalSelected = () => {
    return selectedRows.size
  }

  if (loading) {
    return (
      <div className="px-6 py-4 space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}
        </div>
        <div className="h-96 bg-muted animate-pulse rounded-lg" />
      </div>
    )
  }

  return (
    <div className="px-6 py-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <MagnifyingGlassIcon className="h-4 w-4 text-muted-foreground" />
          <div className="relative">
            <Input
              type="search"
              placeholder="Cari JO atau produk..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="max-w-[300px]"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg overflow-hidden">
                {suggestions.map((s, i) => (
                  <button
                    key={`${s.type}-${s.value}-${i}`}
                    className="w-full px-4 py-2 text-left hover:bg-muted flex items-center gap-2 text-sm"
                    onClick={() => selectSuggestion(s.value)}
                  >
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      s.type === "jo" ? "bg-blue-100 text-blue-700" :
                      s.type === "product" ? "bg-green-100 text-green-700" :
                      "bg-purple-100 text-purple-700"
                    }`}>
                      {s.type === "jo" ? "JO" : s.type === "product" ? "Produk" : "Karyawan"}
                    </span>
                    <span className="font-medium">{s.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.location.href = "/dashboard/qc"}>
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Kembali
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {selectedRows.size > 0 && (
            <Button size="sm" onClick={openQCDialog}>
              <CheckIcon className="h-4 w-4 mr-2" />
              Proses QC ({getTotalSelected()})
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:max-w-md">
        <Card className="border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total JO</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <BuildingLibraryIcon className="h-8 w-8 text-[var(--chart-blue)]" />
          </div>
        </Card>

        <Card className="border-red-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">QC Request</p>
              <p className="text-2xl font-bold text-red-600">{stats.qcRequest}</p>
            </div>
            <ExclamationCircleIcon className="h-8 w-8 text-red-600" />
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-lg">Daftar JO</h3>
        <div className="flex items-center gap-2">
          {qcRequestItems.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {qcRequestItems.length} item QC Request
            </p>
          )}
          <ExportPrint
            columns={[
                  { key: "joNumber", label: "No. JO" },
                  { key: "product", label: "Produk" },
                  { key: "employee", label: "Karyawan" },
                  { key: "qtyProcess", label: "Qty Proses" },
                  { key: "target", label: "Target" },
                  { key: "status", label: "Status" },
                ]}
            data={qcRequestItems.map((a, _i) => {
              const total = (a.completedQty || 0) + (a.rejectedQty || 0)
              return {
                date: formatDate(a.assignedAt),
                joNumber: a.jobOrder?.joNumber || "-",
                product: a.product?.name || "-",
                employee: a.employee?.name || "-",
                qtyProcess: total,
                target: a.targetQty,
                status: STATUS_LABELS[a.status] || a.status,
              }
            })}
            title="Daftar QC Request"
            filename="qc-request"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-center w-[50px]">
                <input
                  type="checkbox"
                  checked={selectedRows.size === qcRequestItems.length && qcRequestItems.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </TableHead>
              <TableHead className="text-center w-[50px]">No</TableHead>
              <TableHead className="text-center">Tanggal</TableHead>
              <TableHead className="text-center">No. JO</TableHead>
              <TableHead className="text-center">Produk</TableHead>
              <TableHead className="text-center">Karyawan</TableHead>
              <TableHead className="text-center">Qty Proses</TableHead>
              <TableHead className="text-center">Target</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {qcRequestItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  <ClipboardDocumentCheckIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>Tidak ada QC Request</p>
                </TableCell>
              </TableRow>
            ) : (
              qcRequestItems.map((a, i) => {
                const total = (a.completedQty || 0) + (a.rejectedQty || 0)
                const progress = a.targetQty > 0 ? Math.round((total / a.targetQty) * 100) : 0
                const isSelected = selectedRows.has(a.id)

                return (
                  <TableRow 
                    key={a.id} 
                    className={`cursor-pointer ${isSelected ? "bg-green-50" : "bg-red-50/30"}`}
                    onClick={() => toggleSelect(a.id)}
                  >
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(a.id)}
                        className="h-4 w-4 rounded border-gray-300"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm">{formatDate(a.assignedAt)}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-mono font-semibold text-sm">{a.jobOrder?.joNumber || "-"}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium text-sm">{a.product?.name || "-"}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm">{a.employee?.name || "-"}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        {total}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center w-[100px]">
                      <div className="space-y-1">
                        <Progress value={progress} className="h-1.5" />
                        <span className="text-xs">{total}/{a.targetQty}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-yellow-100 text-black border-yellow-300 animate-pulse">
                        {STATUS_LABELS[a.status] || a.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={qcDialogOpen} onOpenChange={setQCDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proses QC</DialogTitle>
            <DialogDescription>
              QC Report untuk {selectedRows.size} Job Order
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="successQty">QC Pass (Pcs)</Label>
                <Input
                  id="successQty"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={qcForm.successQty}
                  onChange={(e) => setQcForm({ ...qcForm, successQty: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rejectQty">QC Reject (Pcs)</Label>
                <Input
                  id="rejectQty"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={qcForm.rejectQty}
                  onChange={(e) => setQcForm({ ...qcForm, rejectQty: e.target.value })}
                />
              </div>
            </div>

            {parseInt(qcForm.rejectQty || "0") > 0 && (
              <div className="space-y-2">
                <Label htmlFor="rejectReason">Alasan Reject</Label>
                <select
                  id="rejectReason"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={qcForm.rejectReason}
                  onChange={(e) => setQcForm({ ...qcForm, rejectReason: e.target.value })}
                >
                  <option value="">Pilih alasan reject</option>
                  {REJECT_REASONS.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Catatan (Opsional)</Label>
              <Textarea
                id="notes"
                placeholder="Tambahkan catatan jika ada..."
                value={qcForm.notes}
                onChange={(e) => setQcForm({ ...qcForm, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Ringkasan:</strong> QC Pass: <span className="text-green-600 font-semibold">{qcForm.successQty || 0}</span> Pcs, 
                QC Reject: <span className="text-red-600 font-semibold">{qcForm.rejectQty || 0}</span> Pcs
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQCDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmitQC} disabled={submitting}>
              {submitting && <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />}
              Simpan QC Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
