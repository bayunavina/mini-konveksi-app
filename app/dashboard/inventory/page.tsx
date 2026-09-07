"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormattedNumberInput } from "@/components/ui/formatted-number-input"
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
import { PageHeader } from "@/components/shared"
import { useFetch } from "@/hooks/useFetch"
import {
  CubeIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PlusIcon,
  MinusIcon,
  AdjustmentsVerticalIcon,
} from "@heroicons/react/24/outline"
import { toast } from "sonner"

interface MaterialLot {
  id: string
  lotNumber: string
  quantity: number
  initialQty: number
  product?: {
    id: string
    name: string
    code: string
  } | null
}

interface QCReport {
  id: string
  successQty: number
  rejectQty: number
}

interface TransferItem {
  id: string
  quantity: number
}

interface Transfer {
  id: string
  transferNumber: string
  status: string
  type: string
  items?: TransferItem[]
  createdAt: string
}

interface Movement {
  id: string
  type: string
  quantity: number
  reference?: string
  notes?: string
  createdAt: string
  product?: {
    name: string
    sku: string
  }
  warehouse?: {
    name: string
  }
}

interface SKUProduct {
  id: string
  code: string
  name: string
  isActive?: boolean
}

interface Warehouse {
  id: string
  code?: string
  name: string
}

interface StockEntry {
  id: string
  quantity: number
  reservedQty?: number
}

