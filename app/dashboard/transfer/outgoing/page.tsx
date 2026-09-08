"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { FormattedNumberInput } from "@/components/ui/formatted-number-input"
import { Label } from "@/components/ui/label"
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
import { PhotoGallery } from "@/components/shared/photo-gallery"
import { ScanButton } from "@/components/scanner"
import { parseQRPayload } from "@/lib/qr-payload"
import { ArrowLeftIcon, PlusIcon, TruckIcon, EyeIcon, TrashIcon, CameraIcon, CheckIcon } from "@heroicons/react/24/outline"
import { RefreshButton } from "@/components/ui/refresh-button"
import { useFetch } from "@/hooks/useFetch"
import { useSessionWithRole } from "@/lib/use-session-with-role"
import { formatDate, formatDateLong } from "@/lib/utils"
import { MAX_PHOTO_UPLOAD } from "@/lib/constants"
import { toast } from "sonner"
import { hasPermission, PERMISSION } from "@/lib/constants"

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
  const [photosDialogOpen, setPhotosDialogOpen] = useState(false)
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null)
  const [sourceWarehouse, setSourceWarehouse] = useState("")
  const [destinationWarehouse, setDestinationWarehouse] = useState("")
  const [notes, setNotes] = useState("")
  const [transferItems, setTransferItems] = useState<TransferFormItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState("")
  const [itemQuantity, setItemQuantity] = useState("")
  const [photos, setPhotos] = useState<{ id: string; file: File; preview: string }[]>([])
  const [creating, setCreating] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [confirmNotes, setConfirmNotes] = useState("")
  const [confirming, setConfirming] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const { data: allTransfers, loading: transfersLoading, refetch } = useFetch<Transfer[]>("/api/transfers")
  const { data: warehouses, loading: warehousesLoading } = useFetch<Warehouse[]>("/api/warehouses")
  const { data: masterSkus } = useFetch<Product[]>("/api/master-skus?all=true")
  const { user } = useSessionWithRole()
  const userRole = user?.role || "GUDANG"
  const canCreate = hasPermission(userRole, PERMISSION.BARANG_KELUAR_CREATE)
  const canView = hasPermission(userRole, PERMISSION.BARANG_KELUAR_VIEW)
  const canReceive = hasPermission(userRole, PERMISSION.BARANG_KELUAR_TERIMA)

  // P3-1: Simplifikasi Transfer - non-ADMIN otomatis ke Gudang Utama (default warehouse)
  const defaultWarehouse = useMemo(() => {
    if (!warehouses || warehouses.length === 0) return null
    return warehouses.find(w => /utama|main|default/i.test(w.name)) || warehouses[0]
  }, [warehouses])

  // Sinkronkan destinationWarehouse dengan default warehouse untuk non-ADMIN
  useEffect(() => {
    if (!canCreate && defaultWarehouse && destinationWarehouse !== defaultWarehouse.id) {
      setDestinationWarehouse(defaultWarehouse.id)
    }
  }, [canCreate, defaultWarehouse, destinationWarehouse])

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
        const data = await response.json()
        
        if (photos.length > 0) {
          await uploadPhotos(data.id)
        }

        toast.success("Transfer berhasil dibuat")
        setNewDialogOpen(false)
        resetForm()
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
    setPhotos([])
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newPhotos: { id: string; file: File; preview: string }[] = []
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

  const uploadPhotos = async (transferId: string): Promise<void> => {
    if (photos.length === 0) return

    const formData = new FormData()
    formData.append("transferId", transferId)
    formData.append("label", `Dokumentasi ${transferId}`)
    
    photos.forEach(photo => {
      formData.append("photos", photo.file)
    })

    try {
      const response = await fetch("/api/transfers/photos", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        console.error("Failed to upload photos")
      }
    } catch (error) {
      console.error("Error uploading photos:", error)
    }
  }

  const handleView = (transfer: Transfer) => {
    setSelectedTransfer(transfer)
    setViewDialogOpen(true)
  }

  const handleViewPhotos = (transfer: Transfer) => {
    setSelectedTransfer(transfer)
    setPhotosDialogOpen(true)
  }

  const handleOpenConfirm = (transfer: Transfer) => {
    setSelectedTransfer(transfer)
    setPhotos([])
    setConfirmNotes("")
    setConfirmDialogOpen(true)
  }

  const handleConfirmReceive = async () => {
    if (!selectedTransfer) return

    setConfirming(true)
    try {
      if (photos.length > 0) {
        await uploadPhotos(selectedTransfer.id)
      }

      const response = await fetch(`/api/transfers/${selectedTransfer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED",
          notes: confirmNotes || selectedTransfer.notes || "",
        }),
      })

      const responseData = await response.json().catch(() => ({}))
      if (!response.ok) {
        console.error("Error confirming transfer:", responseData)
        toast.error(responseData.error || responseData.warning || "Gagal mengonfirmasi transfer")
        return
      }

      if (responseData.warning) {
        toast.warning(responseData.warning)
      } else {
        toast.success(`Transfer ${selectedTransfer.transferNumber} berhasil dikonfirmasi!`)
      }
      setConfirmDialogOpen(false)
      setSelectedTransfer(null)
      setPhotos([])
      setConfirmNotes("")
      refetch()
    } catch (error) {
      console.error("Error confirming transfer:", error)
      toast.error("Terjadi kesalahan")
    } finally {
      setConfirming(false)
    }
  }

  const getWarehouseName = (id?: string) => {
    if (!id || !warehouses) return "-"
    const wh = warehouses.find(w => w.id === id)
    return wh?.name || "-"
  }

  return (
    <div className="flex-1 space-y-3 p-4 md:p-8 pt-4 sm:pt-6">
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
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <CardTitle>Daftar Barang Keluar</CardTitle>
              <CardDescription>
                Transfer yang dikirim dari gudang
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <RefreshButton size="default" variant="outline" onClick={() => refetch()} />
              <div className="flex flex-1 gap-2 sm:flex-none">
                <ExportPrint
                  className="flex-1 sm:flex-none"
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
                {canCreate && (
                  <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="flex-1 sm:flex-none dark:bg-[var(--brand-primary)] dark:hover:bg-[var(--brand-primary)]/80">
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
                        {canCreate ? (
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
                        {canCreate ? (
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
                                size="icon-xs"
                                className="absolute top-1 right-1"
                                onClick={() => removePhoto(photo.id)}
                              >
                                <TrashIcon className="h-2 w-2" />
                              </Button>
                            </div>
                          ))}
                          {photos.length < MAX_PHOTO_UPLOAD && (
                            <>
                              <button
                                onClick={() => cameraInputRef.current?.click()}
                                className="aspect-square rounded border-2 border-dashed flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                                aria-label="Ambil foto"
                                title="Ambil foto"
                              >
                                <CameraIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => fileInputRef.current?.click()}
                                className="aspect-square rounded border-2 border-dashed flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                                aria-label="Upload foto"
                                title="Upload foto"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                                </svg>
                              </button>
                            </>
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
                        <input
                          ref={cameraInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </div>
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
                )}
              </div>
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
            <div className="flex min-h-[9rem] sm:min-h-[12rem] flex-col items-center justify-center gap-1.5 px-2 py-6 text-center text-muted-foreground">
              <p className="font-medium text-foreground/80">Belum ada transfer keluar</p>
              <p className="text-xs text-muted-foreground/80">Transfer yang dikirim dari gudang akan tampil di sini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                      <TableCell className="flex justify-center gap-1 whitespace-nowrap">
                        {canView && (
                          <Button size="default" variant="outline" onClick={() => handleView(transfer)}>
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                        )}
                        {canView && (
                          <Button size="default" variant="outline" onClick={() => handleViewPhotos(transfer)}>
                            <CameraIcon className="h-4 w-4" />
                          </Button>
                        )}
                        {transfer.status === "PENDING" && canReceive && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 px-3.5 leading-none"
                            onClick={() => handleOpenConfirm(transfer)}
                          >
                            <CheckIcon className="mr-1 h-4 w-4" />
                            Konfirmasi
                          </Button>
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

      <Dialog open={photosDialogOpen} onOpenChange={(open) => {
        setPhotosDialogOpen(open)
        if (!open) setSelectedTransfer(null)
      }}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Foto Dokumentasi</DialogTitle>
            <DialogDescription>
              {selectedTransfer ? `Foto dokumentasi untuk transfer ${selectedTransfer.transferNumber}` : ""}
            </DialogDescription>
          </DialogHeader>
          <PhotoGallery transferId={selectedTransfer?.id || null} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhotosDialogOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDialogOpen} onOpenChange={(open) => { setConfirmDialogOpen(open); if (!open) { setSelectedTransfer(null); setPhotos([]); setConfirmNotes("") } }}>
        <DialogContent className="w-[95vw] max-w-md overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Konfirmasi Pengiriman</DialogTitle>
            <DialogDescription className="truncate">
              {selectedTransfer ? `Transfer ${selectedTransfer.transferNumber}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 overflow-y-auto flex-1 min-h-0">
            {selectedTransfer && (
              <div className="bg-muted rounded-lg p-3 space-y-2">
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-muted-foreground shrink-0">Dari:</span>
                  <span className="text-sm font-medium text-right">{getWarehouseName(selectedTransfer.fromWarehouseId)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-muted-foreground shrink-0">Ke:</span>
                  <span className="text-sm font-medium text-right">{getWarehouseName(selectedTransfer.toWarehouseId)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-muted-foreground shrink-0">Status:</span>
                  <Badge className={`${STATUS_COLORS[selectedTransfer.status] || "bg-gray-100"}`}>
                    {STATUS_LABELS[selectedTransfer.status] || selectedTransfer.status}
                  </Badge>
                </div>
              </div>
            )}

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
                        size="icon-xs"
                        className="absolute top-1 right-1"
                        onClick={() => removePhoto(photo.id)}
                      >
                        <TrashIcon className="h-2 w-2" />
                      </Button>
                    </div>
                  ))}
                  {photos.length < MAX_PHOTO_UPLOAD && (
                    <>
                      <button
                        onClick={() => cameraInputRef.current?.click()}
                        className="aspect-square rounded border-2 border-dashed flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                        aria-label="Ambil foto"
                        title="Ambil foto"
                      >
                        <CameraIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square rounded border-2 border-dashed flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                        aria-label="Upload foto"
                        title="Upload foto"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                        </svg>
                      </button>
                    </>
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
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Catatan Pengiriman</Label>
              <Textarea
                placeholder="Tambahkan catatan jika ada..."
                value={confirmNotes}
                onChange={(e) => setConfirmNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleConfirmReceive} disabled={confirming} className="bg-green-600 hover:bg-green-700">
              {confirming && <Spinner data-icon="inline-start" />}
              <CheckIcon className="mr-2 h-4 w-4" />
              Konfirmasi Kirim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
