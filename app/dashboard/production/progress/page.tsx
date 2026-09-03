"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PageHeader } from "@/components/shared"
import { ArrowLeftIcon, CubeIcon, CheckIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline"
import { useFetch } from "@/hooks/useFetch"
import { useCurrency } from "@/hooks/useCurrency"
import { FormattedNumberInput } from "@/components/ui/formatted-number-input"
import { toast } from "sonner"

interface Assignment {
  id: string
  targetQty: number
  completedQty: number
  rejectedQty: number
  acceptedQty: number
  ratePerUnit: string
  totalSalary: number
  status: string
  notes: string
  assignedAt: string
  employee?: {
    id: string
    name: string
    email: string
  }
  materialLot?: {
    id: string
    lotNumber: string
    qrCode: string
  }
  product?: {
    id: string
    name: string
    sku: string
  }
}

export default function EmployeeProgressPage() {
  const { formatCurrency } = useCurrency()
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    qtyCompleted: "",
    qtyRejected: "",
    notes: "",
  })

  const { data: assignments, loading, refetch } = useFetch<Assignment[]>("/api/production/assign")

  const myAssignments = (assignments || []).filter(
    (a) => a.status !== "COMPLETED"
  )

  const openUpdateDialog = (assignment: Assignment) => {
    setSelectedAssignment(assignment)
    setFormData({ qtyCompleted: "", qtyRejected: "0", notes: "" })
    setUpdateDialogOpen(true)
  }

  const handleUpdateProgress = async () => {
    if (!selectedAssignment || !formData.qtyCompleted) {
      toast.error("Masukkan qty selesai")
      return
    }

    const qtyCompleted = parseInt(formData.qtyCompleted)
    const qtyRejected = parseInt(formData.qtyRejected) || 0
    const remaining = selectedAssignment.targetQty - (selectedAssignment.completedQty + selectedAssignment.acceptedQty)

    if (qtyCompleted > remaining + qtyRejected) {
      toast.error(`Maximum yang bisa diinput: ${remaining} pcs (sisa target)`)
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/production/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: selectedAssignment.id,
          employeeId: selectedAssignment.employee?.id,
          qtyCompleted: qtyCompleted,
          qtyRejected: qtyRejected,
          notes: formData.notes,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message || "Progress berhasil diupdate")
        setUpdateDialogOpen(false)
        setSelectedAssignment(null)
        refetch()
      } else {
        toast.error("Gagal update progress")
      }
    } catch (error) {
      console.error("Error updating progress:", error)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ASSIGNED":
        return <Badge className="bg-blue-100 text-blue-800">Assigned</Badge>
      case "IN_PROGRESS":
        return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>
      case "COMPLETED":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getProgressPercentage = (assignment: Assignment) => {
    if (assignment.targetQty === 0) return 0
    return Math.round((assignment.completedQty / assignment.targetQty) * 100)
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Update Progress Produksi"
        description="Update progres penjahitan yang Anda kerjakan"
        actions={
          <Button variant="outline" asChild>
            <Link href="/dashboard/production">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Kembali
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Job Saya</CardTitle>
          <CardDescription>Job yang di-assign untuk Anda</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : myAssignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CubeIcon className="mx-auto h-12 w-12 mb-4 text-muted-foreground/50" />
              <p>Tidak ada job untuk saat ini</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myAssignments.map((a) => {
                const progress = getProgressPercentage(a)
                const remaining = a.targetQty - (a.completedQty + a.acceptedQty)
                return (
                  <div key={a.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{a.product?.name || "-"}</p>
                        <p className="text-sm text-muted-foreground">
                          Lot: {a.materialLot?.lotNumber} | Rate: {formatCurrency(parseFloat(a.ratePerUnit || "0"))}/pcs
                        </p>
                      </div>
                      {getStatusBadge(a.status)}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{a.completedQty} / {a.targetQty} pcs ({progress}%)</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center text-sm">
                      <div className="bg-muted rounded p-2">
                        <p className="text-muted-foreground">Completed</p>
                        <p className="font-bold">{a.completedQty}</p>
                      </div>
                      <div className="bg-muted rounded p-2">
                        <p className="text-muted-foreground">Rejected</p>
                        <p className="font-bold text-red-500">{a.rejectedQty > 0 ? a.rejectedQty : "-"}</p>
                      </div>
                      <div className="bg-muted rounded p-2">
                        <p className="text-muted-foreground">Accepted</p>
                        <p className="font-bold text-green-600">{a.acceptedQty}</p>
                      </div>
                      <div className="bg-muted rounded p-2">
                        <p className="text-muted-foreground">Sisa</p>
                        <p className="font-bold">{remaining > 0 ? remaining : 0}</p>
                      </div>
                    </div>

                    <Button onClick={() => openUpdateDialog(a)} className="w-full">
                      Update Progress
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Progress</DialogTitle>
            <DialogDescription>
              Update progres penjahitan Anda
            </DialogDescription>
          </DialogHeader>
          {selectedAssignment && (
            <div className="space-y-4 py-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Produk:</span>
                  <span className="font-medium">{selectedAssignment.product?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Target:</span>
                  <span className="font-medium">{selectedAssignment.targetQty} pcs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Sisa:</span>
                  <span className="font-bold text-primary">
                    {selectedAssignment.targetQty - (selectedAssignment.completedQty + selectedAssignment.acceptedQty)} pcs
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Rate:</span>
                  <span className="font-medium">{formatCurrency(parseFloat(selectedAssignment.ratePerUnit || "0"))}/pcs</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Qty Selesai *</label>
                <FormattedNumberInput
                  placeholder={`Max: ${selectedAssignment.targetQty - (selectedAssignment.completedQty + selectedAssignment.acceptedQty)}`}
                  value={formData.qtyCompleted}
                  onValueChange={(v) => setFormData({ ...formData, qtyCompleted: v })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Qty Reject (QC)</label>
                <FormattedNumberInput
                  placeholder="0"
                  value={formData.qtyRejected}
                  onValueChange={(v) => setFormData({ ...formData, qtyRejected: v })}
                />
                <p className="text-xs text-muted-foreground">
                  Qty yang di-reject oleh QC (tidak dihitung untuk gaji)
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Input
                  placeholder="Catatan opsional"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800">
                  <ExclamationCircleIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">Info Kalkulasi Gaji</span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  Gaji = (Qty Selesai - Qty Reject) × Rate<br />
                  Contoh: ({formData.qtyCompleted || 0} - {formData.qtyRejected || 0}) × {formatCurrency(parseFloat(selectedAssignment.ratePerUnit || "0"))} ={" "}
                  <span className="font-bold">
                    {formatCurrency(((parseInt(formData.qtyCompleted) || 0) - (parseInt(formData.qtyRejected) || 0)) * parseFloat(selectedAssignment.ratePerUnit || "0"))}
                  </span>
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleUpdateProgress} disabled={!formData.qtyCompleted || submitting}>
              {submitting ? <Spinner data-icon="inline-start" /> : <CheckIcon className="mr-2 h-4 w-4" />}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
