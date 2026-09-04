"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CheckIcon,
  XMarkIcon,
  BanknotesIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline"
import { ExportPrint } from "@/components/shared/export-print"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { useRouter } from "next/navigation"
import { useSessionWithRole } from "@/lib/use-session-with-role"
import { formatDate } from "@/lib/utils"
import { useCurrency } from "@/hooks/useCurrency"

interface SalaryClaim {
  id: string
  employeeId: string
  assignmentId: string
  joNumber: string
  productName: string
  targetQty: number
  totalCompleted: number
  totalRejected: number
  totalAccepted: number
  ratePerUnit: string
  totalSalary: string
  status: string
  paidAt: string
  createdAt: string
  employee?: {
    id: string
    name: string
    email: string
  }
}

const STATUS_LABELS: Record<string, string> = {
  CLAIMED: "Diklaim",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  PAID: "Sudah Dibayar",
}

const STATUS_COLORS: Record<string, string> = {
  CLAIMED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  PAID: "bg-green-500 text-white",
}

export default function SalaryClaimsPage() {
  const { formatCurrency } = useCurrency()
  const router = useRouter()
  const { user, isLoading } = useSessionWithRole()

  const [loading, setLoading] = useState(true)
  const [claims, setClaims] = useState<SalaryClaim[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("CLAIMED")
  const [processing, setProcessing] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const fetchClaims = async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const url = statusFilter === "all"
        ? "/api/admin/salary-claims"
        : `/api/admin/salary-claims?status=${statusFilter}`
      const response = await fetch(url, { signal })
      if (response.ok) {
        const result = await response.json()
        setClaims(Array.isArray(result) ? result : [])
      }
    } catch (error) {
      if ((error as { name?: string })?.name !== "AbortError") {
        console.error("Error fetching claims:", error)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isLoading && user?.role === "ADMIN") {
      const controller = new AbortController()
      fetchClaims(controller.signal)
      return () => controller.abort()
    }
  }, [statusFilter, isLoading, user?.role])

  useEffect(() => {
    if (!isLoading && user && user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
      router.push("/dashboard")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Spinner className="size-8 text-primary" />
      </div>
    )
  }

  if (!isLoading && user?.role !== "ADMIN" && user?.role !== "SUPERADMIN") {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Spinner className="size-8 text-primary" />
      </div>
    )
  }

  const handleApprove = async (claim: SalaryClaim) => {
    setProcessing(true)
    try {
      const response = await fetch("/api/admin/salary-claims/approve", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salaryId: claim.id,
          action: "approve",
        }),
      })
      const contentType = response.headers.get("content-type")
      const isJson = contentType?.includes("application/json")
      
      if (response.ok) {
        toast.success("Klaim gaji disetujui!", {
          description: `Notifikasi telah dikirim ke ${claim.employee?.name || "karyawan"}`,
          duration: 4000,
        })
        fetchClaims()
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
        toast.error("Gagal menyetujui klaim", {
          description: errorMessage,
        })
      }
    } catch (error) {
      console.error("Error approving claim:", error)
      toast.error("Terjadi kesalahan", {
        description: "Tidak dapat terhubung ke server",
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async (claim: SalaryClaim) => {
    setProcessing(true)
    try {
      const response = await fetch("/api/admin/salary-claims/approve", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salaryId: claim.id,
          action: "reject",
        }),
      })
      const contentType = response.headers.get("content-type")
      const isJson = contentType?.includes("application/json")
      
      if (response.ok) {
        toast.success("Klaim gaji ditolak!", {
          description: `Notifikasi telah dikirim ke ${claim.employee?.name || "karyawan"}`,
          duration: 4000,
        })
        fetchClaims()
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
        toast.error("Gagal menolak klaim", {
          description: errorMessage,
        })
      }
    } catch (error) {
      console.error("Error rejecting claim:", error)
      toast.error("Terjadi kesalahan", {
        description: "Tidak dapat terhubung ke server",
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleMarkPaid = async (claim: SalaryClaim) => {
    setProcessing(true)
    try {
      const response = await fetch("/api/admin/salary-claims/approve", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salaryId: claim.id,
          action: "mark_paid",
        }),
      })
      const contentType = response.headers.get("content-type")
      const isJson = contentType?.includes("application/json")
      
      if (response.ok) {
        const data = await response.json()
        let message = "Gaji ditandai sudah dibayar!"
        if (data.transactionCreated) {
          message += " Transaksi pengeluaran otomatis dibuat."
        }
        toast.success(message, {
          description: `Notifikasi telah dikirim ke ${claim.employee?.name || "karyawan"}`,
          duration: 4000,
        })
        fetchClaims()
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
        toast.error("Gagal memperbarui status", {
          description: errorMessage,
        })
      }
    } catch (error) {
      console.error("Error marking paid:", error)
      toast.error("Terjadi kesalahan", {
        description: "Tidak dapat terhubung ke server",
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleSyncTransactions = async () => {
    setSyncing(true)
    try {
      const response = await fetch("/api/admin/salary-claims/sync", {
        method: "POST",
      })
      const data = await response.json()
      
      if (response.ok) {
        toast.success("Sync berhasil!", {
          description: `${data.synced} transaksi dibuat, ${data.alreadyExists} sudah ada`,
          duration: 4000,
        })
        fetchClaims()
      } else {
        toast.error("Gagal sync", {
          description: data.error || "Terjadi kesalahan",
        })
      }
    } catch (error) {
      console.error("Error syncing:", error)
      toast.error("Terjadi kesalahan saat sync")
    } finally {
      setSyncing(false)
    }
  }

  const stats = {
    total: claims.length,
    claimed: claims.filter(c => c.status === "CLAIMED").length,
    approved: claims.filter(c => c.status === "APPROVED").length,
    paid: claims.filter(c => c.status === "PAID").length,
    rejected: claims.filter(c => c.status === "REJECTED").length,
    totalAmount: claims.reduce((sum, c) => sum + parseFloat(c.totalSalary || "0"), 0),
  }

  const filteredClaims = statusFilter === "all" 
    ? claims 
    : claims.filter(c => c.status === statusFilter)

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Klaim Gaji Karyawan</h1>
          <p className="text-muted-foreground">Setujui atau tolak klaim gaji produksi</p>
        </div>
        <Button
          variant="outline"
          onClick={handleSyncTransactions}
          disabled={syncing}
        >
          {syncing ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <ArrowPathIcon className="mr-2 h-4 w-4" />
            )}
            Sync Finance
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menunggu</CardTitle>
            <ClockIcon className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {loading ? "-" : stats.claimed}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disetujui</CardTitle>
            <CheckIcon className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {loading ? "-" : stats.approved}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sudah Dibayar</CardTitle>
            <BanknotesIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loading ? "-" : stats.paid}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ditolak</CardTitle>
            <XMarkIcon className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {loading ? "-" : stats.rejected}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nominal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "-" : formatCurrency(stats.totalAmount)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Daftar Klaim Gaji</CardTitle>
              <CardDescription>Kelola klaim gaji dari karyawan</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="CLAIMED">Menunggu</SelectItem>
                  <SelectItem value="APPROVED">Disetujui</SelectItem>
                  <SelectItem value="REJECTED">Ditolak</SelectItem>
                  <SelectItem value="PAID">Sudah Dibayar</SelectItem>
                </SelectContent>
              </Select>
              <ExportPrint
                columns={[
                  { key: "employee", label: "Karyawan" },
                  { key: "joNumber", label: "No. JO" },
                  { key: "product", label: "Produk" },
                  { key: "target", label: "Target" },
                  { key: "completed", label: "Produksi" },
                  { key: "rejected", label: "Reject" },
                  { key: "accepted", label: "Diterima" },
                  { key: "rate", label: "Rate/Unit" },
                  { key: "totalSalary", label: "Total Gaji" },
                  { key: "status", label: "Status" },
                  { key: "date", label: "Tanggal" },
                ]}
                data={filteredClaims.map(c => ({
                  employee: c.employee?.name || "-",
                  joNumber: c.joNumber,
                  product: c.productName || "-",
                  target: c.targetQty,
                  completed: c.totalCompleted || 0,
                  rejected: c.totalRejected || 0,
                  accepted: c.totalAccepted || 0,
                  rate: formatCurrency(parseFloat(c.ratePerUnit || "0")),
                  totalSalary: formatCurrency(parseFloat(c.totalSalary || "0")),
                  status: STATUS_LABELS[c.status] || c.status,
                  date: formatDate(c.createdAt),
                }))}
                title="Daftar Klaim Gaji Karyawan"
                filename="klaim-gaji"
                summary={[
                  { label: "Total Klaim", value: filteredClaims.length },
                  { label: "Total Jumlah Gaji", value: formatCurrency(stats.totalAmount) },
                ]}
                summaryTitle="Ringkasan Klaim Gaji"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filteredClaims.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <ExclamationCircleIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Belum ada klaim gaji</p>
              <p className="text-sm mt-1">Klaim gaji akan muncul di sini setelah karyawan mengklaim</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-center font-semibold">Karyawan</TableHead>
                  <TableHead className="text-center font-semibold">No. JO</TableHead>
                  <TableHead className="text-center font-semibold">Produk</TableHead>
                  <TableHead className="text-center font-semibold">Target</TableHead>
                  <TableHead className="text-center font-semibold">Produksi</TableHead>
                  <TableHead className="text-center font-semibold">Reject</TableHead>
                  <TableHead className="text-center font-semibold">Diterima</TableHead>
                  <TableHead className="text-center font-semibold">Rate/Unit</TableHead>
                  <TableHead className="text-center font-semibold">Total Gaji</TableHead>
                  <TableHead className="text-center font-semibold">Status</TableHead>
                  <TableHead className="text-center font-semibold">Tanggal</TableHead>
                  <TableHead className="text-center font-semibold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClaims.map((claim) => (
                  <TableRow key={claim.id}>
                    <TableCell className="font-medium">
                      {claim.employee?.name || "-"}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {claim.joNumber}
                    </TableCell>
                    <TableCell className="text-center max-w-[120px] truncate">
                      {claim.productName || "-"}
                    </TableCell>
                    <TableCell className="text-center">{claim.targetQty}</TableCell>
                    <TableCell className="text-center">{claim.totalCompleted || 0}</TableCell>
                    <TableCell className="text-center text-destructive">{claim.totalRejected || 0}</TableCell>
                    <TableCell className="text-center font-medium text-emerald-600">
                      {claim.totalAccepted || 0}
                    </TableCell>
                    <TableCell className="text-center">
                      {formatCurrency(parseFloat(claim.ratePerUnit || "0"))}
                    </TableCell>
                    <TableCell className="text-center font-bold text-primary">
                      {formatCurrency(parseFloat(claim.totalSalary || "0"))}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`${STATUS_COLORS[claim.status] || "bg-gray-100"}`}>
                        {STATUS_LABELS[claim.status] || claim.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {formatDate(claim.createdAt)}
                    </TableCell>
                    <TableCell className="text-center">
                      {claim.status === "CLAIMED" && (
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="icon-lg"
                            variant="ghost"
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => handleApprove(claim)}
                            disabled={processing}
                            title="Setujui"
                          >
                            {processing ? (
                              <Spinner data-icon="inline-start" />
                            ) : (
                              <CheckIcon className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="icon-lg"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleReject(claim)}
                            disabled={processing}
                            title="Tolak"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {claim.status === "APPROVED" && (
                        <Button
                          size="lg"
                          variant="outline"
                          className="text-xs"
                          onClick={() => handleMarkPaid(claim)}
                          disabled={processing}
                        >
                          Tandai Dibayar
                        </Button>
                      )}
                      {claim.status === "REJECTED" && (
                        <span className="text-xs text-muted-foreground">Ditolak</span>
                      )}
                      {claim.status === "PAID" && (
                        <span className="text-xs text-emerald-600 font-medium">Lunas</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
