"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PageHeader } from "@/components/shared"
import { ExportPrint } from "@/components/shared/export-print"
import { MagnifyingGlassIcon, ArrowLeftIcon, EyeIcon } from "@heroicons/react/24/outline"
import { useFetch } from "@/hooks/useFetch"
import { formatDate } from "@/lib/utils"

interface QCReport {
  id: string
  successQty: number
  rejectQty: number
  notes: string | null
  createdAt: string
  jobOrder: {
    id: string
    joNumber: string
    productId: string | null
  } | null
  employee: {
    id: string
    name: string
  } | null
  product: {
    id: string | null
    sku: string | null
    name: string | null
  } | null
}

export default function FinishedGoodsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<QCReport | null>(null)

  const { data: qcReports, loading, refetch } = useFetch<QCReport[]>("/api/qc-reports")

  const finishedGoods = (qcReports || []).filter((r) => r.successQty > 0)

  useEffect(() => {
    if (finishedGoods) {
      console.log("[FinishedGoods] Data loaded:", finishedGoods.length, "items")
    }
  }, [finishedGoods])

  const filteredItems = finishedGoods.filter((item) => {
    const matchesSearch =
      item.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.product?.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.jobOrder?.joNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const getSuggestions = () => {
    if (!searchQuery || searchQuery.length < 2) return []
    
    const suggestions: { type: string; value: string; label: string }[] = []
    const seen = new Set<string>()
    
    filteredItems.forEach((item) => {
      if (item.product?.name && item.product.name.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(item.product.name)) {
        seen.add(item.product.name)
        suggestions.push({ type: "productName", value: item.product.name, label: item.product.name })
      }
      if (item.product?.sku && item.product.sku.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(item.product.sku)) {
        seen.add(item.product.sku)
        suggestions.push({ type: "sku", value: item.product.sku, label: item.product.sku })
      }
      if (item.jobOrder?.joNumber && item.jobOrder.joNumber.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(item.jobOrder.joNumber)) {
        seen.add(item.jobOrder.joNumber)
        suggestions.push({ type: "joNumber", value: item.jobOrder.joNumber, label: item.jobOrder.joNumber })
      }
    })
    
    return suggestions.slice(0, 10)
  }

  const suggestions = getSuggestions()

  const selectSuggestion = (value: string) => {
    setSearchQuery(value)
    setShowSuggestions(false)
  }

  const openViewDialog = (item: QCReport) => {
    setSelectedItem(item)
    setViewDialogOpen(true)
  }

  const getProductInfo = (item: QCReport) => {
    return {
      id: item.product?.id || "-",
      sku: item.product?.sku || "-",
      name: item.product?.name || "-",
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Barang Jadi (Finished Goods)"
        description="Inventory barang jadi dari hasil QC produksi"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/inventory">
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Kembali
              </Link>
            </Button>
            <ExportPrint
              title="Daftar Barang Jadi"
              filename="barang-jadi"
              columns={[
                { key: "joNumber", label: "No. JO" },
                { key: "sku", label: "SKU" },
                { key: "name", label: "Nama Produk" },
                { key: "qty", label: "Quantity" },
                { key: "date", label: "Tanggal QC" },
              ]}
              data={filteredItems.map((item) => {
                const product = getProductInfo(item)
                return {
                  joNumber: item.jobOrder?.joNumber || "-",
                  sku: product.sku,
                  name: product.name,
                  qty: item.successQty || 0,
                  date: formatDate(item.createdAt),
                }
              })}
            />
          </div>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Daftar Barang Jadi</CardTitle>
              <CardDescription>
                Barang jadi yang berasal dari QC Report yang lolos verifikasi
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Cari JO, SKU..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setShowSuggestions(true)
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="pl-9 w-[180px]"
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
                          s.type === "productName" ? "bg-green-100 text-green-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {s.type === "joNumber" ? "JO" : s.type === "productName" ? "Produk" : "SKU"}
                        </span>
                        <span className="font-medium">{s.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Belum ada barang jadi dari QC</p>
              <p className="text-sm mt-1">
                Barang jadi akan muncul setelah QC Report disubmit dengan successQty &gt; 0
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-b">
                  <TableHead>No. JO</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Nama Produk</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead>Tanggal QC</TableHead>
                  <TableHead>QC Staff</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const product = getProductInfo(item)
                  return (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell>
                        <span className="font-mono font-medium">{item.jobOrder?.joNumber || "-"}</span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {product.sku}
                      </TableCell>
                      <TableCell className="text-sm">
                        {product.name}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium">{item.successQty} Pcs</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(item.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.employee?.name || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openViewDialog(item)}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Barang Jadi</DialogTitle>
            <DialogDescription>Informasi dari QC Report</DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">No. JO</p>
                  <p className="font-mono font-medium">{selectedItem.jobOrder?.joNumber || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">QC Staff</p>
                  <p className="font-medium">{selectedItem.employee?.name || "-"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">SKU</p>
                  <p className="font-mono font-medium">
                    {selectedItem.product?.sku || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nama Produk</p>
                  <p className="font-medium">
                    {selectedItem.product?.name || "-"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Quantity Lolos</p>
                  <p className="font-bold text-green-600">{selectedItem.successQty} Pcs</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Quantity Reject</p>
                  <p className="font-medium text-red-600">{selectedItem.rejectQty} Pcs</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tanggal QC</p>
                <p className="font-medium">{formatDate(selectedItem.createdAt)}</p>
              </div>
              {selectedItem.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Catatan</p>
                  <p className="font-medium">{selectedItem.notes}</p>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
