"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
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
  CubeIcon,
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  TruckIcon,
  TruckIcon as TruckIconSolid,
} from "@heroicons/react/24/outline"
import { useFetch } from "@/hooks/useFetch"
import { formatDate, formatDateLong } from "@/lib/utils"

interface Transfer {
  id: string
  transferNumber: string
  type: string
  status: string
  createdAt: string
  fromWarehouseId?: string
  toWarehouseId?: string
  notes?: string
  items?: TransferItem[]
}

interface TransferItem {
  id: string
  productId?: string
  skuCode?: string
  skuName?: string
  quantity: number
  unit?: string
}

interface QCReport {
  id: string
  successQty: number
  rejectQty: number
  createdAt: string
  product: {
    id: string
    sku: string
    name: string
  }
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu",
  SHIPPED: "Dikirim",
  RECEIVED: "Diterima",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-warning-light text-warning-foreground dark:bg-warning-light dark:text-warning-foreground",
  SHIPPED: "bg-[var(--chart-blue)]/10 text-[var(--chart-blue)] dark:text-[var(--chart-blue)]",
  RECEIVED: "bg-success-light text-success-foreground dark:bg-success-light dark:text-success-foreground",
  COMPLETED: "bg-success-light text-success-foreground dark:bg-success-light dark:text-success-foreground",
  CANCELLED: "bg-destructive/10 text-destructive dark:bg-destructive/10 dark:text-destructive",
}

