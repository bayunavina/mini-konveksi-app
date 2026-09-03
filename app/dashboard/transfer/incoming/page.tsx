"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { FormattedNumberInput } from "@/components/ui/formatted-number-input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
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
import {
  ArrowLeftIcon,
  CameraIcon,
  CheckIcon,
  TrashIcon,
  EyeIcon,
  PlusIcon,
  TruckIcon,
} from "@heroicons/react/24/outline"
import { useFetch } from "@/hooks/useFetch"
import { useSKUMaster } from "@/hooks/useSKUMaster"
import { useSessionWithRole } from "@/lib/use-session-with-role"
import { MAX_PHOTO_UPLOAD } from "@/lib/constants"
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
  productId?: string
  quantity: number
  unit: string
  skuCode?: string
  skuName?: string
  product?: {
    id?: string
    sku?: string
    name?: string
  }
}

interface Warehouse {
  id: string
  code: string
  name: string
}

interface PhotoItem {
  id: string
  file: File
  preview: string
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu",
  IN_PROGRESS: "Diproses",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-[var(--chart-blue)]/10 text-[var(--chart-blue)]",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
}

interface TransferFormItem {
  productId: string
  productName: string
  productSku: string
  quantity: number
}

export default function IncomingPage() {
  const router = useRouter()
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [condition, setCondition] = useState<"GOOD" | "DAMAGED" | "INCOMPLETE">("GOOD")
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [scanDialogOpen, setScanDialogOpen] = useState(false)
  const [scanProcessing, setScanProcessing] = useState(false)
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null)
  const [receivingNotes, setReceivingNotes] = useState("")
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // Form untuk buat transfer baru
  const [destinationWarehouse, setDestinationWarehouse] = useState("8ab9d981-8252-4e60-a9d7-d0c327e0a8c0")
  const [transferNotes, setTransferNotes] = useState("")
  const [transferItems, setTransferItems] = useState<TransferFormItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState("")
  const [itemQuantity, setItemQuantity] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: allTransfers, loading, refetch } = useFetch<Transfer[]>("/api/transfers")
  const { data: warehouses } = useFetch<Warehouse[]>("/api/warehouses")
  const { skus: skuMaster } = useSKUMaster()
  const { user } = useSessionWithRole()
  const userRole = user?.role || "GUDANG"
  const isAdmin = userRole === "ADMIN" || userRole === "SUPERADMIN"

  // P3-1: Simplifikasi Transfer - non-ADMIN otomatis ke Gudang Utama (default warehouse)
  const defaultWarehouse = useMemo(() => {
    if (!warehouses || warehouses.length === 0) return null
    // Cari Gudang Utama / default, fallback ke warehouse pertama
    return warehouses.find(w => /utama|main|default/i.test(w.name)) || warehouses[0]
  }, [warehouses])

  // Sinkronkan destinationWarehouse dengan default warehouse untuk non-ADMIN
  useEffect(() => {
    if (!isAdmin && defaultWarehouse && destinationWarehouse !== defaultWarehouse.id) {
      setDestinationWarehouse(defaultWarehouse.id)
    }
  }, [isAdmin, defaultWarehouse, destinationWarehouse])

  const incomingTransfers = (allTransfers || []).filter(t => t.type === "INCOMING")

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newPhotos: PhotoItem[] = []
    for (let i = 0; i < files.length && photos.length + newPhotos.length < MAX_PHOTO_UPLOAD; i++) {
      const file = files[i]
      newPhotos.push({
        id: Math.random().toString(36).substring(7),
        file,
        preview: URL.createObjectURL(file),
      })
    }
    setPhotos([...photos, ...newPhotos])
  }

  const removePhoto = (id: string) => {
    setPhotos(photos.filter((p) => p.id !== id))
  }

  const handleScan = (result: string) => {
    console.log("Scan result:", result)
    
    // Skip if result looks like a filename or invalid input
    if (!result || result.length < 5) {
      toast.error("QR Code tidak valid")
      return
    }
    
    // Check if result looks like a filename (IMG_, DSC_, contains file extension, etc)
    const isLikelyFilename = 
      result.match(/^(IMG_|DSC_|Photo_|PXL_|VID_)/i) || // Mobile photo prefixes
      result.match(/\.(jpg|jpeg|png|gif|webp|mp4|mov)$/i) || // File extensions
      result.match(/^\d{4,}$/) || // Just numbers
      result.length > 100 // Very long string (likely encoded data)
    
    if (isLikelyFilename) {
      toast.error("QR Code tidak terbaca. Coba gunakan QR code yang jelas.")
      return
    }

    const found = incomingTransfers.find(
      t => t.transferNumber.toLowerCase() === result.toLowerCase() ||
           t.transferNumber.toLowerCase().includes(result.toLowerCase()) ||
           result.toLowerCase().includes(t.transferNumber.toLowerCase())
    )
    
    console.log("Found transfer:", found)
    
    if (found) {
      setSelectedTransfer(found)
      setScanDialogOpen(true)
    } else {
      toast.error(`Transfer "${result}" tidak ditemukan`)
    }
  }

  const handleScanReceive = async () => {
    if (!selectedTransfer) return
    setScanProcessing(true)
    try {
      const response = await fetch(`/api/transfers/${selectedTransfer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED",
          notes: selectedTransfer.notes || "",
        }),
      })

      if (response.ok) {
        toast.success(`Transfer ${selectedTransfer.transferNumber} berhasil diterima!`)
        setScanDialogOpen(false)
        setSelectedTransfer(null)
        refetch()
      } else {
        toast.error("Gagal menerima transfer")
      }
    } catch (error) {
      console.error("Error receiving transfer:", error)
      toast.error("Terjadi kesalahan")
    } finally {
      setScanProcessing(false)
    }
  }

  const handleScanCancel = async () => {
    if (!selectedTransfer) return
    setScanProcessing(true)
    try {
      const response = await fetch(`/api/transfers/${selectedTransfer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CANCELLED",
          notes: selectedTransfer.notes || "",
        }),
      })

      if (response.ok) {
        toast.error(`Transfer ${selectedTransfer.transferNumber} dibatalkan`)
        setScanDialogOpen(false)
        setSelectedTransfer(null)
        refetch()
      } else {
        toast.error("Gagal membatalkan transfer")
      }
    } catch (error) {
      console.error("Error cancelling transfer:", error)
      toast.error("Terjadi kesalahan")
    } finally {
      setScanProcessing(false)
    }
  }

  const handleView = (transfer: Transfer) => {
    setSelectedTransfer(transfer)
    setViewDialogOpen(true)
  }

  const handleAddItem = () => {
    console.log("handleAddItem called", { selectedProduct, itemQuantity, skuMaster })
    if (!selectedProduct || !itemQuantity) {
      toast.error("Pilih produk dan masukkan qty")
      return
    }
    
    const sku = skuMaster?.find(s => s.id === selectedProduct)
    if (!sku) {
      toast.error("SKU tidak ditemukan")
      return
    }

    if (transferItems.some(item => item.productId === selectedProduct)) {
      toast.error("Produk sudah ditambahkan")
      return
    }

    setTransferItems([
      ...transferItems,
      {
        productId: selectedProduct,
        productName: sku.name,
        productSku: sku.code,
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
    if (!destinationWarehouse) {
      toast.error("Pilih gudang tujuan")
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
          type: "INCOMING",
          toWarehouseId: destinationWarehouse,
          notes: transferNotes,
          items: transferItems.map(item => ({
            productId: item.productId,
            productSku: item.productSku,
            productName: item.productName,
            quantity: item.quantity,
            unit: "Pcs",
          })),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Transfer ${data.transferNumber} berhasil dibuat!`)
        setCreateDialogOpen(false)
        setDestinationWarehouse("")
        setTransferNotes("")
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
    setDestinationWarehouse("8ab9d981-8252-4e60-a9d7-d0c327e0a8c0")
    setTransferNotes("")
    setTransferItems([])
    setSelectedProduct("")
    setItemQuantity("")
  }

  const openDeleteDialog = (transfer: Transfer) => {
    setSelectedTransfer(transfer)
    setDeleteDialogOpen(true)
  }

  const handleDeleteTransfer = async () => {
    if (!selectedTransfer) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/transfers/${selectedTransfer.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success(`Transfer ${selectedTransfer.transferNumber} berhasil dihapus!`)
        setDeleteDialogOpen(false)
        setSelectedTransfer(null)
        refetch()
      } else {
        const error = await response.json()
        toast.error(error.message || "Gagal menghapus transfer")
      }
    } catch (error) {
      console.error("Error deleting transfer:", error)
      toast.error("Terjadi kesalahan")
    } finally {
      setDeleting(false)
    }
  }

  const handleConfirmReceive = async () => {
    if (!selectedTransfer) return

    try {
      const response = await fetch(`/api/transfers/${selectedTransfer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED",
          notes: receivingNotes || selectedTransfer.notes,
        }),
      })

      if (response.ok) {
        toast.success(`Transfer ${selectedTransfer.transferNumber} berhasil diterima!`)
        setConfirmDialogOpen(false)
        setPhotos([])
        setReceivingNotes("")
        refetch()
      } else {
        const errorData = await response.json()
        console.error("Error receiving transfer:", errorData)
        toast.error(errorData.error || "Gagal menerima transfer")
      }
    } catch (error) {
      console.error("Error receiving transfer:", error)
      toast.error("Terjadi kesalahan")
    }
  }

  const getWarehouseName = (id?: string) => {
    if (!id || !warehouses) return "-"
    const wh = warehouses.find(w => w.id === id)
    return wh?.name || "-"
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Barang Masuk"
        description="Terima barang transfer / bahan baku"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/dashboard/transfer")}>
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Kembali
            </Button>
          </div>
        }
      />

      <div className="flex gap-2">
        <ScanButton onScan={handleScan} className="dark:bg-[var(--brand-primary)] dark:hover:bg-[var(--brand-primary)]/80" />
        {isAdmin && (
          <Button onClick={() => setCreateDialogOpen(true)} className="dark:bg-[var(--brand-primary)] dark:hover:bg-[var(--brand-primary)]/80">
            <PlusIcon className="mr-2 h-4 w-4" />
            Buat Transfer Masuk
          </Button>
        )}
      </div>

      <Dialog open={createDialogOpen} onOpenChange={(open) => { setCreateDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Buat Transfer Masuk</DialogTitle>
            <DialogDescription>
              Catat penerimaan barang / bahan baku baru
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 overflow-y-auto flex-1 min-h-0">
            <div className="space-y-2">
              <Label>Gudang Tujuan *</Label>
              {isAdmin ? (
                <Select value={destinationWarehouse} onValueChange={setDestinationWarehouse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih gudang tujuan" />
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
              <Label>Tambah Produk</Label>
              <div className="flex flex-col sm:flex-row items-stretch gap-2">
                <div className="flex-1 min-w-0">
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih produk" />
                    </SelectTrigger>
                    <SelectContent>
                      {skuMaster?.filter(s => s.isActive).map((sku) => (
                        <SelectItem key={sku.id} value={sku.id}>
                          {sku.code} - {sku.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 shrink-0">
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
            </div>

            {transferItems.length > 0 && (
              <div className="border rounded-lg p-3 space-y-2">
                <Label>Daftar Produk ({transferItems.length})</Label>
                {transferItems.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between bg-muted p-2 rounded gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.productSku}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.productName}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-medium whitespace-nowrap">{item.quantity} Pcs</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-500"
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
              <Textarea
                placeholder="Tambahkan catatan jika diperlukan..."
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => { setCreateDialogOpen(false); resetForm(); }}>
              Batal
            </Button>
            <Button onClick={handleCreateTransfer} disabled={!destinationWarehouse || creating}>
              {creating && <Spinner data-icon="inline-start" />}
              <TruckIcon className="mr-2 h-4 w-4" />
              Buat Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Daftar Barang Masuk</CardTitle>
              <CardDescription>Transfer yang menunggu diterima</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Refresh
              </Button>
              <ExportPrint
                columns={[
                  { key: "transferNumber", label: "No. Transfer" },
                  { key: "createdAt", label: "Tanggal" },
                  { key: "sku", label: "SKU" },
                  { key: "product", label: "Produk" },
                  { key: "quantity", label: "Jumlah" },
                  { key: "warehouse", label: "Ke Gudang" },
                  { key: "notes", label: "Catatan" },
                  { key: "status", label: "Status" },
                ]}
                data={incomingTransfers.map(t => ({
                  ...t,
                  createdAt: formatDate(t.createdAt),
                  sku: t.items?.map(i => i.skuCode).join(", ") || "-",
                  product: t.items?.map(i => i.skuName).join(", ") || "-",
                  quantity: t.items?.reduce((sum, i) => sum + i.quantity, 0) || 0,
                  warehouse: getWarehouseName(t.toWarehouseId),
                  notes: t.notes || "-",
                  status: STATUS_LABELS[t.status] || t.status,
                }))}
                title="Daftar Barang Masuk"
                filename="barang-masuk"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : incomingTransfers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TruckIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Belum ada transfer masuk</p>
              <p className="text-sm">Klik &quot;Buat Transfer Masuk&quot; untuk mencatat penerimaan barang</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Transfer</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-center">Jumlah</TableHead>
                  <TableHead>Ke Gudang</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomingTransfers.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell className="font-mono font-medium">{transfer.transferNumber}</TableCell>
                    <TableCell>{formatDate(transfer.createdAt)}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {transfer.items?.map((item) => {
                        const sku = skuMaster?.find(s => s.id === item.productId || s.code === item.skuCode)
                        return (
                        <div key={item.id}>
                          {item.skuCode || sku?.code || "N/A"}
                        </div>
                      )}) || "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {transfer.items?.map((item) => {
                        const sku = skuMaster?.find(s => s.id === item.productId || s.code === item.skuCode)
                        return (
                        <div key={item.id}>
                          {item.skuName || sku?.name || "-"}
                        </div>
                      )}) || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {transfer.items?.reduce((sum, item) => sum + item.quantity, 0) || 0}
                    </TableCell>
                    <TableCell>{getWarehouseName(transfer.toWarehouseId)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[150px]">
                      {transfer.notes ? (
                        <span title={transfer.notes} className="block truncate cursor-help">
                          {transfer.notes}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${STATUS_COLORS[transfer.status] || "bg-gray-100"}`}>
                        {STATUS_LABELS[transfer.status] || transfer.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleView(transfer)}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                        {transfer.status === "PENDING" && (
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              setSelectedTransfer(transfer)
                              setConfirmDialogOpen(true)
                            }}
                          >
                            <CheckIcon className="mr-1 h-4 w-4" />
                            Terima
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => openDeleteDialog(transfer)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={viewDialogOpen} onOpenChange={(open) => { setViewDialogOpen(open); if (!open) setSelectedTransfer(null) }}>
        <DialogContent className="w-[95vw] max-w-md overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Detail Transfer Masuk</DialogTitle>
            <DialogDescription className="truncate">
              {selectedTransfer ? `Transfer ${selectedTransfer.transferNumber}` : ""}
            </DialogDescription>
          </DialogHeader>
          {selectedTransfer && (
            <div className="space-y-3 py-2 overflow-y-auto flex-1 min-h-0">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">No. Transfer</p>
                  <p className="font-medium font-mono text-sm break-all">{selectedTransfer.transferNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal</p>
                  <p className="font-medium text-sm">{formatDateLong(selectedTransfer.createdAt)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ke Gudang</p>
                <p className="font-medium text-sm">{getWarehouseName(selectedTransfer.toWarehouseId)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={`${STATUS_COLORS[selectedTransfer.status] || "bg-gray-100"} mt-1`}>
                  {STATUS_LABELS[selectedTransfer.status] || selectedTransfer.status}
                </Badge>
              </div>
              {selectedTransfer.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Catatan</p>
                  <p className="font-medium text-sm break-words">{selectedTransfer.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Tutup
            </Button>
            {selectedTransfer?.status === "PENDING" && (
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  setViewDialogOpen(false)
                  setConfirmDialogOpen(true)
                }}
              >
                <CheckIcon className="mr-2 h-4 w-4" />
                Terima Barang
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) setSelectedTransfer(null) }}>
        <DialogContent className="w-[95vw] max-w-sm overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Hapus Transfer</DialogTitle>
            <DialogDescription className="truncate">
              {selectedTransfer ? `Transfer ${selectedTransfer.transferNumber}` : ""}
            </DialogDescription>
          </DialogHeader>
          {selectedTransfer && (
            <div className="py-2 overflow-y-auto flex-1 min-h-0 space-y-3">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive font-medium">Peringatan: Tindakan ini tidak dapat dibatalkan!</p>
              </div>
              <div className="bg-muted rounded-lg p-3 space-y-2">
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-muted-foreground shrink-0">No. Transfer:</span>
                  <span className="font-mono font-medium text-sm break-all">{selectedTransfer.transferNumber}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-muted-foreground shrink-0">Ke Gudang:</span>
                  <span className="font-medium text-sm">{getWarehouseName(selectedTransfer.toWarehouseId)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-muted-foreground shrink-0">Status:</span>
                  <Badge className={`${STATUS_COLORS[selectedTransfer.status] || "bg-gray-100"}`}>
                    {STATUS_LABELS[selectedTransfer.status] || selectedTransfer.status}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeleteTransfer} disabled={deleting}>
              {deleting && <Spinner data-icon="inline-start" />}
              <TrashIcon className="mr-2 h-4 w-4" />
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDialogOpen} onOpenChange={(open) => { setConfirmDialogOpen(open); if (!open) { setPhotos([]); setReceivingNotes("") } }}>
        <DialogContent className="w-[95vw] max-w-md overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Konfirmasi Penerimaan</DialogTitle>
            <DialogDescription className="truncate">
              {selectedTransfer ? `Transfer ${selectedTransfer.transferNumber}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 overflow-y-auto flex-1 min-h-0">
            <div className="space-y-2">
              <Label>Foto Dokumentasi (Opsional)</Label>
              <div className="border-2 border-dashed rounded-lg p-3">
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-3">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative aspect-square rounded overflow-hidden border">
                      <img
                        src={photo.preview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-5 w-5"
                        onClick={() => removePhoto(photo.id)}
                      >
                        <TrashIcon className="h-2 w-2" />
                      </Button>
                    </div>
                  ))}
                  {photos.length < MAX_PHOTO_UPLOAD && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded border-2 border-dashed flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <CameraIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {photos.length}/{MAX_PHOTO_UPLOAD} foto
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Kondisi Barang</Label>
              <Select value={condition} onValueChange={(v) => setCondition(v as typeof condition)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GOOD">Baik</SelectItem>
                  <SelectItem value="DAMAGED">Rusak</SelectItem>
                  <SelectItem value="INCOMPLETE">Kurang/Tidak Lengkap</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Catatan Penerimaan</Label>
              <Textarea 
                placeholder="Tambahkan catatan jika ada..." 
                value={receivingNotes}
                onChange={(e) => setReceivingNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleConfirmReceive} className="bg-green-600 hover:bg-green-700">
              <CheckIcon className="mr-2 h-4 w-4" />
              Konfirmasi Terima
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scan Verification Dialog */}
      <Dialog open={scanDialogOpen} onOpenChange={(open) => { setScanDialogOpen(open); if (!open) setSelectedTransfer(null) }}>
        <DialogContent className="w-[95vw] max-w-sm overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Verifikasi Transfer</DialogTitle>
            <DialogDescription>
              {selectedTransfer?.status === "PENDING" 
                ? "Transfer ditemukan. Pilih aksi yang diinginkan." 
                : "Transfer sudah diproses."}
            </DialogDescription>
          </DialogHeader>
          {selectedTransfer && (
            <div className="space-y-3 py-2 overflow-y-auto flex-1 min-h-0">
              <div className="bg-muted rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm text-muted-foreground shrink-0">No. Transfer:</span>
                  <span className="font-mono font-bold text-sm break-all">{selectedTransfer.transferNumber}</span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm text-muted-foreground shrink-0">SKU:</span>
                  <span className="font-mono font-medium text-sm break-all">
                    {selectedTransfer.items?.map((item) => {
                      const sku = skuMaster?.find(s => s.id === item.productId || s.code === item.skuCode)
                      return item.skuCode || sku?.code || "-"
                    }) || "-"}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm text-muted-foreground shrink-0">Produk:</span>
                  <span className="font-medium text-sm break-words text-right">
                    {selectedTransfer.items?.map((item) => {
                      const sku = skuMaster?.find(s => s.id === item.productId || s.code === item.skuCode)
                      return item.skuName || sku?.name || "-"
                    }) || "-"}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm text-muted-foreground shrink-0">Qty:</span>
                  <span className="font-bold text-sm">
                    {selectedTransfer.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} Pcs
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm text-muted-foreground shrink-0">Gudang:</span>
                  <span className="font-medium text-sm">{getWarehouseName(selectedTransfer.toWarehouseId)}</span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm text-muted-foreground shrink-0">Status:</span>
                  <Badge className={`${STATUS_COLORS[selectedTransfer.status] || "bg-gray-100"}`}>
                    {STATUS_LABELS[selectedTransfer.status] || selectedTransfer.status}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="shrink-0 flex-row gap-2">
            <Button variant="outline" onClick={() => setScanDialogOpen(false)} className="flex-1">
              Tutup
            </Button>
            {selectedTransfer?.status === "PENDING" && (
              <>
                <Button 
                  variant="destructive" 
                  onClick={handleScanCancel} 
                  disabled={scanProcessing}
                  className="flex-1"
                >
                  {scanProcessing && <Spinner data-icon="inline-start" />}
                  Cancel
                </Button>
                <Button 
                  onClick={handleScanReceive} 
                  disabled={scanProcessing}
                  className="bg-green-600 hover:bg-green-700 flex-1"
                >
                  {scanProcessing && <Spinner data-icon="inline-start" />}
                  <CheckIcon className="mr-1 h-4 w-4" />
                  Terima
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
