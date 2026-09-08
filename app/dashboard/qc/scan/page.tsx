"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { FormattedNumberInput } from "@/components/ui/formatted-number-input"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScanModal } from "@/components/scanner"
import { PageHeader } from "@/components/shared"
import { 
  QrCodeIcon,
  CheckIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline"
import { useFetch } from "@/hooks/useFetch"
import { toast } from "sonner"
import { parseSkuBatchCode } from "@/lib/qr-payload"

interface Assignment {
  id: string
  jobOrderId: string | null
  targetQty: number
  completedQty: number
  pendingQty: number
  acceptedQty: number
  rejectedQty: number
  status: string
  jobOrder: {
    id: string
    joNumber: string
    status: string
  } | null
  product: {
    id: string
    name: string
    code: string
    sku?: string
  } | null
  employee: {
    id: string
    name: string
  } | null
}

export default function QCScanPage() {
  const router = useRouter()
  const [scanModalOpen, setScanModalOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [successQty, setSuccessQty] = useState("")
  const [rejectQty, setRejectQty] = useState("")
  const [rejectReason, setRejectReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: assignments, refetch } = useFetch<Assignment[]>("/api/production/assign")

  const pendingAssignments = (assignments || []).filter(a => 
    a.status === "QC_REQUESTED" && (a.pendingQty || 0) > 0
  )

  const handleScan = async (result: string) => {
    setScanModalOpen(false)

    // Check for batch barcode format: SKU-NNNN (e.g. SKU-SRG-001-0001)
    const skuBase = parseSkuBatchCode(result)
    if (skuBase) {
      const found = (assignments || []).find(a => 
        (a.product?.code === skuBase || a.product?.sku === skuBase) &&
        a.status === "QC_REQUESTED" && 
        (a.pendingQty || 0) > 0
      )
      if (found) {
        setIsSubmitting(true)
        try {
          const response = await fetch("/api/qc-reports", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jobOrderId: found.jobOrderId,
              employeeId: found.employee?.id,
              successQty: 1,
              rejectQty: 0,
              assignmentId: found.id,
            }),
          })
          if (response.ok) {
            toast.success(`1 pcs lolos QC: ${found.product?.name}`)
            refetch()
          } else {
            const data = await response.json()
            toast.error(data.error || "Gagal memproses QC")
          }
        } catch {
          toast.error("Terjadi kesalahan")
        } finally {
          setIsSubmitting(false)
        }
        return
      }
      toast.error("Tidak ada assignment QC untuk SKU ini")
      return
    }

    // Find assignment by job order number or ID
    const found = (assignments || []).find(a => 
      a.jobOrder?.joNumber?.toLowerCase().includes(result.toLowerCase()) ||
      a.id === result ||
      a.jobOrderId === result
    )

    if (!found) {
      toast.error("Job Order tidak ditemukan")
      return
    }

    if (found.status !== "QC_REQUESTED") {
      toast.error("Job Order ini belum di-request untuk QC")
      return
    }

    if ((found.pendingQty || 0) === 0) {
      toast.error("Tidak ada produk yang menunggu QC")
      return
    }

    setSelectedAssignment(found)
    setSuccessQty(String(found.pendingQty || 0))
    setRejectQty("0")
  }

  const handleSubmitQC = async () => {
    if (!selectedAssignment) return

    const success = parseInt(successQty) || 0
    const rejected = parseInt(rejectQty) || 0

    if (success + rejected === 0) {
      toast.error("Masukkan jumlah yang di-QC")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/qc-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobOrderId: selectedAssignment.jobOrderId,
          successQty: success,
          rejectQty: rejected,
          notes: rejectReason || null,
        }),
      })

      if (response.ok) {
        toast.success("QC berhasil diproses!")
        setSelectedAssignment(null)
        refetch()
      } else {
        const data = await response.json()
        toast.error(data.error || "Gagal memproses QC")
      }
    } catch {
      toast.error("Terjadi kesalahan")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex-1 space-y-3 sm:space-y-4 p-3 sm:p-6 pt-4">
      <PageHeader
        title="Scan QC"
        description="Scan barcode untuk proses quality control"
        actions={
          <Button variant="outline" onClick={() => router.push("/dashboard/qc")} className="px-3">
            <ArrowLeftIcon className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Kembali</span>
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <QrCodeIcon className="h-5 w-5" />
              Scan Barcode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full min-h-[48px]" 
              size="lg"
              onClick={() => setScanModalOpen(true)}
            >
              <QrCodeIcon className="mr-2 h-5 w-5" />
              Buka Kamera Scan
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">atau</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Masukkan Nomor JO</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input 
                  placeholder="Contoh: JO260327-xxx"
                  id="manual-jo"
                  className="text-base min-h-[44px]"
                />
                <Button variant="secondary" onClick={() => {
                  const input = document.getElementById("manual-jo") as HTMLInputElement
                  if (input?.value) handleScan(input.value)
                }}>
                  Cari
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Job Orders Menunggu QC</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingAssignments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckIcon className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>Tidak ada job order menunggu QC</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingAssignments.map((a) => (
                  <div 
                    key={a.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-orange-50 dark:bg-orange-950/20 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-950/30 gap-2 min-h-[60px]"
                    onClick={() => {
                      setSelectedAssignment(a)
                      setSuccessQty(String(a.pendingQty || 0))
                      setRejectQty("0")
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{a.jobOrder?.joNumber}</p>
                      <p className="text-xs text-muted-foreground truncate">{a.product?.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{a.employee?.name}</p>
                    </div>
                    <Badge className="bg-orange-100 text-orange-700 shrink-0">
                      {a.pendingQty} pcs
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ScanModal
        open={scanModalOpen}
        onOpenChange={setScanModalOpen}
        onScan={handleScan}
        title="Scan Barcode"
        description="Arahkan kamera ke barcode job order"
      />

      <Dialog open={!!selectedAssignment} onOpenChange={(open) => !open && setSelectedAssignment(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Proses QC - {selectedAssignment?.jobOrder?.joNumber}</DialogTitle>
            <DialogDescription>
              {selectedAssignment?.product?.name} - {selectedAssignment?.pendingQty} pcs menunggu QC
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Berhasil (Lolos)</label>
                <FormattedNumberInput
                  placeholder="0"
                  value={successQty}
                  onValueChange={(v) => setSuccessQty(v)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reject</label>
                <FormattedNumberInput
                  placeholder="0"
                  value={rejectQty}
                  onValueChange={(v) => setRejectQty(v)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Alasan Reject (Opsional)</label>
              <select
                className="w-full h-7 px-3 border rounded-md bg-background text-sm"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              >
                <option value="">Pilih alasan (opsional)</option>
                <option value="Cacat Jahitan">Cacat Jahitan</option>
                <option value="Ukuran Tidak Sesuai">Ukuran Tidak Sesuai</option>
                <option value="Benang Terurai">Benang Terurai</option>
                <option value="Kain Rusak">Kain Rusak</option>
                <option value="Jahitan Loose Stitch">Jahitan Loose Stitch</option>
                <option value="Saku Miring">Saku Miring</option>
                <option value="Kerah Tidak Rapi">Kerah Tidak Rapi</option>
                <option value="Kancing Kurang">Kancing Kurang</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setSelectedAssignment(null)} className="w-full sm:w-auto">
              Batal
            </Button>
            <Button onClick={handleSubmitQC} disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? "Memproses..." : "Simpan QC"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}