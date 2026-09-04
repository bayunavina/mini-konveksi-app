"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader } from "@/components/shared"
import { ExportPrint } from "@/components/shared/export-print"
import { MagnifyingGlassIcon, ArrowLeftIcon, ExclamationTriangleIcon, CheckIcon, ArrowPathIcon, TrashIcon, EyeIcon, LockClosedIcon } from "@heroicons/react/24/outline"
import { useFetch } from "@/hooks/useFetch"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"

interface Reject {
  id: string
  quantity: number
  unit: string
  reason: string
  description?: string
  status: string
  resolution?: string
  resolvedBy?: string
  resolvedAt?: string
  createdAt: string
  jobOrder?: {
    id: string
    joNumber: string
  }
  product?: {
    id: string
    sku: string
    name: string
  }
}

interface User {
  id: string
  name: string
  email: string
  role?: string
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu",
  REVIEW: "Ditinjau",
  APPROVED: "Disetujui",
  REWORK: "Perbaikan",
  DISPOSED: "Dibuang",
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  REVIEW: "bg-[var(--chart-blue)]/10 text-[var(--chart-blue)]",
  APPROVED: "bg-green-100 text-green-800",
  REWORK: "bg-orange-100 text-orange-800",
  DISPOSED: "bg-gray-100 text-gray-800",
}

const QC_ADMIN_ROLES = ["ADMIN", "QC"]

