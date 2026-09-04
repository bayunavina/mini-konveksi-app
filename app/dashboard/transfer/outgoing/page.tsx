"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { FormattedNumberInput } from "@/components/ui/formatted-number-input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/shared"
import { ExportPrint } from "@/components/shared/export-print"
import { ScanButton } from "@/components/scanner"
import { parseQRPayload } from "@/lib/qr-payload"
import { ArrowLeftIcon, PlusIcon, TruckIcon, EyeIcon, TrashIcon } from "@heroicons/react/24/outline"
import { useFetch } from "@/hooks/useFetch"
import { useSessionWithRole } from "@/lib/use-session-with-role"
import { formatDate, formatDateLong } from "@/lib/utils"
import { toast } from "sonner"

interface Transfer {
  id: string
  transferNumber: string
  type: string
  fromWarehouseId?: string
  toWarehouseId?: string
  status: string
  notes?: string
  createdAt: string
  items?: TransferItem[]
}

interface TransferItem {
  id: string
  productId: string
  quantity: number
  unit: string
}

interface Warehouse {
  id: string
  code: string
  name: string
}

interface Product {
  id: string
  code: string
  name: string
  category?: string
  unit?: string
  isActive?: boolean
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu",
  IN_PROGRESS: "Diproses",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
}

interface TransferFormItem {
  productId: string
  productName: string
  productSku: string
  productCategory?: string
  quantity: number
}

