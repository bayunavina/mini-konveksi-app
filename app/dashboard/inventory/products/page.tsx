"use client"

import { useState } from "react"
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
import { PageHeader } from "@/components/shared"
import { ExportPrint } from "@/components/shared/export-print"
import { ScanButton } from "@/components/scanner"
import { parseQRPayload } from "@/lib/qr-payload"
import { PlusIcon, MagnifyingGlassIcon, ArrowLeftIcon, CubeIcon } from "@heroicons/react/24/outline"
import { useFetch } from "@/hooks/useFetch"
import { FormattedNumberInput } from "@/components/ui/formatted-number-input"
import { toast } from "sonner"

interface MaterialLot {
  id: string
  lotNumber: string
  qrCode: string
  quantity: number
  initialQty: number
  usedQty: number
  status: string
  notes?: string
  createdAt: string
  product?: {
    id: string
    sku: string
    code: string
    name: string
    category?: string
  } | null
}

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-800",
  IN_USE: "bg-yellow-100 text-yellow-800",
  EMPTY: "bg-gray-100 text-gray-800",
}

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Tersedia",
  IN_USE: "Digunakan",
  EMPTY: "Habis",
}

export default function ProductsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    productId: "",
    quantity: "",
    notes: "",
  })

  const { data: lots, loading, refetch } = useFetch<MaterialLot[]>("/api/material-lots")
  const { data: skuMaster } = useFetch<{ id: string; code: string; name: string; category?: string }[]>("/api/master-skus?all=true")

  const filteredLots = (lots || []).filter(
    (lot) =>
      lot.lotNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lot.qrCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lot.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lot.product?.code?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getSuggestions = () => {
    if (!searchQuery || searchQuery.length < 2) return []
    
    const suggestions: { type: "kode" | "sku" | "produk"; value: string; label: string }[] = []
    const seen = new Set<string>()
    
    lots?.forEach((lot) => {
      if (searchQuery.length >= 2) {
        if (lot.lotNumber.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(lot.lotNumber)) {
          seen.add(lot.lotNumber)
          suggestions.push({ type: "kode", value: lot.lotNumber, label: lot.lotNumber })
        }
        if (lot.product?.code && lot.product.code.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(lot.product.code)) {
          seen.add(lot.product.code)
          suggestions.push({ type: "sku", value: lot.product.code, label: lot.product.code })
        }
        if (lot.product?.name && lot.product.name.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(lot.product.name)) {
          seen.add(lot.product.name)
          suggestions.push({ type: "produk", value: lot.product.name, label: lot.product.name })
        }
      }
    })
    
    return suggestions.slice(0, 10)
  }

  const suggestions = getSuggestions()

  const selectSuggestion = (value: string) => {
    setSearchQuery(value)
    setShowSuggestions(false)
  }

  const handleCreate = async () => {
    if (!formData.productId || !formData.quantity) return

    setSubmitting(true)
    try {
      const response = await fetch("/api/material-lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: formData.productId,
          quantity: parseInt(formData.quantity),
          notes: formData.notes,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Lot ${data.lotNumber} berhasil dibuat`)
        setDialogOpen(false)
        setFormData({ productId: "", quantity: "", notes: "" })
        refetch()
      } else {
        toast.error("Gagal menambahkan lot")
      }
    } catch (error) {
      console.error("Error creating lot:", error)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Daftar Produk"
        description="Kelola stok bahan baku berdasarkan produk"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push("/dashboard/inventory")}>
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Kembali
            </Button>
            <ExportPrint
              title="Daftar Produk"
              filename="daftar-produkbahan-baku"
              columns={[
                { key: "kode", label: "Kode" },
                { key: "sku", label: "SKU" },
                { key: "produk", label: "Produk" },
                { key: "masukProduksi", label: "Masuk Produksi" },
                { key: "stok", label: "Stok" },
                { key: "status", label: "Status" },
              ]}
              data={filteredLots.map(lot => ({
                kode: lot.lotNumber,
                sku: lot.product?.code || "-",
                produk: lot.product?.name || "-",
                masukProduksi: (lot.initialQty || 0) - lot.quantity,
                stok: lot.quantity,
                status: STATUS_LABELS[lot.status] || lot.status,
              }))}
            />
            <Button onClick={() => setDialogOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Tambah Stok
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Daftar Produk</CardTitle>
          <CardDescription>Data stok bahan baku per kode lot</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari kode, SKU, atau produk..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="h-10 pl-9"
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
                        s.type === "kode" ? "bg-blue-100 text-blue-700" :
                        s.type === "sku" ? "bg-purple-100 text-purple-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {s.type === "kode" ? "Kode" : s.type === "sku" ? "SKU" : "Produk"}
                      </span>
                      <span className="font-medium">{s.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" className="h-10" onClick={() => refetch()}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredLots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CubeIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Belum ada data produk</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-y">
                  <TableHead className="w-36">Kode</TableHead>
                  <TableHead className="w-32">SKU</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead className="w-24 text-center">Masuk Produksi</TableHead>
                  <TableHead className="w-24 text-center">Stok</TableHead>
                  <TableHead className="w-28 text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLots.map((lot) => (
                  <TableRow key={lot.id} className="border-y-0">
                    <TableCell className="font-mono font-medium py-2">{lot.lotNumber}</TableCell>
                    <TableCell className="py-2 font-mono text-sm">
                      {lot.product?.code || "-"}
                    </TableCell>
                    <TableCell className="py-2">
                      <div>
                        <p className="font-medium">{lot.product?.name || "-"}</p>
                        <p className="text-xs text-muted-foreground">{lot.product?.code || "-"}</p>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-center font-medium">
                      <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold text-sm">
                        {(lot.initialQty || 0) - lot.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 text-center font-medium">
                      <span className={`px-2 py-1 rounded-full font-semibold text-sm ${
                        lot.quantity === 0 
                          ? "bg-red-100 text-red-700" 
                          : lot.quantity < (lot.initialQty || 0) * 0.3 
                            ? "bg-orange-100 text-orange-700"
                            : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {lot.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 text-center">
                      <Badge className={`${STATUS_COLORS[lot.status] || "bg-gray-100 text-gray-800"}`}>
                        {STATUS_LABELS[lot.status] || lot.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Stok Baru</DialogTitle>
            <DialogDescription>Tambah stok bahan baku baru</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">SKU / Produk *</label>
              <div className="flex gap-2">
                <select
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                  className="flex-1 h-7 border rounded-md px-3 bg-background"
                >
                  <option value="">Pilih SKU</option>
                  {(skuMaster || []).map((sku) => (
                    <option key={sku.id} value={sku.id}>{sku.code} - {sku.name}</option>
                  ))}
                </select>
                <ScanButton
                  variant="outline"
                  onScan={(raw) => {
                    const parsed = parseQRPayload(raw)
                    const code = parsed.payload?.code || raw
                    const id = parsed.payload?.id || raw
                    const found = (skuMaster || []).find(s => s.id === id || s.code === code || s.code.toLowerCase() === code.toLowerCase())
                    if (found) {
                      setFormData(prev => ({ ...prev, productId: found.id }))
                      toast.success(`SKU terpilih: ${found.code}`)
                    } else {
                      // Try to find via lot code as fallback
                      const lotFound = (lots || []).find(l => l.product?.code === code || l.lotNumber === code)
                      if (lotFound?.product?.id) {
                        const skuFound = (skuMaster || []).find(s => s.id === lotFound.product!.id)
                        if (skuFound) {
                          setFormData(prev => ({ ...prev, productId: skuFound.id }))
                          toast.success(`SKU terpilih: ${skuFound.code}`)
                          return
                        }
                      }
                      toast.error(`SKU tidak ditemukan: ${code}`)
                    }
                  }}
                >
                  Scan
                </ScanButton>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity *</label>
              <FormattedNumberInput
                placeholder="Contoh: 100"
                value={formData.quantity}
                onValueChange={(v) => setFormData({ ...formData, quantity: v })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Catatan</label>
              <Input
                placeholder="Catatan opsional"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleCreate} disabled={!formData.productId || !formData.quantity || submitting}>
              {submitting ? <Spinner data-icon="inline-start" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