export default function RejectsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [selectedReject, setSelectedReject] = useState<Reject | null>(null)
  const [actionType, setActionType] = useState<"APPROVE" | "REWORK" | "DISPOSE">("APPROVE")
  const [actionNotes, setActionNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  const { data: rejects, loading, refetch } = useFetch<Reject[]>("/api/rejects")

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch("/api/auth/get-session")
        if (response.ok) {
          const data = await response.json()
          setCurrentUser(data.user)
        }
      } catch (error) {
        console.error("Error fetching user:", error)
      }
    }
    fetchUser()
  }, [])

  const canProcess = currentUser?.role && QC_ADMIN_ROLES.includes(currentUser.role)

  const filteredRejects = (rejects || []).filter((r) => {
    const matchesSearch =
      r.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.product?.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.jobOrder?.joNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reason?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getSuggestions = () => {
    if (!searchQuery || searchQuery.length < 2) return []
    
    const suggestions: { type: string; value: string; label: string }[] = []
    const seen = new Set<string>()
    
    ;(rejects || []).forEach((r) => {
      const joNumber = r.jobOrder?.joNumber
      if (joNumber && joNumber.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(joNumber)) {
        seen.add(joNumber)
        suggestions.push({ type: "joNumber", value: joNumber, label: joNumber })
      }
      const productName = r.product?.name
      if (productName && productName.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(productName)) {
        seen.add(productName)
        suggestions.push({ type: "productName", value: productName, label: productName })
      }
    })
    
    return suggestions.slice(0, 10)
  }

  const suggestions = getSuggestions()

  const selectSuggestion = (value: string) => {
    setSearchQuery(value)
    setShowSuggestions(false)
  }

  const pendingCount = (rejects || []).filter(r => r.status === "PENDING").length
  const reviewCount = (rejects || []).filter(r => r.status === "REVIEW").length

  const openViewDialog = (reject: Reject) => {
    setSelectedReject(reject)
    setViewDialogOpen(true)
  }

  const openActionDialog = (reject: Reject, action: "APPROVE" | "REWORK" | "DISPOSE") => {
    setSelectedReject(reject)
    setActionType(action)
    setActionNotes("")
    setActionDialogOpen(true)
  }

  const handleAction = async () => {
    if (!selectedReject) return

    setSubmitting(true)
    try {
      const statusMap = {
        APPROVE: "APPROVED",
        REWORK: "REWORK",
        DISPOSE: "DISPOSED",
      }

      const resolutionMap = {
        APPROVE: "Disetujui QC - Barang layak jual",
        REWORK: "Dikembalikan untuk diperbaiki",
        DISPOSE: "Dibuang/discards",
      }

      const response = await fetch(`/api/rejects/${selectedReject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: statusMap[actionType],
          resolution: actionNotes || resolutionMap[actionType],
        }),
      })

      if (response.ok) {
        const actionLabel = actionType === "APPROVE" ? "disetujui" : actionType === "REWORK" ? "dikembalikan untuk perbaikan" : "dibuang"
        toast.success(`Reject berhasil ${actionLabel}`)
        setActionDialogOpen(false)
        refetch()
      } else {
        const data = await response.json()
        toast.error(data.error || "Gagal memproses reject")
      }
    } catch (error) {
      console.error("Error processing reject:", error)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Data Reject"
        description="Kelola barang gagal QC"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push("/dashboard/inventory")}>
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Kembali
            </Button>
            <ExportPrint
              title="Daftar Reject"
              filename="data-reject"
              columns={[
                { key: "joNumber", label: "No. JO" },
                { key: "sku", label: "SKU" },
                { key: "productName", label: "Nama" },
                { key: "quantity", label: "Jumlah" },
                { key: "reason", label: "Alasan" },
                { key: "createdAt", label: "Tanggal" },
                { key: "status", label: "Status" },
              ]}
              data={filteredRejects.map(r => ({
                joNumber: r.jobOrder?.joNumber || "-",
                sku: r.product?.sku || "-",
                productName: r.product?.name || "-",
                quantity: `${r.quantity} ${r.unit}`,
                reason: r.reason,
                createdAt: formatDate(r.createdAt),
                status: r.status === "PENDING" ? "Menunggu" : 
                        r.status === "REVIEW" ? "Ditinjau" :
                        r.status === "APPROVED" ? "Disetujui" :
                        r.status === "REWORK" ? "Perbaikan" : "Dibuang",
              }))}
            />
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reject</CardTitle>
            <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejects?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Item</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menunggu</CardTitle>
            <Badge className="bg-yellow-100 text-yellow-800">{pendingCount}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Belum diproses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ditinjau</CardTitle>
            <Badge className="bg-blue-100 text-blue-800">{reviewCount}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewCount}</div>
            <p className="text-xs text-muted-foreground">Sedang ditinjau</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Qty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(rejects || []).reduce((acc, r) => acc + r.quantity, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Pcs</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Reject</CardTitle>
          <CardDescription>Kelola barang yang tidak lolos QC</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari JO, SKU, atau alasan..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="pl-9"
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
                        s.type === "joNumber" ? "bg-blue-100 text-blue-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {s.type === "joNumber" ? "JO" : "Produk"}
                      </span>
                      <span className="font-medium">{s.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Status</SelectItem>
                <SelectItem value="PENDING">Menunggu</SelectItem>
                <SelectItem value="REVIEW">Ditinjau</SelectItem>
                <SelectItem value="APPROVED">Disetujui</SelectItem>
                <SelectItem value="REWORK">Perbaikan</SelectItem>
                <SelectItem value="DISPOSED">Dibuang</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="lg" onClick={() => refetch()}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredRejects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Belum ada data reject</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. JO</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Alasan</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRejects.map((reject) => (
                  <TableRow key={reject.id}>
                    <TableCell className="font-mono">{reject.jobOrder?.joNumber || "-"}</TableCell>
                    <TableCell className="font-mono">{reject.product?.sku || "-"}</TableCell>
                    <TableCell>{reject.product?.name || "-"}</TableCell>
                    <TableCell className="text-red-600 font-medium">
                      {reject.quantity} {reject.unit}
                    </TableCell>
                    <TableCell>{reject.reason}</TableCell>
                    <TableCell>
                      {formatDate(reject.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${STATUS_COLORS[reject.status] || "bg-gray-100"}`}>
                        {STATUS_LABELS[reject.status] || reject.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-lg"
                          
                          onClick={() => openViewDialog(reject)}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                        {reject.status === "PENDING" && (
                          <>
                            {canProcess ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon-lg"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => openActionDialog(reject, "APPROVE")}
                                  title="Setujui - Barang layak jual"
                                >
                                  <CheckIcon className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-lg"
                                  className="text-orange-600 hover:text-orange-700"
                                  onClick={() => openActionDialog(reject, "REWORK")}
                                  title="Perbaiki - Kembalikan ke produksi"
                                >
                                  <ArrowPathIcon className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-lg"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => openActionDialog(reject, "DISPOSE")}
                                  title="Buang - Buang barang"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon-lg"
                                className="text-gray-400 cursor-not-allowed"
                                title="Hanya Admin dan QC yang dapat memproses"
                                disabled
                              >
                                <LockClosedIcon className="h-4 w-4" />
                              </Button>
                            )}
                          </>
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

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Reject</DialogTitle>
            <DialogDescription>Informasi lengkap reject</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">No. JO</p>
                <p className="font-mono font-medium">{selectedReject?.jobOrder?.joNumber || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tanggal</p>
                <p className="font-medium">
                  {selectedReject && formatDate(selectedReject.createdAt)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">SKU</p>
                <p className="font-mono font-medium">{selectedReject?.product?.sku || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nama Produk</p>
                <p className="font-medium">{selectedReject?.product?.name || "-"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Jumlah</p>
                <p className="font-medium text-red-600">
                  {selectedReject?.quantity} {selectedReject?.unit}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Alasan</p>
                <p className="font-medium">{selectedReject?.reason}</p>
              </div>
            </div>
            {selectedReject?.description && (
              <div>
                <p className="text-sm text-muted-foreground">Deskripsi</p>
                <p className="font-medium">{selectedReject.description}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge className={STATUS_COLORS[selectedReject?.status || "PENDING"]}>
                {STATUS_LABELS[selectedReject?.status || "PENDING"]}
              </Badge>
            </div>
            {selectedReject?.resolution && (
              <div>
                <p className="text-sm text-muted-foreground">Resolusi</p>
                <p className="font-medium">{selectedReject.resolution}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "APPROVE" ? "Setujui Reject" : 
               actionType === "REWORK" ? "Kembalikan untuk Perbaikan" : "Buang Barang"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "APPROVE" 
                ? "Barang akan dipindahkan ke inventory sebagai barang layak jual"
                : actionType === "REWORK"
                ? "Barang akan dikembalikan ke tim produksi untuk diperbaiki"
                : "Barang akan dibuang dan tidak dapat dikembalikan"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">Detail Item</p>
              <p className="font-medium">{selectedReject?.product?.name}</p>
              <p className="text-sm text-muted-foreground">
                Qty: {selectedReject?.quantity} {selectedReject?.unit}
              </p>
              <p className="text-sm text-muted-foreground">Alasan: {selectedReject?.reason}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Catatan (opsional)</label>
              <Input
                placeholder={
                  actionType === "APPROVE" 
                    ? "Contoh: Barang sudah diperbaiki, layak jual"
                    : actionType === "REWORK"
                    ? "Contoh: Perlu jahit ulang bagian manset"
                    : "Contoh: Bahan tidak bisa diperbaiki"
                }
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Batal
            </Button>
            <Button
              variant={actionType === "APPROVE" ? "default" : actionType === "REWORK" ? "secondary" : "destructive"}
              onClick={handleAction}
              disabled={submitting}
            >
              {submitting && <Spinner data-icon="inline-start" />}
              {actionType === "APPROVE" ? "Setujui" : actionType === "REWORK" ? "Kembalikan" : "Buang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
