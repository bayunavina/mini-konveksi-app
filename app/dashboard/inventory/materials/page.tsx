"use client"

import { useState, useRef, useEffect } from "react"
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
import { MagnifyingGlassIcon, ArrowLeftIcon, PlusIcon, QrCodeIcon, CubeIcon, ArrowRightIcon, CameraIcon, ArrowTrendingDownIcon, PhotoIcon, XMarkIcon, CheckIcon, TrashIcon, PrinterIcon, DocumentArrowDownIcon } from "@heroicons/react/24/outline"
import { useFetch } from "@/hooks/useFetch"
import { useSKUMaster } from "@/hooks/useSKUMaster"
import { FormattedNumberInput } from "@/components/ui/formatted-number-input"
import { toast } from "sonner"
import { Html5Qrcode } from "html5-qrcode"
import {
  checkCameraPrerequisites,
  getCameraErrorInfo,
  type CameraBlockInfo,
} from "@/lib/camera-utils"
import { CameraBlockAlert } from "@/components/scanner/camera-block-alert"

interface LotProduct {
  id: string
  sku: string
  name: string
  category?: string
}

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
  product?: LotProduct
}

interface ByProduct {
  productId: string
  productName: string
  productSku: string
  totalStock: number
  totalInitial: number
  totalUsed: number
  itemCount: number
  remarks: string[]
}

interface Summary {
  summary: {
    totalStock: number
    totalInitial: number
    totalUsed: number
    itemCount: number
  }
  byProduct: ByProduct[]
}

