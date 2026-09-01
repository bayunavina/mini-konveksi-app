"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
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
import { PageHeader } from "@/components/shared"
import { ExportPrint } from "@/components/shared/export-print"
import { 
  PlusIcon, 
  BanknotesIcon, 
  ArrowPathIcon, 
  EyeIcon, 
  TrashIcon, 
  CheckIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline"
import { useFetch } from "@/hooks/useFetch"
import { useCurrency } from "@/hooks/useCurrency"
import { useSessionWithRole } from "@/lib/use-session-with-role"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface PaymentRecord {
  amount: number
  date: string
  remark: string
}

interface Advance {
  id: string
  kode: string
  amount: number
  paidAmount: number
  purpose?: string
  status: string
  approvedBy?: string
  paidAt?: string
  createdAt: string
  remark?: string
  paymentHistory: PaymentRecord[]
  employee?: {
    id: string
    name: string
  }
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  APPROVED: "bg-[var(--chart-blue)]/10 text-[var(--chart-blue)] dark:bg-[var(--chart-blue)]/20",
  LUNAS: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  LUNAS: "Lunas",
}

export default function AdvancesPage() {
  const { formatCurrency, formatNumber } = useCurrency()
  const router = useRouter()
  const { user, isLoading } = useSessionWithRole()

  const [searchQuery, setSearchQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [payDialogOpen, setPayDialogOpen] = useState(false)
  const [remarkDialogOpen, setRemarkDialogOpen] = useState(false)
  const [selectedAdvance, setSelectedAdvance] = useState<Advance | null>(null)
  const [formData, setFormData] = useState({
    employeeId: "",
    amount: "",
    purpose: "",
    remark: "",
  })
  const [paymentData, setPaymentData] = useState({
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    remark: "",
  })
  const [remarkData, setRemarkData] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const { data: advances, loading, refetch } = useFetch<Advance[]>("/api/advances")
  const { data: employees } = useFetch<{ id: string; name: string }[]>("/api/employees")

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (user?.role !== "ADMIN") {
    router.push("/dashboard")
    return null
  }

  const filteredAdvances = (advances || []).filter((a) => {
    const matchesSearch = 
      a.employee?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.kode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.purpose?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || a.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getSuggestions = () => {
    if (!searchQuery || searchQuery.length < 2) return []
    
    const suggestions: { type: string; value: string; label: string }[] = []
    const seen = new Set<string>()
    
    ;(advances || []).forEach((a) => {
      if (a.employee?.name?.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(a.employee.name)) {
        seen.add(a.employee.name)
        suggestions.push({ type: "employee", value: a.employee.name, label: a.employee.name })
      }
    })
    
    ;(advances || []).forEach((a) => {
      if (a.kode?.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(a.kode)) {
        seen.add(a.kode)
        suggestions.push({ type: "kode", value: a.kode, label: a.kode })
      }
    })
    
    return suggestions.slice(0, 10)
  }

  const suggestions = getSuggestions()

  const selectSuggestion = (value: string) => {
    setSearchQuery(value)
    setShowSuggestions(false)
  }

  const openViewDialog = (advance: Advance) => {
    setSelectedAdvance(advance)
    setViewDialogOpen(true)
  }

  const openDeleteDialog = (advance: Advance) => {
    setSelectedAdvance(advance)
    setDeleteDialogOpen(true)
  }

  const openPayDialog = (advance: Advance) => {
    setSelectedAdvance(advance)
    const remaining = advance.amount - (advance.paidAmount || 0)
    setPaymentData({
      amount: remaining.toString(),
      date: new Date().toISOString().slice(0, 10),
      remark: "",
    })
    setPayDialogOpen(true)
  }

  const openRemarkDialog = (advance: Advance) => {
    setSelectedAdvance(advance)
    setRemarkData(advance.remark || "")
    setRemarkDialogOpen(true)
  }

  const handleCreateAdvance = async () => {
    if (!formData.employeeId || !formData.amount) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/advances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: formData.employeeId,
          amount: parseInt(formData.amount),
          purpose: formData.purpose,
          remark: formData.remark,
        }),
      })
      if (res.ok) {
        toast.success("Kasbon berhasil dibuat")
        setDialogOpen(false)
        setFormData({ employeeId: "", amount: "", purpose: "", remark: "" })
        refetch()
      } else {
        toast.error("Gagal membuat kasbon")
      }
    } catch (err) {
      console.error("Error creating advance:", err)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async (advance: Advance) => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/advances/${advance.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED", approvedBy: "Admin" }),
      })
      if (res.ok) {
        toast.success("Kasbon berhasil disetujui")
        refetch()
      } else {
        toast.error("Gagal menyetujui kasbon")
      }
    } catch (err) {
      console.error("Error approving advance:", err)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  const handlePay = async () => {
    if (!selectedAdvance || !paymentData.amount) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/advances/${selectedAdvance.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentAmount: parseInt(paymentData.amount),
          paymentDate: paymentData.date,
          paymentRemark: paymentData.remark,
        }),
      })
      if (res.ok) {
        toast.success("Pembayaran kasbon berhasil disimpan")
        setPayDialogOpen(false)
        refetch()
      } else {
        toast.error("Gagal menyimpan pembayaran")
      }
    } catch (err) {
      console.error("Error paying advance:", err)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateRemark = async () => {
    if (!selectedAdvance) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/advances/${selectedAdvance.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remark: remarkData }),
      })
      if (res.ok) {
        toast.success("Remark berhasil disimpan")
        setRemarkDialogOpen(false)
        refetch()
      } else {
        toast.error("Gagal menyimpan remark")
      }
    } catch (err) {
      console.error("Error updating remark:", err)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedAdvance) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/advances/${selectedAdvance.id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        toast.success("Kasbon berhasil dihapus")
        setDeleteDialogOpen(false)
        refetch()
      } else {
        toast.error("Gagal menghapus kasbon")
      }
    } catch (err) {
      console.error("Error deleting advance:", err)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-"
    const date = new Date(dateStr)
    return date.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "2-digit" })
  }

  const totalKasbon = (advances || []).reduce((sum, a) => sum + a.amount, 0)
  const totalPaid = (advances || []).reduce((sum, a) => sum + (a.paidAmount || 0), 0)
  const totalSisa = totalKasbon - totalPaid

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Kasbon"
        description="Kelola pengajuan kasbon karyawan"
        actions={
          <Button onClick={() => setDialogOpen(true)} className="dark:bg-[#304ffe] dark:hover:bg-[#304ffe]/80">
            <PlusIcon className="mr-2 h-4 w-4" />
            Tambah Kasbon
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-400/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Kasbon</CardTitle>
            <BanknotesIcon className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "-" : formatCurrency(totalKasbon)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-500/30 bg-gradient-to-br from-green-500/10 to-green-400/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sudah Dibayar</CardTitle>
            <BanknotesIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loading ? "-" : formatCurrency(totalPaid)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-400/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sisa Kasbon</CardTitle>
            <BanknotesIcon className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {loading ? "-" : formatCurrency(totalSisa)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-yellow-400/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menunggu</CardTitle>
            <CurrencyDollarIcon className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {loading ? "-" : filteredAdvances.filter(a => a.status === "PENDING").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Daftar Kasbon</CardTitle>
              <CardDescription>Riwayat kasbon karyawan</CardDescription>
            </div>
            <ExportPrint
              columns={[
                { key: "kode", label: "Kode" },
                { key: "employee", label: "Karyawan" },
                { key: "date", label: "Tanggal" },
                { key: "amount", label: "Jumlah" },
                { key: "paid", label: "Dibayar" },
                { key: "sisa", label: "Sisa" },
                { key: "status", label: "Status" },
                { key: "purpose", label: "Tujuan" },
                { key: "remark", label: "Remark" },
              ]}
              data={filteredAdvances.map(a => ({
                kode: a.kode || "-",
                employee: a.employee?.name || "-",
                date: formatDate(a.createdAt),
                amount: formatCurrency(a.amount),
                paid: formatCurrency(a.paidAmount || 0),
                sisa: formatCurrency(a.amount - (a.paidAmount || 0)),
                status: STATUS_LABELS[a.status] || a.status,
                purpose: a.purpose || "-",
                remark: a.remark || "-",
              }))}
              title="Daftar Kasbon Karyawan"
              filename="kasbon-karyawan"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative max-w-xs">
              <Input
                type="search"
                placeholder="Cari kode, karyawan..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full"
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
                        s.type === "employee" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                      }`}>
                        {s.type === "employee" ? "Karyawan" : "Kode"}
                      </span>
                      <span className="font-medium">{s.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm"
            >
              <option value="all">Semua Status</option>
              <option value="PENDING">Menunggu</option>
              <option value="APPROVED">Disetujui</option>
              <option value="LUNAS">Lunas</option>
            </select>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredAdvances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Belum ada data kasbon</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Karyawan</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="text-right">Dibayar</TableHead>
                    <TableHead className="text-right">Sisa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tujuan</TableHead>
                    <TableHead>Remark</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdvances.map((advance) => {
                    const sisa = advance.amount - (advance.paidAmount || 0)
                    return (
                      <TableRow key={advance.id}>
                        <TableCell className="font-medium text-blue-600">{advance.kode || "-"}</TableCell>
                        <TableCell>{advance.employee?.name || "-"}</TableCell>
                        <TableCell>{formatDate(advance.createdAt)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(advance.amount)}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCurrency(advance.paidAmount || 0)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${sisa > 0 ? "text-red-600" : "text-green-600"}`}>
                          {formatCurrency(sisa)}
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[advance.status] || "bg-gray-100 text-gray-800"}>
                            {STATUS_LABELS[advance.status] || advance.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">{advance.purpose || "-"}</TableCell>
                        <TableCell className="max-w-[150px]">
                          <span title={advance.remark || ""} className="block truncate">
                            {advance.remark || "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openViewDialog(advance)}>
                              <EyeIcon className="h-4 w-4" />
                            </Button>
                            {advance.status === "PENDING" && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--chart-blue)]" onClick={() => handleApprove(advance)}>
                                <CheckIcon className="h-4 w-4" />
                              </Button>
                            )}
                            {(advance.status === "PENDING" || advance.status === "APPROVED") && sisa > 0 && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => openPayDialog(advance)}>
                                <BanknotesIcon className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600" onClick={() => openRemarkDialog(advance)}>
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                <path d="M12 20h9"/>
                                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                              </svg>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => openDeleteDialog(advance)}>
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Kasbon</DialogTitle>
            <DialogDescription>Buat pengajuan kasbon baru</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Karyawan</label>
              <select
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="">Pilih Karyawan</option>
                {employees?.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Jumlah</label>
              <Input
                type="text"
                placeholder="0"
                value={formData.amount ? formatNumber(parseInt(formData.amount)) : ""}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d]/g, "")
                  setFormData({ ...formData, amount: value })
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tujuan</label>
              <Input
                placeholder="Keterangan kasbon..."
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Remark</label>
              <Textarea
                placeholder="Catatan admin (opsional)..."
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleCreateAdvance} disabled={submitting}>
              {submitting && <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Kasbon</DialogTitle>
          </DialogHeader>
          {selectedAdvance && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Kode Kasbon</p>
                  <p className="font-medium text-blue-600">{selectedAdvance.kode || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal</p>
                  <p className="font-medium">{formatDate(selectedAdvance.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Karyawan</p>
                  <p className="font-medium">{selectedAdvance.employee?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={STATUS_COLORS[selectedAdvance.status]}>
                    {STATUS_LABELS[selectedAdvance.status]}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 p-3 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-center">
                  <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 mb-0.5">Total</p>
                  <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{formatCurrency(selectedAdvance.amount || 0)}</p>
                </div>
                <div className="text-center border-x border-blue-200 dark:border-blue-800">
                  <p className="text-[10px] font-medium text-green-600 dark:text-green-400 mb-0.5">Dibayar</p>
                  <p className="text-sm font-bold text-green-600 dark:text-green-400">{formatCurrency(selectedAdvance.paidAmount || 0)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-medium text-red-600 dark:text-red-400 mb-0.5">Sisa</p>
                  <p className={`text-sm font-bold ${(selectedAdvance.amount - (selectedAdvance.paidAmount || 0)) > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                    {formatCurrency(selectedAdvance.amount - (selectedAdvance.paidAmount || 0))}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tujuan</p>
                <p className="font-medium">{selectedAdvance.purpose || "-"}</p>
              </div>
              {selectedAdvance.remark && (
                <div>
                  <p className="text-sm text-muted-foreground">Remark</p>
                  <p className="font-medium">{selectedAdvance.remark}</p>
                </div>
              )}
              {selectedAdvance.paymentHistory && selectedAdvance.paymentHistory.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Riwayat Pembayaran</p>
                  <div className="space-y-2">
                    {selectedAdvance.paymentHistory.map((payment, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div>
                          <p className="font-medium text-green-700 dark:text-green-400">
                            {formatCurrency(payment.amount)}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDate(payment.date)}</p>
                          {payment.remark && <p className="text-xs text-muted-foreground">{payment.remark}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pembayaran Kasbon</DialogTitle>
            <DialogDescription>
              {selectedAdvance?.kode || "Kasbon"}
            </DialogDescription>
          </DialogHeader>
          {selectedAdvance && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-2 p-3 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-center">
                  <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 mb-0.5">Total Kasbon</p>
                  <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{formatCurrency(selectedAdvance.amount)}</p>
                </div>
                <div className="text-center border-l border-green-200 dark:border-green-800">
                  <p className="text-[10px] font-medium text-green-600 dark:text-green-400 mb-0.5">Sudah Dibayar</p>
                  <p className="text-sm font-bold text-green-600 dark:text-green-400">{formatCurrency(selectedAdvance.paidAmount || 0)}</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Jumlah Bayar</label>
                <Input
                  type="text"
                  placeholder="0"
                  value={paymentData.amount ? formatNumber(parseInt(paymentData.amount)) : ""}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d]/g, "")
                    setPaymentData({ ...paymentData, amount: value })
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tanggal Bayar</label>
                <Input
                  type="date"
                  value={paymentData.date}
                  onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Remark</label>
                <Textarea
                  placeholder="Catatan pembayaran (opsional)..."
                  value={paymentData.remark}
                  onChange={(e) => setPaymentData({ ...paymentData, remark: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>Batal</Button>
            <Button onClick={handlePay} disabled={submitting} className="bg-green-600 hover:bg-green-700">
              {submitting && <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Pembayaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remark Dialog */}
      <Dialog open={remarkDialogOpen} onOpenChange={setRemarkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Remark</DialogTitle>
            <DialogDescription>
              {selectedAdvance?.kode || "Kasbon"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Remark</label>
              <Textarea
                placeholder="Catatan admin..."
                value={remarkData}
                onChange={(e) => setRemarkData(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemarkDialogOpen(false)}>Batal</Button>
            <Button onClick={handleUpdateRemark} disabled={submitting}>
              {submitting && <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Kasbon</DialogTitle>
            <DialogDescription>Yakin ingin menghapus kasbon ini?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting && <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
