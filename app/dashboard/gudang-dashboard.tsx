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
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  SHIPPED: "bg-[var(--chart-blue)]/10 text-[var(--chart-blue)] dark:text-[var(--chart-blue)]",
  RECEIVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
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
    <div className="flex-1 space-y-4 p-3 md:p-6 pt-4">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 rounded-2xl p-5 text-primary-foreground shadow-xl shadow-indigo-500/20">
        <div className="absolute top-0 right-0 opacity-10">
          <TruckIconSolid className="h-40 w-40 -translate-y-8 translate-x-8" />
        </div>
        <div className="relative z-10">
          <p className="text-xs font-medium opacity-80 mb-1">Dashboard</p>
          <h2 className="text-xl font-bold mb-1">Dashboard Gudang</h2>
          <p className="text-sm opacity-80">
            Monitoring stok dan validasi transfer barang
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg hover:border-orange-500/30 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 px-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Pending</CardTitle>
            <ClockIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{pendingIncoming.length + pendingOutgoing.length}</div>
            <p className="text-xs text-muted-foreground">Menunggu action</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg hover:border-green-500/30 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 px-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Barang Masuk</CardTitle>
            <ArrowDownIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{incomingTransfers.length}</div>
            <p className="text-xs text-muted-foreground">{pendingIncoming.length} perlu divalidasi</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg hover:border-[var(--chart-blue)]/30 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 px-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Barang Keluar</CardTitle>
            <ArrowUpIcon className="h-4 w-4 text-[var(--chart-blue)]" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{outgoingTransfers.length}</div>
            <p className="text-xs text-muted-foreground">{pendingOutgoing.length} perlu divalidasi</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg hover:border-purple-500/30 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 px-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Produk Jadi</CardTitle>
            <CubeIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{totalFinishedGoods}</div>
            <p className="text-xs text-muted-foreground">Total pcs di gudang</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 flex-wrap">
        <Link href="/dashboard/transfer/incoming">
          <Button className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/25 min-w-[200px]">
            <ArrowDownIcon className="mr-2 h-4 w-4" />
            Validasi Barang Masuk
            <Badge className="ml-2 bg-white/20 text-white">
              {pendingIncoming.length}
            </Badge>
          </Button>
        </Link>
        <Link href="/dashboard/transfer/outgoing">
          <Button className="bg-gradient-to-r from-[var(--chart-blue)] to-[var(--chart-blue)] hover:opacity-90 shadow-lg shadow-[var(--chart-blue)]/25 min-w-[200px]">
            <ArrowUpIcon className="mr-2 h-4 w-4" />
            Validasi Barang Keluar
            <Badge className="ml-2 bg-white/20 text-white">
              {pendingOutgoing.length}
            </Badge>
          </Button>
        </Link>
        <Link href="/dashboard/inventory/finished">
          <Button variant="outline" className="min-w-[140px]">
            <CubeIcon className="mr-2 h-4 w-4" />
            Lihat Stok
          </Button>
        </Link>
      </div>

      {/* Transfer List with Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Daftar Transfer</CardTitle>
              <CardDescription>Semua aktivitas transfer barang</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant={activeTab === "incoming" ? "default" : "outline"} 
                size="sm"
                onClick={() => setActiveTab("incoming")}
              >
                <ArrowDownIcon className="mr-1 h-4 w-4" />
                Masuk
              </Button>
              <Button 
                variant={activeTab === "outgoing" ? "default" : "outline"} 
                size="sm"
                onClick={() => setActiveTab("outgoing")}
              >
                <ArrowUpIcon className="mr-1 h-4 w-4" />
                Keluar
              </Button>
              <Button 
                variant={activeTab === "all" ? "default" : "outline"} 
                size="sm"
                onClick={() => setActiveTab("all")}
              >
                Semua
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTransfers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TruckIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="font-medium">Belum ada transfer</p>
              <p className="text-sm mt-1">Transfer barang akan muncul di sini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-y">
                    <TableHead className="w-40">No. Transfer</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total Qty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransfers.slice(0, 20).map((transfer) => (
                    <TableRow key={transfer.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-mono font-medium">{transfer.transferNumber}</TableCell>
                      <TableCell className="text-sm">{formatDate(transfer.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          transfer.type === "INCOMING" ? "text-green-600 border-green-200 dark:border-green-800" : "text-[var(--chart-blue)] border-[var(--chart-blue)]/30"
                        }>
                          {transfer.type === "INCOMING" ? "Masuk" : "Keluar"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{transfer.items?.length || 0} item</TableCell>
                      <TableCell className="font-medium">{getTotalItems(transfer.items)}</TableCell>
                      <TableCell>
                        <Badge className={`${STATUS_COLORS[transfer.status] || "bg-gray-100"} text-xs font-medium`}>
                          {STATUS_LABELS[transfer.status] || transfer.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="sm" onClick={() => handleViewTransfer(transfer)}>
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
        <CardHeader>
          <CardTitle>Stok Barang Jadi</CardTitle>
          <CardDescription>Monitoring stok produk jadi real-time</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <MagnifyingGlassIcon className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg text-sm bg-background"
            />
          </div>

          {filteredInventoryStock.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CubeIcon className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
              <p>Tidak ada produk ditemukan</p>
              <p className="text-xs mt-1">Data akan tampil setelah produksi & QC</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredInventoryStock.slice(0, 10).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium">{item.product?.name || "-"}</p>
                    <p className="text-xs text-muted-foreground">SKU: {item.product?.sku || "-"}</p>
                  </div>
                  <div className="text-right mr-4">
                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{item.successQty}</p>
                    <p className="text-xs text-muted-foreground">pcs</p>
                  </div>
                  <Link href={`/dashboard/inventory/finished?search=${item.product?.sku}`}>
                    <Button variant="ghost" size="sm">Detail</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transfer Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Transfer</DialogTitle>
          </DialogHeader>
          {selectedTransfer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">No. Transfer</p>
                  <p className="font-mono font-medium">{selectedTransfer.transferNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <Badge className={`${STATUS_COLORS[selectedTransfer.status] || ""}`}>
                    {STATUS_LABELS[selectedTransfer.status] || selectedTransfer.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tipe</p>
                  <p className="font-medium">{selectedTransfer.type === "INCOMING" ? "Barang Masuk" : "Barang Keluar"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tanggal</p>
                  <p className="font-medium">{formatDateLong(selectedTransfer.createdAt)}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Items ({selectedTransfer.items?.length || 0})</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedTransfer.items?.map((item, idx) => (
                    <div key={item.id || idx} className="flex justify-between items-center p-2 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{item.skuName || "-"}</p>
                        <p className="text-xs text-muted-foreground">{item.skuCode || "-"}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{item.quantity}</p>
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

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Tutup
                </Button>
                <Button onClick={() => {
                  setDialogOpen(false)
                  router.push(selectedTransfer.type === "INCOMING" ? "/dashboard/transfer/incoming" : "/dashboard/transfer/outgoing")
                }}>
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
