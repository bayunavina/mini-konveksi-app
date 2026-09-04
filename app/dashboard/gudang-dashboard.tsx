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
    <div className="page-container">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[var(--brand-primary)] via-[var(--brand-primary)] to-[var(--accent)] rounded-2xl p-4 sm:p-5 text-primary-foreground shadow-xl shadow-[var(--brand-primary)]/20">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
          <TruckIconSolid className="h-24 w-24 sm:h-40 sm:w-40 -translate-y-6 translate-x-6 sm:-translate-y-8 sm:translate-x-8" />
        </div>
        <div className="relative z-10 min-w-0">
          <p className="text-[10px] sm:text-xs font-medium opacity-80 mb-1">Dashboard</p>
          <h2 className="text-base sm:text-xl font-bold mb-1 truncate">Dashboard Gudang</h2>
          <p className="text-xs sm:text-sm opacity-80 truncate">
            Monitoring stok dan validasi transfer barang
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 xl:gap-5">
        <Card className="hover:shadow-lg hover:border-warning/30 transition-all duration-300 p-3 sm:p-4 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-sm text-muted-foreground truncate">Pending</p>
              <p className="text-lg sm:text-2xl font-bold mt-0.5">{pendingIncoming.length + pendingOutgoing.length}</p>
              <p className="text-[9px] sm:text-xs text-muted-foreground truncate">Menunggu action</p>
            </div>
            <ClockIcon className="h-6 w-6 sm:h-8 sm:w-8 text-warning-foreground dark:text-warning-foreground shrink-0" />
          </div>
        </Card>

        <Card className="hover:shadow-lg hover:border-success/30 transition-all duration-300 p-3 sm:p-4 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-sm text-muted-foreground truncate">Barang Masuk</p>
              <p className="text-lg sm:text-2xl font-bold mt-0.5">{incomingTransfers.length}</p>
              <p className="text-[9px] sm:text-xs text-muted-foreground truncate">{pendingIncoming.length} perlu divalidasi</p>
            </div>
            <ArrowDownIcon className="h-6 w-6 sm:h-8 sm:w-8 text-success-foreground dark:text-success-foreground shrink-0" />
          </div>
        </Card>

        <Card className="hover:shadow-lg hover:border-[var(--chart-blue)]/30 transition-all duration-300 p-3 sm:p-4 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-sm text-muted-foreground truncate">Barang Keluar</p>
              <p className="text-lg sm:text-2xl font-bold mt-0.5">{outgoingTransfers.length}</p>
              <p className="text-[9px] sm:text-xs text-muted-foreground truncate">{pendingOutgoing.length} perlu divalidasi</p>
            </div>
            <ArrowUpIcon className="h-6 w-6 sm:h-8 sm:w-8 text-[var(--chart-blue)] shrink-0" />
          </div>
        </Card>

        <Card className="hover:shadow-lg hover:border-accent/30 transition-all duration-300 p-3 sm:p-4 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-sm text-muted-foreground truncate">Produk Jadi</p>
              <p className="text-lg sm:text-2xl font-bold mt-0.5">{totalFinishedGoods}</p>
              <p className="text-[9px] sm:text-xs text-muted-foreground truncate">Total pcs di gudang</p>
            </div>
            <CubeIcon className="h-6 w-6 sm:h-8 sm:w-8 text-accent-foreground dark:text-accent-foreground shrink-0" />
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Link href="/dashboard/transfer/incoming" className="flex-1 sm:flex-none">
          <Button className="w-full bg-gradient-to-r from-[var(--success)] to-[var(--success)] hover:from-[var(--success)] hover:to-[var(--success)] shadow-lg shadow-[var(--success)]/25">
            <ArrowDownIcon className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Validasi Masuk
            <Badge className="ml-1.5 sm:ml-2 bg-white/20 text-white text-[10px] sm:text-xs">
              {pendingIncoming.length}
            </Badge>
          </Button>
        </Link>
        <Link href="/dashboard/transfer/outgoing" className="flex-1 sm:flex-none">
          <Button className="w-full bg-gradient-to-r from-[var(--chart-blue)] to-[var(--chart-blue)] hover:opacity-90 shadow-lg shadow-[var(--chart-blue)]/25">
            <ArrowUpIcon className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Validasi Keluar
            <Badge className="ml-1.5 sm:ml-2 bg-white/20 text-white text-[10px] sm:text-xs">
              {pendingOutgoing.length}
            </Badge>
          </Button>
        </Link>
        <Link href="/dashboard/inventory/finished" className="flex-1 sm:flex-none">
          <Button variant="outline" className="w-full">
            <CubeIcon className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Lihat Stok
          </Button>
        </Link>
      </div>

      {/* Transfer List with Tabs */}
      <Card className="overflow-hidden">
        <CardHeader className="p-3 sm:p-6 pb-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-lg">Daftar Transfer</CardTitle>
              <CardDescription className="text-[10px] sm:text-sm">Semua aktivitas transfer barang</CardDescription>
            </div>
            <div className="flex gap-1 sm:gap-2 w-full sm:w-auto">
              <Button 
                variant={activeTab === "incoming" ? "default" : "outline"} 
                size="lg"
                onClick={() => setActiveTab("incoming")}
                className="flex-1 sm:flex-none px-2 sm:px-3"
              >
                <ArrowDownIcon className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Masuk
              </Button>
              <Button 
                variant={activeTab === "outgoing" ? "default" : "outline"} 
                size="lg"
                onClick={() => setActiveTab("outgoing")}
                className="flex-1 sm:flex-none px-2 sm:px-3"
              >
                <ArrowUpIcon className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Keluar
              </Button>
              <Button 
                variant={activeTab === "all" ? "default" : "outline"} 
                size="lg"
                onClick={() => setActiveTab("all")}
                className="flex-1 sm:flex-none px-2 sm:px-3"
              >
                Semua
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {filteredTransfers.length === 0 ? (
            <div className="text-center py-10 sm:py-12 text-muted-foreground">
              <TruckIcon className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="font-medium text-xs sm:text-base">Belum ada transfer</p>
              <p className="text-[10px] sm:text-sm mt-1">Transfer barang akan muncul di sini</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-1 px-1">
              <Table className="min-w-[480px]">
                <TableHeader>
                  <TableRow className="border-y">
                    <TableHead className="p-2 text-[10px] sm:text-xs whitespace-nowrap">No. Transfer</TableHead>
                    <TableHead className="p-2 text-[10px] sm:text-xs hidden md:table-cell">Tanggal</TableHead>
                    <TableHead className="p-2 text-[10px] sm:text-xs">Tipe</TableHead>
                    <TableHead className="p-2 text-[10px] sm:text-xs hidden sm:table-cell">Items</TableHead>
                    <TableHead className="p-2 text-[10px] sm:text-xs">Total Qty</TableHead>
                    <TableHead className="p-2 text-[10px] sm:text-xs">Status</TableHead>
                    <TableHead className="text-center p-2 text-[10px] sm:text-xs">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransfers.slice(0, 20).map((transfer) => (
                    <TableRow key={transfer.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-mono font-medium p-2 text-[10px] sm:text-xs whitespace-nowrap">{transfer.transferNumber}</TableCell>
                      <TableCell className="text-[10px] sm:text-xs p-2 hidden md:table-cell whitespace-nowrap">{formatDate(transfer.createdAt)}</TableCell>
                      <TableCell className="p-2">
                        <Badge variant="outline" className={`whitespace-nowrap text-[10px] sm:text-xs ${
                          transfer.type === "INCOMING" ? "text-success-foreground border-[var(--success)] dark:border-[var(--success)]" : "text-[var(--chart-blue)] border-[var(--chart-blue)]/30"
                        }`}>
                          {transfer.type === "INCOMING" ? "Masuk" : "Keluar"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] sm:text-xs p-2 whitespace-nowrap hidden sm:table-cell">{transfer.items?.length || 0} item</TableCell>
                      <TableCell className="font-medium p-2 text-[10px] sm:text-xs">{getTotalItems(transfer.items)}</TableCell>
                      <TableCell className="p-2">
                        <Badge className={`${STATUS_COLORS[transfer.status] || "bg-muted"} font-medium whitespace-nowrap text-[10px] sm:text-xs`}>
                          {STATUS_LABELS[transfer.status] || transfer.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center p-2">
                        <Button variant="ghost" size="icon-lg" onClick={() => handleViewTransfer(transfer)}>
                          <EyeIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
      <Card className="overflow-hidden">
        <CardHeader className="p-3 sm:p-6 pb-0">
          <CardTitle className="text-sm sm:text-lg">Stok Barang Jadi</CardTitle>
          <CardDescription className="text-[10px] sm:text-sm">Monitoring stok produk jadi real-time</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 space-y-2 sm:space-y-4">
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
            <div className="text-center py-6 sm:py-8 text-muted-foreground">
              <CubeIcon className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-xs sm:text-sm">Tidak ada produk ditemukan</p>
              <p className="text-[10px] sm:text-xs mt-1">Data akan tampil setelah produksi & QC</p>
            </div>
          ) : (
            <div className="space-y-1.5 sm:space-y-2">
              {filteredInventoryStock.slice(0, 10).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2.5 sm:p-3 border rounded-xl hover:bg-muted/50 transition-colors gap-2 min-h-[52px] sm:min-h-[60px]">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs sm:text-sm truncate">{item.product?.name || "-"}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">SKU: {item.product?.sku || "-"}</p>
                  </div>
                  <div className="text-right mr-1 sm:mr-2 shrink-0">
                    <p className="text-sm sm:text-lg font-bold text-accent-foreground dark:text-accent-foreground">{item.successQty}</p>
                    <p className="text-[9px] sm:text-xs text-muted-foreground">pcs</p>
                  </div>
                  <Link href={`/dashboard/inventory/finished?search=${item.product?.sku}`}>
                    <Button variant="ghost" size="lg" className="px-2 sm:px-3">Detail</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom Spacing for Mobile Gesture Bar */}
      <div className="h-2 md:hidden" />

      {/* Transfer Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto mx-2 sm:mx-4">
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
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">
                  Tutup
                </Button>
                <Button onClick={() => {
                  setDialogOpen(false)
                  router.push(selectedTransfer.type === "INCOMING" ? "/dashboard/transfer/incoming" : "/dashboard/transfer/outgoing")
                }} className="w-full sm:w-auto">
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