export function GudangDashboard() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing" | "all">("incoming")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null)

  const { data: transfers } = useFetch<Transfer[]>("/api/transfers")
  const { data: qcReports } = useFetch<QCReport[]>("/api/qc-reports")

  const allTransfers = Array.isArray(transfers) ? transfers : []
  const incomingTransfers = allTransfers.filter(t => t.type === "INCOMING")
  const outgoingTransfers = allTransfers.filter(t => t.type === "OUTGOING")
  const pendingIncoming = incomingTransfers.filter(t => t.status === "PENDING" || t.status === "SHIPPED")
  const pendingOutgoing = outgoingTransfers.filter(t => t.status === "PENDING")

  const filteredTransfers = allTransfers.filter(t => {
    if (activeTab === "incoming") return t.type === "INCOMING"
    if (activeTab === "outgoing") return t.type === "OUTGOING"
    return true
  })

  const filteredInventoryStock = (qcReports || []).filter((item) =>
    item.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.product?.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalFinishedGoods = (qcReports || []).reduce((sum, r) => sum + (r.successQty || 0), 0)

  const handleViewTransfer = (transfer: Transfer) => {
    setSelectedTransfer(transfer)
    setDialogOpen(true)
  }

  const getTotalItems = (items?: TransferItem[]) => {
    if (!items || items.length === 0) return 0
    return items.reduce((sum, item) => sum + item.quantity, 0)
  }

  return (
    <div className="page-container p-3 md:p-6 pt-4">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[var(--brand-primary)] via-[var(--brand-primary)] to-[var(--accent)] rounded-2xl p-4 sm:p-5 text-primary-foreground shadow-xl shadow-[var(--brand-primary)]/20">
        <div className="absolute top-0 right-0 opacity-10">
          <TruckIconSolid className="h-40 w-40 -translate-y-8 translate-x-8" />
        </div>
        <div className="relative z-10">
          <p className="text-xs font-medium opacity-80 mb-1">Dashboard</p>
          <h2 className="text-lg sm:text-xl font-bold mb-1">Dashboard Gudang</h2>
          <p className="text-xs sm:text-sm opacity-80">
            Monitoring stok dan validasi transfer barang
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="hover:shadow-lg hover:border-warning/30 transition-all duration-300 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Pending</p>
              <p className="text-xl sm:text-2xl font-bold mt-0.5">{pendingIncoming.length + pendingOutgoing.length}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Menunggu action</p>
            </div>
            <ClockIcon className="h-7 w-7 sm:h-8 sm:w-8 text-warning-foreground dark:text-warning-foreground shrink-0" />
          </div>
        </Card>

        <Card className="hover:shadow-lg hover:border-success/30 transition-all duration-300 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Barang Masuk</p>
              <p className="text-xl sm:text-2xl font-bold mt-0.5">{incomingTransfers.length}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{pendingIncoming.length} perlu divalidasi</p>
            </div>
            <ArrowDownIcon className="h-7 w-7 sm:h-8 sm:w-8 text-success-foreground dark:text-success-foreground shrink-0" />
          </div>
        </Card>

        <Card className="hover:shadow-lg hover:border-[var(--chart-blue)]/30 transition-all duration-300 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Barang Keluar</p>
              <p className="text-xl sm:text-2xl font-bold mt-0.5">{outgoingTransfers.length}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{pendingOutgoing.length} perlu divalidasi</p>
            </div>
            <ArrowUpIcon className="h-7 w-7 sm:h-8 sm:w-8 text-[var(--chart-blue)] shrink-0" />
          </div>
        </Card>

        <Card className="hover:shadow-lg hover:border-accent/30 transition-all duration-300 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Produk Jadi</p>
              <p className="text-xl sm:text-2xl font-bold mt-0.5">{totalFinishedGoods}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Total pcs di gudang</p>
            </div>
            <CubeIcon className="h-7 w-7 sm:h-8 sm:w-8 text-accent-foreground dark:text-accent-foreground shrink-0" />
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Link href="/dashboard/transfer/incoming" className="flex-1 sm:flex-none">
          <Button className="w-full bg-gradient-to-r from-[var(--success)] to-[var(--success)] hover:from-[var(--success)] hover:to-[var(--success)] shadow-lg shadow-[var(--success)]/25 min-h-[44px]">
            <ArrowDownIcon className="mr-2 h-4 w-4" />
            Validasi Masuk
            <Badge className="ml-2 bg-white/20 text-white text-xs">
              {pendingIncoming.length}
            </Badge>
          </Button>
        </Link>
        <Link href="/dashboard/transfer/outgoing" className="flex-1 sm:flex-none">
          <Button className="w-full bg-gradient-to-r from-[var(--chart-blue)] to-[var(--chart-blue)] hover:opacity-90 shadow-lg shadow-[var(--chart-blue)]/25 min-h-[44px]">
            <ArrowUpIcon className="mr-2 h-4 w-4" />
            Validasi Keluar
            <Badge className="ml-2 bg-white/20 text-white text-xs">
              {pendingOutgoing.length}
            </Badge>
          </Button>
        </Link>
        <Link href="/dashboard/inventory/finished" className="flex-1 sm:flex-none">
          <Button variant="outline" className="w-full min-h-[44px]">
            <CubeIcon className="mr-2 h-4 w-4" />
            Lihat Stok
          </Button>
        </Link>
      </div>

      {/* Transfer List with Tabs */}
      <Card>
        <CardHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg">Daftar Transfer</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Semua aktivitas transfer barang</CardDescription>
            </div>
            <div className="flex gap-1 sm:gap-2 w-full sm:w-auto">
              <Button 
                variant={activeTab === "incoming" ? "default" : "outline"} 
                size="sm"
                onClick={() => setActiveTab("incoming")}
                className="min-h-[44px] flex-1 sm:flex-none px-2 sm:px-3"
              >
                <ArrowDownIcon className="mr-1 h-4 w-4" />
                <span className="hidden xs:inline">Masuk</span>
              </Button>
              <Button 
                variant={activeTab === "outgoing" ? "default" : "outline"} 
                size="sm"
                onClick={() => setActiveTab("outgoing")}
                className="min-h-[44px] flex-1 sm:flex-none px-2 sm:px-3"
              >
                <ArrowUpIcon className="mr-1 h-4 w-4" />
                <span className="hidden xs:inline">Keluar</span>
              </Button>
              <Button 
                variant={activeTab === "all" ? "default" : "outline"} 
                size="sm"
                onClick={() => setActiveTab("all")}
                className="min-h-[44px] flex-1 sm:flex-none px-2 sm:px-3"
              >
                Semua
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {filteredTransfers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TruckIcon className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="font-medium text-sm sm:text-base">Belum ada transfer</p>
              <p className="text-xs sm:text-sm mt-1">Transfer barang akan muncul di sini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-y">
                    <TableHead className="p-2 text-xs whitespace-nowrap">No. Transfer</TableHead>
                    <TableHead className="p-2 text-xs hidden md:table-cell">Tanggal</TableHead>
                    <TableHead className="p-2 text-xs">Tipe</TableHead>
                    <TableHead className="p-2 text-xs">Items</TableHead>
                    <TableHead className="p-2 text-xs">Total Qty</TableHead>
                    <TableHead className="p-2 text-xs">Status</TableHead>
                    <TableHead className="text-center p-2 text-xs">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransfers.slice(0, 20).map((transfer) => (
                    <TableRow key={transfer.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-mono font-medium p-2 text-xs whitespace-nowrap">{transfer.transferNumber}</TableCell>
                      <TableCell className="text-xs p-2 hidden md:table-cell whitespace-nowrap">{formatDate(transfer.createdAt)}</TableCell>
                      <TableCell className="p-2">
                        <Badge variant="outline" className={`whitespace-nowrap ${
                          transfer.type === "INCOMING" ? "text-success-foreground border-[var(--success)] dark:border-[var(--success)]" : "text-[var(--chart-blue)] border-[var(--chart-blue)]/30"
                        }`}>
                          {transfer.type === "INCOMING" ? "Masuk" : "Keluar"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs p-2 whitespace-nowrap">{transfer.items?.length || 0} item</TableCell>
                      <TableCell className="font-medium p-2 text-xs">{getTotalItems(transfer.items)}</TableCell>
                      <TableCell className="p-2">
                        <Badge className={`${STATUS_COLORS[transfer.status] || "bg-muted"} font-medium whitespace-nowrap`}>
                          {STATUS_LABELS[transfer.status] || transfer.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center p-2">
                        <Button variant="ghost" size="sm" onClick={() => handleViewTransfer(transfer)} className="min-h-[44px] min-w-[44px] p-0">
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Overview */}
      <Card>
        <CardHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
          <CardTitle className="text-base sm:text-lg">Stok Barang Jadi</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Monitoring stok produk jadi real-time</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2">
            <MagnifyingGlassIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Cari produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg text-base bg-background min-h-[44px]"
            />
          </div>

          {filteredInventoryStock.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CubeIcon className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm">Tidak ada produk ditemukan</p>
              <p className="text-xs mt-1">Data akan tampil setelah produksi & QC</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredInventoryStock.slice(0, 10).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-xl hover:bg-muted/50 transition-colors gap-2 min-h-[60px]">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.product?.name || "-"}</p>
                    <p className="text-xs text-muted-foreground truncate">SKU: {item.product?.sku || "-"}</p>
                  </div>
                  <div className="text-right mr-2 shrink-0">
                    <p className="text-base sm:text-lg font-bold text-accent-foreground dark:text-accent-foreground">{item.successQty}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">pcs</p>
                  </div>
                  <Link href={`/dashboard/inventory/finished?search=${item.product?.sku}`}>
                    <Button variant="ghost" size="sm" className="min-h-[44px] px-2 sm:px-3">Detail</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transfer Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Transfer</DialogTitle>
          </DialogHeader>
          {selectedTransfer && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">No. Transfer</p>
                  <p className="font-mono font-medium text-sm">{selectedTransfer.transferNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <Badge className={`${STATUS_COLORS[selectedTransfer.status] || ""}`}>
                    {STATUS_LABELS[selectedTransfer.status] || selectedTransfer.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tipe</p>
                  <p className="font-medium text-sm">{selectedTransfer.type === "INCOMING" ? "Barang Masuk" : "Barang Keluar"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tanggal</p>
                  <p className="font-medium text-sm">{formatDateLong(selectedTransfer.createdAt)}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Items ({selectedTransfer.items?.length || 0})</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedTransfer.items?.map((item, idx) => (
                    <div key={item.id || idx} className="flex justify-between items-center p-2 bg-muted/50 rounded-lg gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{item.skuName || "-"}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.skuCode || "-"}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm">{item.quantity}</p>
                        <p className="text-xs text-muted-foreground">{item.unit || "pcs"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedTransfer.notes && (
                <div className="border-t pt-4">
                  <p className="text-xs text-muted-foreground mb-1">Catatan</p>
                  <p className="text-sm">{selectedTransfer.notes}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="min-h-[44px] w-full sm:w-auto">
                  Tutup
                </Button>
                <Button onClick={() => {
                  setDialogOpen(false)
                  router.push(selectedTransfer.type === "INCOMING" ? "/dashboard/transfer/incoming" : "/dashboard/transfer/outgoing")
                }} className="min-h-[44px] w-full sm:w-auto">
                  {selectedTransfer.type === "INCOMING" ? "Validasi Masuk" : "Validasi Keluar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
