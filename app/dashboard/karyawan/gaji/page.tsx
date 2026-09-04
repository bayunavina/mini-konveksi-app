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
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
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
        <Spinner className="size-8 text-primary" />
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-3 sm:space-y-4 p-3 sm:p-6 pt-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Gaji Saya</h1>
        <p className="text-sm text-muted-foreground">Kelola klaim dan riwayat gaji produksi</p>
      </div>

      <Card>
        <CardHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
          <CardTitle className="text-base sm:text-lg">Rincian Gaji</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Klaim gaji setelah hasil produksi melewati QC
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {salaryData.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-muted-foreground">
              <BanknotesIcon className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-sm sm:text-base">Belum ada data gaji</p>
              <p className="text-xs sm:text-sm mt-1">Data gaji akan muncul setelah menyelesaikan job order</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-center p-2 text-xs whitespace-nowrap">No. JO</TableHead>
                    <TableHead className="text-center p-2 text-xs hidden sm:table-cell">Produk</TableHead>
                    <TableHead className="text-center p-2 text-xs">Target</TableHead>
                    <TableHead className="text-center p-2 text-xs hidden md:table-cell">Rate/Unit</TableHead>
                    <TableHead className="text-center p-2 text-xs">Prod</TableHead>
                    <TableHead className="text-center p-2 text-xs">Rej</TableHead>
                    <TableHead className="text-center p-2 text-xs hidden lg:table-cell">Diterima</TableHead>
                    <TableHead className="text-center p-2 text-xs whitespace-nowrap">Total</TableHead>
                    <TableHead className="text-center p-2 text-xs whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-center p-2 text-xs whitespace-nowrap">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaryData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-center p-2">
                        <span className="font-mono font-medium text-xs">{item.joNumber}</span>
                      </TableCell>
                      <TableCell className="text-center p-2 hidden sm:table-cell">
                        <span className="text-xs truncate max-w-[100px] block">{item.productName}</span>
                      </TableCell>
                      <TableCell className="text-center p-2 text-xs">{item.targetQty}</TableCell>
                      <TableCell className="text-center p-2 text-xs hidden md:table-cell whitespace-nowrap">
                        {formatCurrency(item.ratePerUnit)}
                      </TableCell>
                      <TableCell className="text-center p-2 font-medium text-xs">{item.completedQty}</TableCell>
                      <TableCell className="text-center p-2 text-destructive text-xs">{item.rejectedQty}</TableCell>
                      <TableCell className="text-center p-2 font-medium text-emerald-600 text-xs hidden lg:table-cell">{item.acceptedQty}</TableCell>
                      <TableCell className="text-center p-2 font-bold text-primary text-xs whitespace-nowrap">
                        {formatCurrency(item.totalSalary)}
                      </TableCell>
                      <TableCell className="text-center p-2">
                        <Badge className={`${STATUS_COLORS[item.status] || STATUS_COLORS.PENDING} whitespace-nowrap`}>
                          {STATUS_LABELS[item.status] || "Menunggu"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center p-2">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1">
                            <Button
                              size="lg"
                              variant="outline"
                              disabled={!canClaim(item) || claiming === item.id}
                              onClick={() => handleKlaim(item)}
                              className="px-2 text-xs min-w-[60px]"
                            >
                              {claiming === item.id ? (
                                <Spinner data-icon="inline-start" />
                              ) : (
                                <BanknotesIcon className="h-3 w-3 mr-1" />
                              )}
                              Klaim
                            </Button>
                            <Button
                              size="icon-lg"
                              variant="ghost"
                              disabled={!canExport(item)}
                              onClick={() => {
                                setSelectedClaim(item)
                                setExportModalOpen(true)
                              }}
                              
                              title="Export Slip"
                            >
                              <ArrowDownTrayIcon className="h-4 w-4" />
                            </Button>
                          </div>
                          {!item.qcPassed && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <ExclamationCircleIcon className="h-3 w-3" />
                              Belum QC
                            </p>
                          )}
                        </div>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Export Slip Gaji</DialogTitle>
            <DialogDescription>
              Download slip gaji untuk Job Order {selectedClaim?.joNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedClaim && (
            <div className="space-y-3 py-2">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Produk</span>
                  <span className="font-medium text-sm truncate-1">{selectedClaim.productName}</span>
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
                <div className="flex justify-between border-t pt-2 font-bold text-sm">
                  <span>Total Gaji</span>
                  <span className="text-primary">{formatCurrency(selectedClaim.totalSalary)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckIcon className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Slip gaji telah disetujui oleh admin</span>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setExportModalOpen(false)} className="w-full sm:w-auto">
              Batal
            </Button>
            <Button onClick={handleExportSlip} disabled={exportLoading} className="w-full sm:w-auto">
              {exportLoading ? (
                <Spinner data-icon="inline-start" />
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
