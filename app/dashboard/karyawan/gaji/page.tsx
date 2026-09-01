"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
} from "@/components/ui/dialog"
import {
  BanknotesIcon,
  ArrowDownTrayIcon,
  CheckIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline"
import { useSessionWithRole } from "@/lib/use-session-with-role"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { useCurrency } from "@/hooks/useCurrency"

interface SalaryClaim {
  id: string
  employeeId: string
  joNumber: string
  productName: string
  targetQty: number
  completedQty: number
  rejectedQty: number
  acceptedQty: number
  ratePerUnit: number
  totalSalary: number
  status: string
  qcPassed: boolean
  createdAt: string
  updatedAt: string
  claimSubmittedAt?: string
  claimApprovedAt?: string
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu Klaim",
  CLAIMED: "Sudah Diklaim",
  APPROVED: "Disetujui",
  PAID: "Sudah Dibayar",
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  CLAIMED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  PAID: "bg-green-500 text-white",
}

export default function GajiPage() {
  const { formatCurrency } = useCurrency()
  const { user } = useSessionWithRole()
  const [isLoading, setIsLoading] = useState(true)
  const [salaryData, setSalaryData] = useState<SalaryClaim[]>([])
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [selectedClaim, setSelectedClaim] = useState<SalaryClaim | null>(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [claiming, setClaiming] = useState<string | null>(null)

  useEffect(() => {
    if (user?.employeeId) {
      fetchSalaryData()
    }
  }, [user])

  const fetchSalaryData = async () => {
    if (!user?.employeeId) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/karyawan/gaji?employeeId=${user.employeeId}`)
      if (response.ok) {
        const data = await response.json()
        setSalaryData(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error("Error fetching salary data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKlaim = async (claim: SalaryClaim) => {
    if (!claim.qcPassed) {
      toast.error("Tidak bisa klaim", {
        description: "Hasil produksi belum melewati QC",
      })
      return
    }

    setClaiming(claim.id)
    try {
      const response = await fetch("/api/karyawan/gaji/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: user?.employeeId,
          joNumber: claim.joNumber,
          salaryId: claim.id,
        }),
      })
      const isJson = response.headers.get("content-type")?.includes("application/json")
      
      if (response.ok) {
        toast.success("Klaim gaji berhasil!", {
          description: "Permintaan akan diproses oleh admin.",
          duration: 4000,
        })
        fetchSalaryData()
      } else {
        let errorMessage = "Terjadi kesalahan"
        if (isJson) {
          try {
            const error = await response.json()
            errorMessage = error.message || "Terjadi kesalahan"
          } catch {
            errorMessage = `Error ${response.status}`
          }
        }
        toast.error("Gagal klaim gaji", {
          description: errorMessage,
        })
      }
    } catch (error) {
      console.error("Error claiming salary:", error)
      toast.error("Terjadi kesalahan", {
        description: "Tidak dapat terhubung ke server",
      })
    } finally {
      setClaiming(null)
    }
  }

  const handleExportSlip = async () => {
    if (!selectedClaim) return
    
    setExportLoading(true)
    try {
      // Use assignmentId since the UI passes assignment ID, not salary ID
      const response = await fetch(`/api/karyawan/gaji/export?assignmentId=${selectedClaim.id}`)
      
      if (response.ok) {
        const data = await response.json()
        
        const slipContent = `
SLIP GAJI KARYAWAN
==================

Tanggal: ${formatDate(new Date().toISOString())}
Periode: ${data.joNumber || selectedClaim.joNumber}

DATA KARYAWAN
 -------------
Nama: ${user?.name || "-"}
Employee ID: ${user?.employeeId || "-"}

RINCIAN PRODUKSI
----------------
No. Job Order: ${data.joNumber || selectedClaim.joNumber}
Produk: ${data.productName || selectedClaim.productName}
Target Qty: ${data.targetQty || selectedClaim.targetQty} pcs
Rate/Unit: ${formatCurrency(data.ratePerUnit || selectedClaim.ratePerUnit)}

HASIL PRODUKSI
---------------
Total Produksi: ${data.completedQty || selectedClaim.completedQty} pcs
QC Reject: ${data.rejectedQty || selectedClaim.rejectedQty} pcs
Produksi Diterima: ${data.acceptedQty || selectedClaim.acceptedQty} pcs

PERHITUNGAN GAJI
----------------
Total Gaji: ${formatCurrency(data.totalSalary || selectedClaim.totalSalary)}

Status Klaim: ${STATUS_LABELS[selectedClaim.status] || selectedClaim.status}
${selectedClaim.claimApprovedAt ? `Disetujui pada: ${formatDate(selectedClaim.claimApprovedAt)}` : ""}

==========================
Slip ini dicetak pada ${new Date().toLocaleString("id-ID")}
        `.trim()

        const blob = new Blob([slipContent], { type: "text/plain" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `Slip-Gaji-${data.joNumber || selectedClaim.joNumber}-${formatDate(new Date().toISOString()).replace(/\//g, "-")}.txt`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast.success("Slip gaji berhasil di-export!", {
          description: "File telah diunduh.",
          duration: 3000,
        })
        setExportModalOpen(false)
      } else {
        const error = await response.json()
        toast.error(error.error || "Gagal export slip gaji")
      }
    } catch (error) {
      console.error("Error exporting slip:", error)
      toast.error("Terjadi kesalahan", {
        description: "Tidak dapat export slip gaji",
      })
    } finally {
      setExportLoading(false)
    }
  }

  const canClaim = (claim: SalaryClaim) => {
    return claim.qcPassed && (claim.status === "PENDING" || !claim.status)
  }

  const canExport = (claim: SalaryClaim) => {
    return claim.status === "APPROVED" || claim.status === "PAID"
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gaji Saya</h1>
          <p className="text-muted-foreground">Kelola klaim dan riwayat gaji produksi</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rincian Gaji</CardTitle>
          <CardDescription>
            Klaim gaji setelah hasil produksi melewati QC
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {salaryData.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <BanknotesIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Belum ada data gaji</p>
              <p className="text-sm mt-1">Data gaji akan muncul setelah menyelesaikan job order</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-center font-semibold">No. JO</TableHead>
                    <TableHead className="text-center font-semibold">Produk</TableHead>
                    <TableHead className="text-center font-semibold">Qty Target</TableHead>
                    <TableHead className="text-center font-semibold">Rate/Unit</TableHead>
                    <TableHead className="text-center font-semibold">Total Produksi</TableHead>
                    <TableHead className="text-center font-semibold">QC Reject</TableHead>
                    <TableHead className="text-center font-semibold">Diterima</TableHead>
                    <TableHead className="text-center font-semibold">Total Gaji</TableHead>
                    <TableHead className="text-center font-semibold">Status</TableHead>
                    <TableHead className="text-center font-semibold">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaryData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-center font-mono font-medium">
                        {item.joNumber}
                      </TableCell>
                      <TableCell className="text-center max-w-[150px] truncate">
                        {item.productName}
                      </TableCell>
                      <TableCell className="text-center">{item.targetQty}</TableCell>
                      <TableCell className="text-center">
                        {formatCurrency(item.ratePerUnit)}
                      </TableCell>
                      <TableCell className="text-center font-medium">{item.completedQty}</TableCell>
                      <TableCell className="text-center text-destructive">{item.rejectedQty}</TableCell>
                      <TableCell className="text-center font-medium text-emerald-600">{item.acceptedQty}</TableCell>
                      <TableCell className="text-center font-bold text-primary">
                        {formatCurrency(item.totalSalary)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`${STATUS_COLORS[item.status] || STATUS_COLORS.PENDING}`}>
                          {STATUS_LABELS[item.status] || "Menunggu"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canClaim(item) || claiming === item.id}
                            onClick={() => handleKlaim(item)}
                            className="h-8 text-xs"
                          >
                            {claiming === item.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <BanknotesIcon className="h-3 w-3 mr-1" />
                                Klaim
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={!canExport(item)}
                            onClick={() => {
                              setSelectedClaim(item)
                              setExportModalOpen(true)
                            }}
                            className="h-8 w-8 p-0"
                            title="Export Slip"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                          </Button>
                        </div>
                        {!item.qcPassed && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            <ExclamationCircleIcon className="h-3 w-3 inline mr-1" />
                            Belum QC
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Slip Gaji</DialogTitle>
            <DialogDescription>
              Download slip gaji untuk Job Order {selectedClaim?.joNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedClaim && (
            <div className="space-y-3 py-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Produk</span>
                  <span className="font-medium">{selectedClaim.productName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Produksi</span>
                  <span className="font-medium">{selectedClaim.completedQty} pcs</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">QC Reject</span>
                  <span className="font-medium text-destructive">{selectedClaim.rejectedQty} pcs</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Diterima</span>
                  <span className="font-medium text-emerald-600">{selectedClaim.acceptedQty} pcs</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold">
                  <span>Total Gaji</span>
                  <span className="text-primary">{formatCurrency(selectedClaim.totalSalary)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckIcon className="h-4 w-4 text-emerald-500" />
                <span>Slip gaji telah disetujui oleh admin</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleExportSlip} disabled={exportLoading}>
              {exportLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              )}
              Download Slip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
