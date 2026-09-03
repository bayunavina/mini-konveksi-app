"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormattedNumberInput } from "@/components/ui/formatted-number-input"
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
  const router = useRouter()
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
      <div className="px-3 py-3 space-y-3 sm:px-6 sm:py-4 space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}
        </div>
        <div className="h-96 bg-muted animate-pulse rounded-xl" />
      </div>
    )
  }

  return (
    <div className="px-3 py-3 sm:px-6 sm:py-4 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <MagnifyingGlassIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="relative flex-1 min-w-0">
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
              className="w-full text-base"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg overflow-hidden">
                {suggestions.map((s, i) => (
                  <button
                    key={`${s.type}-${s.value}-${i}`}
                    className="w-full px-4 py-3 text-left hover:bg-muted flex items-center gap-2 text-sm min-h-[44px]"
                    onClick={() => selectSuggestion(s.value)}
                  >
                    <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${
                      s.type === "jo" ? "bg-blue-100 text-blue-700" :
                      s.type === "product" ? "bg-green-100 text-green-700" :
                      "bg-purple-100 text-purple-700"
                    }`}>
                      {s.type === "jo" ? "JO" : s.type === "product" ? "Produk" : "Karyawan"}
                    </span>
                    <span className="font-medium truncate">{s.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/qc")} className="min-h-[44px] px-3">
            <ArrowLeftIcon className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Kembali</span>
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} className="min-h-[44px] px-3">
            <ArrowPathIcon className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          {selectedRows.size > 0 && (
            <Button size="sm" onClick={openQCDialog} className="min-h-[44px]">
              <CheckIcon className="h-4 w-4 sm:mr-2" />
              Proses ({getTotalSelected()})
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="border-blue-200 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Total JO</p>
              <p className="text-xl sm:text-2xl font-bold">{stats.total}</p>
            </div>
            <BuildingLibraryIcon className="h-7 w-7 sm:h-8 sm:w-8 text-[var(--chart-blue)] shrink-0" />
          </div>
        </Card>

        <Card className="border-red-200 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">QC Request</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600">{stats.qcRequest}</p>
            </div>
            <ExclamationCircleIcon className="h-7 w-7 sm:h-8 sm:w-8 text-red-600 shrink-0" />
          </div>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="font-semibold text-base sm:text-lg">Daftar JO</h3>
        <div className="flex items-center gap-2">
          {qcRequestItems.length > 0 && (
            <p className="text-xs sm:text-sm text-muted-foreground">
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

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-center w-[44px] p-2">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === qcRequestItems.length && qcRequestItems.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </TableHead>
                <TableHead className="text-center w-[36px] p-2 text-xs">No</TableHead>
                <TableHead className="text-center p-2 text-xs">Tanggal</TableHead>
                <TableHead className="text-center p-2 text-xs">No. JO</TableHead>
                <TableHead className="text-center p-2 text-xs">Produk</TableHead>
                <TableHead className="text-center p-2 text-xs">Karyawan</TableHead>
                <TableHead className="text-center p-2 text-xs">Qty</TableHead>
                <TableHead className="text-center p-2 text-xs">Target</TableHead>
                <TableHead className="text-center p-2 text-xs">Status</TableHead>
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
                      <TableCell className="text-center p-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(a.id)}
                          className="h-4 w-4 rounded border-gray-300"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell className="text-center p-2 text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="text-center p-2 text-xs">{formatDate(a.assignedAt)}</TableCell>
                      <TableCell className="text-center p-2">
                        <span className="font-mono font-semibold text-xs">{a.jobOrder?.joNumber || "-"}</span>
                      </TableCell>
                      <TableCell className="text-center p-2">
                        <span className="font-medium text-xs truncate-1">{a.product?.name || "-"}</span>
                      </TableCell>
                      <TableCell className="text-center p-2">
                        <span className="text-xs truncate-1">{a.employee?.name || "-"}</span>
                      </TableCell>
                      <TableCell className="text-center p-2">
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          {total}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center p-2 w-[70px]">
                        <div className="space-y-1">
                          <Progress value={progress} className="h-1" />
                          <span className="text-[10px]">{total}/{a.targetQty}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center p-2">
                        <Badge className="bg-yellow-100 text-black border-yellow-300 animate-pulse whitespace-nowrap">
                          {STATUS_LABELS[a.status] || a.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={qcDialogOpen} onOpenChange={setQCDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Proses QC</DialogTitle>
            <DialogDescription>
              QC Report untuk {selectedRows.size} Job Order
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="successQty">QC Pass (Pcs)</Label>
                <FormattedNumberInput
                  id="successQty"
                  placeholder="0"
                  value={qcForm.successQty}
                  onValueChange={(v) => setQcForm({ ...qcForm, successQty: v })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rejectQty">QC Reject (Pcs)</Label>
                <FormattedNumberInput
                  id="rejectQty"
                  placeholder="0"
                  value={qcForm.rejectQty}
                  onValueChange={(v) => setQcForm({ ...qcForm, rejectQty: v })}
                />
              </div>
            </div>

            {parseInt(qcForm.rejectQty || "0") > 0 && (
              <div className="space-y-2">
                <Label htmlFor="rejectReason">Alasan Reject</Label>
                <select
                  id="rejectReason"
                  className="flex h-7 w-full rounded-md border border-input bg-background px-3 text-sm"
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
                className="text-base"
              />
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Ringkasan:</strong> QC Pass: <span className="text-green-600 font-semibold">{qcForm.successQty || 0}</span> Pcs, 
                QC Reject: <span className="text-red-600 font-semibold">{qcForm.rejectQty || 0}</span> Pcs
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setQCDialogOpen(false)} className="min-h-[44px] w-full sm:w-auto">
              Batal
            </Button>
            <Button onClick={handleSubmitQC} disabled={submitting} className="min-h-[44px] w-full sm:w-auto">
              {submitting && <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />}
              Simpan QC Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