export default function OutgoingPage() {
  const router = useRouter()
  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null)
  const [sourceWarehouse, setSourceWarehouse] = useState("")
  const [destinationWarehouse, setDestinationWarehouse] = useState("")
  const [notes, setNotes] = useState("")
  const [transferItems, setTransferItems] = useState<TransferFormItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState("")
  const [itemQuantity, setItemQuantity] = useState("")
  const [creating, setCreating] = useState(false)

  const { data: allTransfers, loading: transfersLoading, refetch } = useFetch<Transfer[]>("/api/transfers")
  const { data: warehouses, loading: warehousesLoading } = useFetch<Warehouse[]>("/api/warehouses")
  const { data: masterSkus } = useFetch<Product[]>("/api/master-skus?all=true")
  const { user } = useSessionWithRole()
  const userRole = user?.role || "GUDANG"
  const isAdmin = userRole === "ADMIN" || userRole === "SUPERADMIN"

  // P3-1: Simplifikasi Transfer - non-ADMIN otomatis ke Gudang Utama (default warehouse)
  const defaultWarehouse = useMemo(() => {
    if (!warehouses || warehouses.length === 0) return null
    return warehouses.find(w => /utama|main|default/i.test(w.name)) || warehouses[0]
  }, [warehouses])

  // Sinkronkan destinationWarehouse dengan default warehouse untuk non-ADMIN
  useEffect(() => {
    if (!isAdmin && defaultWarehouse && destinationWarehouse !== defaultWarehouse.id) {
      setDestinationWarehouse(defaultWarehouse.id)
    }
  }, [isAdmin, defaultWarehouse, destinationWarehouse])

  const outgoingTransfers = (allTransfers || []).filter(t => t.type === "OUTGOING")

  const handleAddItem = () => {
    if (!selectedProduct || !itemQuantity) return
    
    const product = masterSkus?.find(p => p.id === selectedProduct)
    if (!product) return

    if (transferItems.some(item => item.productId === selectedProduct)) {
      toast.error("Produk sudah ditambahkan")
      return
    }

    setTransferItems([
      ...transferItems,
      {
        productId: selectedProduct,
        productName: product.name,
        productSku: product.code,
        productCategory: product.category,
        quantity: parseInt(itemQuantity),
      },
    ])
    setSelectedProduct("")
    setItemQuantity("")
  }

  const handleRemoveItem = (productId: string) => {
    setTransferItems(transferItems.filter(item => item.productId !== productId))
  }

  const handleCreateTransfer = async () => {
    if (!sourceWarehouse || !destinationWarehouse) {
      toast.error("Pilih gudang asal dan tujuan")
      return
    }

    if (transferItems.length === 0) {
      toast.error("Tambahkan minimal 1 produk")
      return
    }

    setCreating(true)
    try {
      const response = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "OUTGOING",
          fromWarehouseId: sourceWarehouse,
          toWarehouseId: destinationWarehouse,
          notes,
          items: transferItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unit: "Pcs",
          })),
        }),
      })

      if (response.ok) {
        toast.success("Transfer berhasil dibuat")
        setNewDialogOpen(false)
        setSourceWarehouse("")
        setDestinationWarehouse("")
        setNotes("")
        setTransferItems([])
        refetch()
      } else {
        const error = await response.json()
        toast.error(error.message || "Gagal membuat transfer")
      }
    } catch (error) {
      console.error("Error creating transfer:", error)
      toast.error("Terjadi kesalahan")
    } finally {
      setCreating(false)
    }
  }

  const resetForm = () => {
    setSourceWarehouse("")
    setDestinationWarehouse("")
    setNotes("")
    setTransferItems([])
    setSelectedProduct("")
    setItemQuantity("")
  }

  const handleView = (transfer: Transfer) => {
    setSelectedTransfer(transfer)
    setViewDialogOpen(true)
  }

  const getWarehouseName = (id?: string) => {
    if (!id || !warehouses) return "-"
    const wh = warehouses.find(w => w.id === id)
    return wh?.name || "-"
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Barang Keluar"
        description="Kelola transfer barang keluar"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/dashboard/transfer")}>
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Kembali
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Daftar Barang Keluar</CardTitle>
              <CardDescription>Transfer yang dikirim dari gudang</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Refresh
              </Button>
              <ExportPrint
                columns={[
                  { key: "transferNumber", label: "No. Transfer" },
                  { key: "fromWarehouse", label: "Dari" },
                  { key: "toWarehouse", label: "Ke" },
                  { key: "createdAt", label: "Tanggal" },
                  { key: "status", label: "Status" },
                  { key: "notes", label: "Catatan" },
                ]}
                data={outgoingTransfers.map(t => ({
                  ...t,
                  fromWarehouse: getWarehouseName(t.fromWarehouseId),
                  toWarehouse: getWarehouseName(t.toWarehouseId),
                  createdAt: formatDate(t.createdAt),
                  notes: t.notes || "-",
                  status: STATUS_LABELS[t.status] || t.status,
                }))}
                title="Daftar Barang Keluar"
                filename="barang-keluar"
              />
              <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="dark:bg-[var(--brand-primary)] dark:hover:bg-[var(--brand-primary)]/80">
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Transfer Baru
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Buat Transfer Baru</DialogTitle>
                    <DialogDescription>
                      Kirim barang ke gudang tujuan
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Gudang Asal *</Label>
                        {isAdmin ? (
                          <Select value={sourceWarehouse} onValueChange={setSourceWarehouse}>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih asal" />
                            </SelectTrigger>
                            <SelectContent>
                              {warehouses?.map((warehouse) => (
                                <SelectItem key={warehouse.id} value={warehouse.id}>
                                  {warehouse.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/30">
                            <Badge variant="outline">Default</Badge>
                            <span className="text-sm font-medium">{defaultWarehouse?.name || "Gudang Utama"}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Gudang Tujuan *</Label>
                        {isAdmin ? (
                          <Select value={destinationWarehouse} onValueChange={setDestinationWarehouse}>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih tujuan" />
                            </SelectTrigger>
                            <SelectContent>
                              {warehouses?.filter(w => w.id !== sourceWarehouse).map((warehouse) => (
                                <SelectItem key={warehouse.id} value={warehouse.id}>
                                  {warehouse.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/30">
                            <Badge variant="outline">Default</Badge>
                            <span className="text-sm font-medium">Gudang Bahan Jadi</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Tambah Produk</Label>
                      <div className="flex gap-2">
                        <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Pilih produk" />
                          </SelectTrigger>
                          <SelectContent>
                            {masterSkus?.filter(sku => sku.isActive !== false).map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.code} - {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <ScanButton
                          variant="outline"
                          size="default"
                          onScan={(raw) => {
                            const parsed = parseQRPayload(raw)
                            const code = parsed.payload?.code || raw
                            const id = parsed.payload?.id || raw
                            const found = masterSkus?.find(s => s.id === id || s.code === code || s.code.toLowerCase() === code.toLowerCase())
                            if (found) {
                              setSelectedProduct(found.id)
                              toast.success(`Produk terpilih: ${found.code}`)
                            } else {
                              toast.error(`Produk tidak ditemukan: ${code}`)
                            }
                          }}
                        />
                        <FormattedNumberInput
                          placeholder="Qty"
                          className="w-24"
                          value={itemQuantity}
                          onValueChange={(v) => setItemQuantity(v)}
                        />
                        <Button onClick={handleAddItem} disabled={!selectedProduct || !itemQuantity}>
                          +
                        </Button>
                      </div>
                    </div>

                    {transferItems.length > 0 && (
                      <div className="border rounded-lg p-3 space-y-2">
                        <Label>Daftar Produk ({transferItems.length})</Label>
                        {transferItems.map((item) => (
                          <div key={item.productId} className="flex items-center justify-between bg-muted p-2 rounded">
                            <div>
                              <p className="text-sm font-medium">{item.productSku}</p>
                              <p className="text-xs text-muted-foreground">{item.productName}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{item.quantity} Pcs</span>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-red-500"
                                onClick={() => handleRemoveItem(item.productId)}
                              >
                                <TrashIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Catatan</Label>
                      <Input
                        placeholder="Tambahkan catatan jika diperlukan..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setNewDialogOpen(false); resetForm(); }}>
                      Batal
                    </Button>
                    <Button onClick={handleCreateTransfer} disabled={!sourceWarehouse || !destinationWarehouse || transferItems.length === 0 || creating}>
                      {creating && <Spinner data-icon="inline-start" />}
                      <TruckIcon className="mr-2 h-4 w-4" />
                      Buat Transfer
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {transfersLoading || warehousesLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : outgoingTransfers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Belum ada transfer keluar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Transfer</TableHead>
                  <TableHead>Dari</TableHead>
                  <TableHead>Ke</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outgoingTransfers.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell className="font-mono">{transfer.transferNumber}</TableCell>
                    <TableCell>{getWarehouseName(transfer.fromWarehouseId)}</TableCell>
                    <TableCell>{getWarehouseName(transfer.toWarehouseId)}</TableCell>
                    <TableCell>{formatDate(transfer.createdAt)}</TableCell>
                    <TableCell>
                      <Badge className={`${STATUS_COLORS[transfer.status] || "bg-gray-100"}`}>
                        {STATUS_LABELS[transfer.status] || transfer.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {transfer.notes || "-"}
                    </TableCell>
                    <TableCell className="flex justify-center">
                      <Button size="sm" variant="outline" onClick={() => handleView(transfer)}>
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={viewDialogOpen} onOpenChange={(open) => {
        setViewDialogOpen(open)
        if (!open) setSelectedTransfer(null)
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Detail Transfer</DialogTitle>
            <DialogDescription>
              {selectedTransfer ? `Transfer ${selectedTransfer.transferNumber}` : ""}
            </DialogDescription>
          </DialogHeader>
          {selectedTransfer && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">No. Transfer</p>
                  <p className="font-medium font-mono">{selectedTransfer.transferNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal</p>
                  <p className="font-medium">{formatDateLong(selectedTransfer.createdAt)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Dari Gudang</p>
                  <p className="font-medium">{getWarehouseName(selectedTransfer.fromWarehouseId)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ke Gudang</p>
                  <p className="font-medium">{getWarehouseName(selectedTransfer.toWarehouseId)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tipe</p>
                  <Badge variant="outline">Barang Keluar</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={`${STATUS_COLORS[selectedTransfer.status] || "bg-gray-100"}`}>
                    {STATUS_LABELS[selectedTransfer.status] || selectedTransfer.status}
                  </Badge>
                </div>
              </div>
              {selectedTransfer.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Catatan</p>
                  <p className="font-medium">{selectedTransfer.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