export default function InventoryPage() {
  const { data: lots, loading: lotsLoading } = useFetch<MaterialLot[]>("/api/material-lots")
  const { data: qcReports, loading: qcLoading } = useFetch<QCReport[]>("/api/qc-reports")
  const { data: transfers, loading: transfersLoading } = useFetch<Transfer[]>("/api/transfers")
  const { data: movementsData, refetch: refetchMovements } = useFetch<{movements: Movement[], summary: { totalIn: number; totalOut: number }}>("/api/inventory/movements?limit=10")
  const { data: skus } = useFetch<SKUProduct[]>("/api/master-skus?all=true")
  const { data: warehouses } = useFetch<Warehouse[]>("/api/warehouses")

  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState("")
  const [selectedWarehouse, setSelectedWarehouse] = useState("")
  const [adjustType, setAdjustType] = useState<"IN" | "OUT">("IN")
  const [adjustQty, setAdjustQty] = useState("")
  const [adjustNotes, setAdjustNotes] = useState("")
  const [currentStock, setCurrentStock] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!selectedProduct || !selectedWarehouse) {
      setCurrentStock(null)
      return
    }
    let cancelled = false
    fetch(`/api/inventory/stock?productId=${selectedProduct}&warehouseId=${selectedWarehouse}`)
      .then(res => res.json())
      .then((data: StockEntry[]) => {
        if (!cancelled) setCurrentStock(Array.isArray(data) && data.length > 0 ? data[0].quantity : 0)
      })
      .catch(() => { if (!cancelled) setCurrentStock(null) })
    return () => { cancelled = true }
  }, [selectedProduct, selectedWarehouse])

  const resetAdjustForm = () => {
    setSelectedProduct("")
    setSelectedWarehouse("")
    setAdjustType("IN")
    setAdjustQty("")
    setAdjustNotes("")
    setCurrentStock(null)
  }

  const handleAdjustStock = async () => {
    if (!selectedProduct || !selectedWarehouse) {
      toast.error("Pilih produk dan gudang")
      return
    }
    const amount = parseInt(adjustQty)
    if (!amount || amount <= 0) {
      toast.error("Masukkan jumlah yang valid")
      return
    }
    const signedQty = adjustType === "OUT" ? -amount : amount

    setSubmitting(true)
    try {
      const res = await fetch("/api/inventory/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct,
          warehouseId: selectedWarehouse,
          type: "ADJUSTMENT",
          quantity: signedQty,
          notes: adjustNotes || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Stok disesuaikan: ${data.previousQuantity} → ${data.newQuantity} pcs`)
        setAdjustDialogOpen(false)
        resetAdjustForm()
        refetchMovements()
      } else {
        toast.error(data.error || "Gagal menyesuaikan stok")
      }
    } catch (error) {
      console.error("Error adjusting stock:", error)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  const loading = lotsLoading || qcLoading || transfersLoading

  const uniqueProducts = lots ? new Set(lots.map(lot => lot.product?.id).filter(Boolean)).size : 0
  const finishedGoods = qcReports ? qcReports.reduce((sum, r) => sum + (r.successQty || 0), 0) : 0
  const totalStock = lots ? lots.reduce((sum, lot) => sum + (lot.quantity || 0), 0) : 0
  
  const totalIncoming = transfers 
    ? transfers.filter(t => t.type === "INCOMING").reduce((sum, t) => sum + (t.items?.reduce((s, i) => s + i.quantity, 0) || 0), 0)
    : 0
  const totalOutgoing = transfers 
    ? transfers.filter(t => t.type === "OUTGOING").reduce((sum, t) => sum + (t.items?.reduce((s, i) => s + i.quantity, 0) || 0), 0)
    : 0
  
  const recentMovements = movementsData?.movements || []

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Stok"
        description="Kelola stok bahan baku dan barang jadi"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bahan Baku</CardTitle>
            <CubeIcon className="h-4 w-4 text-[var(--chart-blue)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : uniqueProducts}
            </div>
            <p className="text-xs text-muted-foreground">Jenis bahan terdaftar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Barang Jadi</CardTitle>
            <CubeIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : finishedGoods.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Produk tersedia</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stok</CardTitle>
            <CubeIcon className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : totalStock.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Unit tersimpan</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Menu Stok</CardTitle>
              <CardDescription>Pilih kategori untuk melihat detail</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Link href="/dashboard/inventory/materials">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Bahan Baku
                  <ArrowRightIcon className="h-4 w-4" />
                </CardTitle>
                <CardDescription>Stok kain, benang, kancing</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/dashboard/inventory/rejects">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Reject
                  <ArrowRightIcon className="h-4 w-4" />
                </CardTitle>
                <CardDescription>Barang gagal QC</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/dashboard/inventory/finished">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Barang Jadi
                  <ArrowRightIcon className="h-4 w-4" />
                </CardTitle>
                <CardDescription>Produk siap jual</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpIcon className="h-4 w-4 text-green-600" />
              Total Masuk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{totalIncoming.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Pcs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownIcon className="h-4 w-4 text-red-600" />
              Total Keluar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{totalOutgoing.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Pcs</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Movement Terakhir</CardTitle>
          <CardDescription>Riwayat pergerakan stok terbaru</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : recentMovements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Belum ada pergerakan stok</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentMovements.map((movement) => (
                <div key={movement.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Badge variant={movement.type === "IN" || movement.type === "QC_COMPLETE" || movement.type === "ADJUSTMENT_IN" ? "default" : "secondary"}>
                      {movement.type === "IN" || movement.type === "QC_COMPLETE" || movement.type === "ADJUSTMENT_IN" ? (
                        <ArrowUpIcon className="h-3 w-3 mr-1" />
                      ) : (
                        <ArrowDownIcon className="h-3 w-3 mr-1" />
                      )}
                    </Badge>
                    <div>
                      <p className="font-medium">{movement.product?.name || movement.reference || "Movement"}</p>
                      <p className="text-xs text-muted-foreground">
                        {movement.warehouse?.name || "-"} - {movement.notes || "-"}
                      </p>
                    </div>
                  </div>
                  <p className={`font-medium ${movement.quantity >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {movement.quantity >= 0 ? "+" : ""}{movement.quantity} Pcs
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AdjustmentsVerticalIcon className="h-4 w-4 text-amber-600" />
            Penyesuaian Stok
          </CardTitle>
          <CardDescription>
            Tambah atau kurangi stok produk di gudang secara manual (hasil opname, barang rusak, atau selisih)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Gunakan fitur ini untuk mengoreksi stok yang tidak sesuai dengan kondisi fisik di gudang.
          </p>
          <Dialog open={adjustDialogOpen} onOpenChange={(open) => { setAdjustDialogOpen(open); if (!open) resetAdjustForm() }}>
            <DialogTrigger asChild>
              <Button>
                <AdjustmentsVerticalIcon className="mr-2 h-4 w-4" />
                Buat Penyesuaian
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Penyesuaian Stok</DialogTitle>
                <DialogDescription>
                  Pilih produk dan gudang, lalu tentukan jumlah penambahan atau pengurangan stok.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Produk *</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih produk" />
                    </SelectTrigger>
                    <SelectContent>
                      {skus?.filter(sku => sku.isActive !== false).map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.code} - {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Gudang *</Label>
                  <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih gudang" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses?.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipe Penyesuaian</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={adjustType === "IN" ? "default" : "outline"}
                      onClick={() => setAdjustType("IN")}
                    >
                      <PlusIcon className="mr-1.5 h-4 w-4" />
                      Tambah
                    </Button>
                    <Button
                      type="button"
                      variant={adjustType === "OUT" ? "default" : "outline"}
                      className={adjustType === "OUT" ? "bg-red-600 hover:bg-red-700" : ""}
                      onClick={() => setAdjustType("OUT")}
                    >
                      <MinusIcon className="mr-1.5 h-4 w-4" />
                      Kurangi
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Jumlah *</Label>
                  <FormattedNumberInput
                    placeholder="Jumlah pcs"
                    value={adjustQty}
                    onValueChange={setAdjustQty}
                    className="w-full"
                  />
                </div>

                {currentStock !== null && (
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                    {adjustType === "OUT"
                      ? "Sisa stok setelah penyesuaian: "
                      : "Stok setelah penyesuaian: "}
                    <span className="font-semibold">
                      {Math.max((currentStock || 0) + (adjustType === "OUT" ? -(parseInt(adjustQty) || 0) : (parseInt(adjustQty) || 0)), 0).toLocaleString()} pcs
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Catatan</Label>
                  <Input
                    placeholder="Contoh: hasil stok opname, barang rusak, atau selisih"
                    value={adjustNotes}
                    onChange={(e) => setAdjustNotes(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>Batal</Button>
                <Button
                  onClick={handleAdjustStock}
                  disabled={!selectedProduct || !selectedWarehouse || !adjustQty || submitting}
                >
                  {submitting && <Spinner data-icon="inline-start" />}
                  Simpan Penyesuaian
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
}