export default function MaterialsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<string>("")
  const [addLotDialogOpen, setAddLotDialogOpen] = useState(false)
  const [addProductDialogOpen, setAddProductDialogOpen] = useState(false)
  const [scanDialogOpen, setScanDialogOpen] = useState(false)
  const [produceDialogOpen, setProduceDialogOpen] = useState(false)
  const [selectedLot, setSelectedLot] = useState<MaterialLot | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    quantity: "",
    notes: "",
  })
  const [scanQrInput, setScanQrInput] = useState("")
  const [produceQty, setProduceQty] = useState("")
  const [scanMode, setScanMode] = useState<"manual" | "camera" | "image">("manual")
  const [cameraActive, setCameraActive] = useState(false)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [cameraBlock, setCameraBlock] = useState<CameraBlockInfo | null>(null)
  const [editingLotId, setEditingLotId] = useState<string | null>(null)
  const [editingRemark, setEditingRemark] = useState("")
  const [savingRemark, setSavingRemark] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  const { skus: skuMaster, refetch: refetchSKUs } = useSKUMaster()
  const { data: lots, loading, refetch: refetchLots } = useFetch<MaterialLot[]>("/api/material-lots")

  const refetchAll = () => {
    refetchSKUs()
    refetchLots()
  }
  const { data: summaryData } = useFetch<Summary>("/api/material-lots/summary")

  const startCamera = async () => {
    // Cek secure context SEBELUM menyentuh kamera: http://IP-lokal
    // bukan secure context → getUserMedia diblokir browser.
    const pre = checkCameraPrerequisites()
    if (!pre.ok) {
      setCameraBlock(pre)
      toast.error(pre.title ?? "Kamera diblokir", { description: "Lihat panduan HTTPS di dialog." })
      console.warn("[materials-scan] blocked:", pre.code, pre.currentUrl)
      return
    }

    try {
      setCameraBlock(null)
      setScanning(true)
      setCameraActive(true)
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const scanner = new Html5Qrcode("qr-reader")
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          setScanResult(decodedText)
          setScanQrInput(decodedText)
          stopCamera()
          handleScanFromQr(decodedText)
        },
        () => {}
      )
    } catch (err) {
      console.error("Camera error:", err)
      const info = getCameraErrorInfo(err)
      setCameraBlock(info)
      toast.error(info.title ?? "Tidak dapat mengakses kamera.", {
        description:
          info.code === "insecure-context"
            ? "Kamera hanya bisa diakses via HTTPS — jalankan npm run dev:https."
            : "Pastikan izin kamera diberikan.",
      })
      setScanning(false)
      setCameraActive(false)
    }
  }

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current = null
      } catch (err) {
        console.error("Stop camera error:", err)
      }
    }
    setCameraActive(false)
    setScanning(false)
    setCameraBlock(null)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setScanning(true)
    try {
      const scanner = new Html5Qrcode("qr-reader-image")
      const result = await scanner.scanFile(file, false)
      setScanResult(result)
      setScanQrInput(result)
      handleScanFromQr(result)
    } catch (err) {
      console.error("Image scan error:", err)
      toast.error("QR Code tidak ditemukan di gambar")
    } finally {
      setScanning(false)
    }
  }

  const handleScanFromQr = async (qrValue: string) => {
    setSubmitting(true)
    try {
      const response = await fetch(`/api/material-lots?search=${encodeURIComponent(qrValue)}`)
      const data = await response.json()

      if (Array.isArray(data) && data.length > 0) {
        setSelectedLot(data[0])
        setScanDialogOpen(false)
        setScanQrInput("")
        setScanResult(null)
        toast.success(`Ditemukan: ${data[0].lotNumber} - ${data[0].product?.name}`)
        setProduceQty("")
        setProduceDialogOpen(true)
      } else {
        toast.error("Tidak ditemukan")
      }
    } catch (error) {
      console.error("Error scanning QR:", error)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (!scanDialogOpen) {
      stopCamera()
    }
  }, [scanDialogOpen])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const filteredLots = (lots || []).filter((lot) => {
    const matchesSearch =
      lot.lotNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lot.qrCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lot.product?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lot.product?.sku.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesProduct = !selectedProduct || selectedProduct === "__all__" || lot.product?.id === selectedProduct
    return matchesSearch && matchesProduct
  })

  const getSuggestions = () => {
    if (!searchQuery || searchQuery.length < 2) return []
    
    const suggestions: { type: string; value: string; label: string }[] = []
    const seen = new Set<string>()
    
    ;(lots || []).forEach((lot) => {
      const lotNumber = lot.lotNumber
      if (lotNumber && lotNumber.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(lotNumber)) {
        seen.add(lotNumber)
        suggestions.push({ type: "lotNumber", value: lotNumber, label: lotNumber })
      }
      const qrCode = lot.qrCode
      if (qrCode && qrCode.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(qrCode)) {
        seen.add(qrCode)
        suggestions.push({ type: "qrCode", value: qrCode, label: qrCode })
      }
      const skuCode = lot.product?.sku
      if (skuCode && skuCode.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(skuCode)) {
        seen.add(skuCode)
        suggestions.push({ type: "sku", value: skuCode, label: skuCode })
      }
      const productName = lot.product?.name
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

  const handleAddLot = async () => {
    if (!selectedProduct || !formData.quantity) return

    setSubmitting(true)
    try {
      const response = await fetch("/api/material-lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct,
          quantity: parseInt(formData.quantity),
          notes: formData.notes,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Lot ${data.lotNumber} berhasil dibuat. QR: ${data.qrCode}`)
        setAddLotDialogOpen(false)
        setFormData({ quantity: "", notes: "" })
        setSelectedProduct("")
        refetchAll()
      } else {
        toast.error("Gagal menambahkan lot")
      }
    } catch (error) {
      console.error("Error adding lot:", error)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  const handleStartEditRemark = (lot: MaterialLot) => {
    setEditingLotId(lot.id)
    setEditingRemark(lot.notes || "")
  }

  const handleSaveRemark = async (lotId: string) => {
    setSavingRemark(true)
    try {
      const response = await fetch(`/api/material-lots/${lotId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: editingRemark }),
      })

      if (response.ok) {
        toast.success("Remark berhasil disimpan")
        setEditingLotId(null)
        refetchLots()
      } else {
        toast.error("Gagal menyimpan remark")
      }
    } catch (error) {
      console.error("Error saving remark:", error)
      toast.error("Terjadi kesalahan")
    } finally {
      setSavingRemark(false)
    }
  }

  const handleCancelEditRemark = () => {
    setEditingLotId(null)
    setEditingRemark("")
  }

  const exportToExcel = () => {
    if (!summaryData?.byProduct || summaryData.byProduct.length === 0) {
      toast.error("Tidak ada data untuk di-export")
      return
    }

    const headers = ["SKU", "Produk", "Awal", "Sisa", "Terpakai", "Remark"]
    const rows = summaryData.byProduct.map((item) => [
      item.productSku,
      item.productName,
      item.totalInitial,
      item.totalStock,
      item.totalUsed,
      item.remarks?.join("; ") || "",
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n")

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `rekap-bahan-baku-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success("Export berhasil!")
  }

  const handlePrintRekap = () => {
    if (!summaryData?.byProduct || summaryData.byProduct.length === 0) {
      toast.error("Tidak ada data untuk di-print")
      return
    }

    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      toast.error("Tidak dapat membuka window untuk print")
      return
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Rekap Bahan Baku</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { font-size: 18px; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .date { color: #666; font-size: 12px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>Rekap per Produk/SKU - Bahan Baku</h1>
          <div class="date">Dicetak: ${new Date().toLocaleString("id-ID")}</div>
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Produk</th>
                <th style="text-align:center">Awal</th>
                <th style="text-align:center">Sisa</th>
                <th style="text-align:center">Terpakai</th>
                <th>Remark</th>
              </tr>
            </thead>
            <tbody>
              ${summaryData.byProduct.map((item) => `
                <tr>
                  <td>${item.productSku}</td>
                  <td>${item.productName}</td>
                  <td style="text-align:center">${item.totalInitial}</td>
                  <td style="text-align:center">${item.totalStock}</td>
                  <td style="text-align:center">${item.totalUsed || "-"}</td>
                  <td>${item.remarks?.join("; ") || "-"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
  }

  const [selectedNewProduct, setSelectedNewProduct] = useState<string>("")

  const handleSelectProduct = () => {
    if (!selectedNewProduct) {
      toast.error("Pilih produk terlebih dahulu")
      return
    }

    setSelectedProduct(selectedNewProduct)
    setAddProductDialogOpen(false)
    setAddLotDialogOpen(true)
    setSelectedNewProduct("")
  }

  const handleScanQr = async () => {
    if (!scanQrInput.trim()) {
      toast.error("Masukkan kode atau QR terlebih dahulu")
      return
    }

    setSubmitting(true)
    try {
      console.log("Searching for:", scanQrInput.trim())
      const response = await fetch(`/api/material-lots?search=${encodeURIComponent(scanQrInput.trim())}`)
      const data = await response.json()
      
      console.log("API Response:", data)
      
      if (!response.ok) {
        toast.error(data.error || "Gagal mencari data")
        return
      }

      if (Array.isArray(data) && data.length > 0) {
        setSelectedLot(data[0])
        setScanDialogOpen(false)
        setScanQrInput("")
        setScanResult(null)
        toast.success(`Ditemukan: ${data[0].lotNumber} - ${data[0].product?.name}`)
        setProduceQty("")
        setProduceDialogOpen(true)
      } else {
        toast.error("Tidak ditemukan")
      }
    } catch (error) {
      console.error("Error scanning QR:", error)
      toast.error("Terjadi kesalahan: " + (error as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleProduce = async () => {
    if (!selectedLot || !produceQty) return

    const qty = parseInt(produceQty)
    if (qty > selectedLot.quantity) {
      toast.error(`Stok tidak mencukupi. Available: ${selectedLot.quantity}`)
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/material-lots/produce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lotId: selectedLot.id,
          producedQty: qty,
          notes: "",
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
        setProduceDialogOpen(false)
        setSelectedLot(null)
        setProduceQty("")
        refetchAll()
      } else {
        const error = await response.json()
        toast.error(error.error || "Gagal memproduksi")
      }
    } catch (error) {
      console.error("Error producing:", error)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  const openProduceDialog = (lot: MaterialLot) => {
    setSelectedLot(lot)
    setProduceQty("")
    setProduceDialogOpen(true)
  }

  const openDeleteDialog = (lot: MaterialLot) => {
    setSelectedLot(lot)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedLot) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/material-lots/${selectedLot.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Bahan baku berhasil dihapus")
        setDeleteDialogOpen(false)
        setSelectedLot(null)
        refetchAll()
      } else {
        toast.error("Gagal menghapus bahan baku")
      }
    } catch (error) {
      console.error("Error deleting:", error)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return <Badge className="bg-green-100 text-green-800">Tersedia</Badge>
      case "IN_USE":
        return <Badge className="bg-yellow-100 text-yellow-800">Digunakan</Badge>
      case "EMPTY":
        return <Badge className="bg-gray-100 text-gray-800">Habis</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Bahan Baku"
        description="Kelola stok bahan baku dengan QR Code"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push("/dashboard/inventory")}>
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Kembali
            </Button>
            <Button variant="outline" onClick={() => setScanDialogOpen(true)}>
              <CameraIcon className="mr-2 h-4 w-4" />
              Scan QR
            </Button>
            <Button onClick={() => setAddProductDialogOpen(true)} className="dark:bg-[var(--brand-primary)] dark:hover:bg-[var(--brand-primary)]/80">
              <PlusIcon className="mr-2 h-4 w-4" />
              Tambah Bahan Baku
            </Button>
            <Button onClick={() => setAddLotDialogOpen(true)} className="dark:bg-[var(--brand-primary)] dark:hover:bg-[var(--brand-primary)]/80">
              <PlusIcon className="mr-2 h-4 w-4" />
              Tambah Stok
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sisa Stok</CardTitle>
            <CubeIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData?.summary.totalStock || 0}</div>
            <p className="text-xs text-muted-foreground">Pcs tersisa</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Terpakai</CardTitle>
            <ArrowTrendingDownIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{summaryData?.summary.totalUsed || 0}</div>
            <p className="text-xs text-muted-foreground">Pcs untuk produksi</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Item</CardTitle>
            <QrCodeIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData?.summary.itemCount || 0}</div>
            <p className="text-xs text-muted-foreground">Item bahan baku</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Bahan Baku</CardTitle>
          <CardDescription>Scan QR Code untuk produksi</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari kode, QR code, atau produk..."
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
                        s.type === "lotNumber" ? "bg-blue-100 text-blue-700" :
                        s.type === "qrCode" ? "bg-purple-100 text-purple-700" :
                        s.type === "sku" ? "bg-green-100 text-green-700" :
                        "bg-orange-100 text-orange-700"
                      }`}>
                        {s.type === "lotNumber" ? "Lot" : s.type === "qrCode" ? "QR" : s.type === "sku" ? "SKU" : "Produk"}
                      </span>
                      <span className="font-medium">{s.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Semua Produk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Semua Produk</SelectItem>
                {(skuMaster?.filter(s => s.isActive) || []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="lg" onClick={() => refetchAll()}>
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
              <QrCodeIcon className="mx-auto h-12 w-12 mb-4 text-muted-foreground/50" />
              <p>Belum ada data bahan baku</p>
              <p className="text-sm mt-1">Tambah bahan baku baru untuk memulai</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-y">
                  <TableHead className="w-36">Kode</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead className="w-24 text-center">Awal</TableHead>
                  <TableHead className="w-24 text-center">Sisa</TableHead>
                  <TableHead className="w-24 text-center">Terpakai</TableHead>
                  <TableHead className="w-24 text-center">Status</TableHead>
                  <TableHead>Remark</TableHead>
                  <TableHead className="w-24 text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLots.map((lot) => {
                  const usedQty = (lot.initialQty || 0) - (lot.quantity || 0)
                  return (
                  <TableRow key={lot.id} className="border-y-0">
                    <TableCell className="font-mono font-medium py-2">{lot.lotNumber}</TableCell>
                    <TableCell className="py-2">
                      <div>
                        <p className="font-medium">{lot.product?.name || "-"}</p>
                        <p className="text-xs text-muted-foreground">{lot.product?.sku}</p>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-center font-medium">{lot.initialQty || 0}</TableCell>
                    <TableCell className="py-2 text-center">
                      <span className={lot.quantity === 0 ? "text-red-500 font-medium" : lot.quantity < (lot.initialQty || 0) * 0.3 ? "text-orange-500" : ""}>
                        {lot.quantity || 0}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 text-center text-orange-600">
                      {usedQty > 0 ? usedQty : "-"}
                    </TableCell>
                    <TableCell className="py-2 text-center">{getStatusBadge(lot.status)}</TableCell>
                    <TableCell className="py-2">
                      {editingLotId === lot.id ? (
                        <div className="flex gap-1 items-center">
                          <Input
                            value={editingRemark}
                            onChange={(e) => setEditingRemark(e.target.value)}
                            placeholder="Ketik remark..."
                            className="text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRemark(lot.id)
                              if (e.key === "Escape") handleCancelEditRemark()
                            }}
                          />
<Button
                             size="icon"
                             variant="ghost"
                             onClick={() => handleSaveRemark(lot.id)}
                             disabled={savingRemark}
                           >
                            <CheckIcon className="h-4 w-4 text-green-600" />
                          </Button>
<Button
                             size="icon"
                             variant="ghost"
                             onClick={handleCancelEditRemark}
                           >
                            <XMarkIcon className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          className="cursor-pointer hover:bg-muted rounded px-2 py-1 min-h-[32px] flex items-center"
                          onClick={() => handleStartEditRemark(lot)}
                        >
                          <span className={`text-sm ${lot.notes ? "" : "text-muted-foreground italic"}`}>
                            {lot.notes || "Klik untuk edit..."}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-2 text-center">
                      <div className="flex gap-1 justify-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openProduceDialog(lot)}
                          disabled={lot.quantity === 0}
                          title="Produksi"
                        >
                          <ArrowRightIcon className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDeleteDialog(lot)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          title="Hapus"
                        >
                          <TrashIcon className="h-3 w-3" />
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Rekap per Produk/SKU</CardTitle>
              <CardDescription>Total stok bahan baku berdasarkan Produk/SKU</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePrintRekap()}
              >
                <PrinterIcon className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToExcel()}
              >
                <DocumentArrowDownIcon className="mr-2 h-4 w-4" />
                Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table id="rekap-table">
            <TableHeader>
              <TableRow className="border-y">
                <TableHead className="w-32">SKU</TableHead>
                <TableHead>Produk</TableHead>
                <TableHead className="w-20 text-center">Awal</TableHead>
                <TableHead className="w-20 text-center">Sisa</TableHead>
                <TableHead className="w-20 text-center">Terpakai</TableHead>
                <TableHead>Remark</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaryData?.byProduct && summaryData.byProduct.length > 0 ? (
                summaryData.byProduct.map((item) => (
                  <TableRow key={item.productId} className="border-y-0">
                    <TableCell className="font-mono font-medium py-2">{item.productSku}</TableCell>
                    <TableCell className="py-2">{item.productName}</TableCell>
                    <TableCell className="py-2 text-center font-medium">{item.totalInitial}</TableCell>
                    <TableCell className="py-2 text-center">
                      <span className={item.totalStock === 0 ? "text-red-500 font-medium" : item.totalStock < item.totalInitial * 0.3 ? "text-orange-500" : ""}>
                        {item.totalStock}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 text-center text-orange-600">
                      {item.totalUsed > 0 ? item.totalUsed : "-"}
                    </TableCell>
                    <TableCell className="py-2 text-sm text-muted-foreground">
                      {item.remarks && item.remarks.length > 0 ? item.remarks.join("; ") : "-"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Belum ada data stok
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={addLotDialogOpen} onOpenChange={setAddLotDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Bahan Baku</DialogTitle>
            <DialogDescription>Tambah bahan baku baru dengan QR Code</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Produk *</label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih produk" />
                </SelectTrigger>
                <SelectContent>
                  {(skuMaster?.filter(s => s.isActive) || []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity (Stok) *</label>
              <FormattedNumberInput
                placeholder="Contoh: 100"
                value={formData.quantity}
                onValueChange={(v) => setFormData({ ...formData, quantity: v })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Input
                placeholder="Catatan opsional"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddLotDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleAddLot} disabled={!selectedProduct || !formData.quantity || submitting}>
              {submitting ? <Spinner data-icon="inline-start" /> : <QrCodeIcon className="mr-2 h-4 w-4" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={scanDialogOpen} onOpenChange={setScanDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
            <DialogDescription>Pilih metode scan untuk mencari bahan baku</DialogDescription>
          </DialogHeader>
          
          <div className="flex gap-2 mb-4">
            <Button
              variant={scanMode === "manual" ? "default" : "outline"}
              size="sm"
              onClick={() => { setScanMode("manual"); stopCamera() }}
            >
              Manual
            </Button>
            <Button
              variant={scanMode === "camera" ? "default" : "outline"}
              size="sm"
              onClick={() => { setScanMode("camera"); }}
            >
              <CameraIcon className="mr-1 h-4 w-4" />
              Kamera
            </Button>
            <Button
              variant={scanMode === "image" ? "default" : "outline"}
              size="sm"
              onClick={() => { setScanMode("image"); stopCamera(); }}
            >
              <PhotoIcon className="mr-1 h-4 w-4" />
              Upload
            </Button>
          </div>

          <div className="py-4">
            {scanMode === "manual" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Cari (SKU, Kode, atau QR)</label>
                <Input
                  placeholder="Contoh: KPDL-H-M atau BB-ABC123"
                  value={scanQrInput}
                  onChange={(e) => setScanQrInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleScanQr()}
                />
              </div>
            )}

            {scanMode === "camera" && (
              <div className="space-y-4">
                {cameraBlock && (
                  <CameraBlockAlert block={cameraBlock} onRetry={startCamera} />
                )}
                {!cameraActive ? (
                  <Button onClick={startCamera} className="w-full">
                    <CameraIcon className="mr-2 h-4 w-4" />
                    Mulai Kamera
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div id="qr-reader" className="rounded-lg overflow-hidden border"></div>
                    <Button onClick={stopCamera} variant="outline" className="w-full">
                      <XMarkIcon className="mr-2 h-4 w-4" />
                      Stop Kamera
                    </Button>
                  </div>
                )}
              </div>
            )}

            {scanMode === "image" && (
              <div className="space-y-4">
                <div id="qr-reader-image" className="hidden"></div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="qr-image-input"
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()} 
                  variant="outline" 
                  className="w-full"
                >
                  <PhotoIcon className="mr-2 h-4 w-4" />
                  Pilih Gambar QR Code
                </Button>
                {scanning && (
                  <div className="flex items-center justify-center py-4">
                    <Spinner className="size-6" />
                    <span className="ml-2">Memindai QR Code...</span>
                  </div>
                )}
              </div>
            )}

            {scanResult && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
                <CheckIcon className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm text-green-800">QR Terdeteksi: {scanResult}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setScanDialogOpen(false); stopCamera() }}>
              Batal
            </Button>
            {scanMode === "manual" && (
              <Button onClick={handleScanQr} disabled={!scanQrInput.trim() || submitting}>
                {submitting ? <Spinner data-icon="inline-start" /> : <MagnifyingGlassIcon className="mr-2 h-4 w-4" />}
                Cari
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={produceDialogOpen} onOpenChange={setProduceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Produksi</DialogTitle>
            <DialogDescription>
              Konversi bahan baku menjadi barang jadi. Stok akan otomatis terdeduct.
            </DialogDescription>
          </DialogHeader>
          {selectedLot && (
            <div className="space-y-4 py-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Produk:</span>
                  <span className="font-medium">{selectedLot.product?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Kode:</span>
                  <span className="font-mono font-medium">{selectedLot.lotNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Stok Tersedia:</span>
                  <span className="font-bold text-green-600">{selectedLot.quantity} Pcs</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity Produksi *</label>
                <FormattedNumberInput
                  placeholder={`Max: ${selectedLot.quantity}`}
                  value={produceQty}
                  onValueChange={setProduceQty}
                />
                <p className="text-xs text-muted-foreground">
                  Stok akan berkurang {produceQty || 0} Pcs
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProduceDialogOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleProduce}
              disabled={!produceQty || parseInt(produceQty) > (selectedLot?.quantity || 0) || submitting}
            >
              {submitting ? <Spinner data-icon="inline-start" /> : <CubeIcon className="mr-2 h-4 w-4" />}
              Produksi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addProductDialogOpen} onOpenChange={setAddProductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Bahan Baku</DialogTitle>
            <DialogDescription>Pilih produk dari daftar SKU yang sudah ada</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">SKU *</label>
              <Select value={selectedNewProduct} onValueChange={setSelectedNewProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih SKU" />
                </SelectTrigger>
                <SelectContent>
                  {(skuMaster?.filter(s => s.isActive) || []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedNewProduct && (
              <div className="bg-muted p-4 rounded-lg space-y-2">
                {(() => {
                  const selected = skuMaster?.find(s => s.id === selectedNewProduct)
                  return selected ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">SKU:</span>
                        <span className="font-mono font-medium">{selected.code}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Nama:</span>
                        <span className="font-medium">{selected.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Kategori:</span>
                        <span className="font-medium">{selected.category || "-"}</span>
                      </div>
                    </>
                  ) : null
                })()}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddProductDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSelectProduct} disabled={!selectedNewProduct}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Tambah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Bahan Baku</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus bahan baku ini? Tindakan tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          {selectedLot && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Kode:</span>
                <span className="font-mono font-medium">{selectedLot.lotNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Produk:</span>
                <span className="font-medium">{selectedLot.product?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Stok:</span>
                <span className="font-medium">{selectedLot.quantity} Pcs</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? <Spinner data-icon="inline-start" /> : <TrashIcon className="mr-2 h-4 w-4" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
