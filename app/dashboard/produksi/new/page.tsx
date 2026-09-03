"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/shared"
import { ScanButton } from "@/components/scanner"
import { parseQRPayload } from "@/lib/qr-payload"
import { ArrowLeftIcon, UserIcon, PlusIcon, CubeIcon } from "@heroicons/react/24/outline"
import { useFetch } from "@/hooks/useFetch"
import { useCurrency } from "@/hooks/useCurrency"
import { FormattedNumberInput } from "@/components/ui/formatted-number-input"
import { toast } from "sonner"

interface Employee {
  id: string
  name: string
  role: string
}

interface MaterialLot {
  id: string
  lotNumber: string
  quantity: number
  initialQty: number
  status: string
  isReadyForProduction?: boolean
  product?: {
    id: string
    name: string
    code: string
  }
}

interface QCReport {
  id: string
  successQty: number
  jobOrder: {
    productId: string | null
  } | null
}

interface CostCategory {
  id: string
  code: string
  name: string
  type: "DIRECT" | "INDIRECT"
  description?: string
}

export default function NewJobOrderPage() {
  const router = useRouter()
  const { formatCurrency, currencySymbol } = useCurrency()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: employees } = useFetch<Employee[]>("/api/employees")
  const { data: allLots } = useFetch<MaterialLot[]>("/api/material-lots")
  const { data: productionReadyLots } = useFetch<MaterialLot[]>("/api/material-lots/for-production")
  const { data: qcReports } = useFetch<QCReport[]>("/api/qc-reports")
  const { data: costCategories } = useFetch<CostCategory[]>("/api/cost-categories?all=true")

  const qcSuccessByProduct = useMemo(() => {
    const map: Record<string, number> = {}
    ;(qcReports || []).forEach((report) => {
      const productId = report.jobOrder?.productId
      if (productId) {
        map[productId] = (map[productId] || 0) + (report.successQty || 0)
      }
    })
    return map
  }, [qcReports])

  const [formData, setFormData] = useState({
    lotId: "",
    targetQuantity: "",
    employeeId: "",
    ratePerUnit: "",
    dueDate: "",
    notes: "",
  })
  const [estimatedCosts, setEstimatedCosts] = useState<Record<string, string>>({})

  const directCategories = (costCategories || []).filter(c => c.type === "DIRECT")
  const totalEstimated = directCategories.reduce((sum, c) => sum + (parseInt(estimatedCosts[c.code] || "0") || 0), 0)
  const targetQtyNum = parseInt(formData.targetQuantity) || 0
  const hppPerPcs = targetQtyNum > 0 ? Math.round(totalEstimated / targetQtyNum) : 0

  const selectedLot = productionReadyLots?.find(l => l.id === formData.lotId)

  const getRemainingStock = (lot: MaterialLot | undefined) => {
    if (!lot) return 0
    const masukProduksi = (lot.initialQty || 0) - lot.quantity
    const lolosQC = qcSuccessByProduct[lot.product?.id || ""] || 0
    return masukProduksi - lolosQC
  }

  const remainingStock = getRemainingStock(selectedLot)
  const canSubmit = remainingStock > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.lotId || !formData.targetQuantity) {
      toast.error("Lengkapi form terlebih dahulu")
      return
    }

    const targetQty = parseInt(formData.targetQuantity) || 0
    if (targetQty > remainingStock) {
      toast.error(`Target tidak boleh melebihi stok tersedia (${remainingStock} pcs)`)
      return
    }

    setIsSubmitting(true)

    try {
      const joResponse = await fetch("/api/job-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedLot?.product?.id || null,
          targetQty: parseInt(formData.targetQuantity) || 0,
          dueDate: formData.dueDate || null,
          notes: formData.notes || null,
        }),
      })

      if (!joResponse.ok) {
        const errorData = await joResponse.json()
        toast.error(errorData.error || "Gagal membuat job order")
        setIsSubmitting(false)
        return
      }

      const jobOrder = await joResponse.json()

      // Simpan estimasi HPP per kategori jika ada
      if (totalEstimated > 0) {
        const costsPayload = directCategories.map(c => ({
          costCategoryCode: c.code,
          costCategoryName: c.name,
          type: c.type,
          estimatedAmount: parseInt(estimatedCosts[c.code] || "0") || 0,
        })).filter(c => c.estimatedAmount > 0)
        if (costsPayload.length > 0) {
          try {
            await fetch(`/api/job-orders/${jobOrder.id}/costs`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ costs: costsPayload }),
            })
          } catch {}
        }
      }

      if (formData.employeeId) {
        const assignmentResponse = await fetch("/api/production/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobOrderId: jobOrder.id,
            employeeId: formData.employeeId,
            materialLotId: formData.lotId || null,
            targetQty: parseInt(formData.targetQuantity),
            ratePerUnit: parseFloat(formData.ratePerUnit) || 0,
            notes: `Job Order: ${jobOrder.joNumber} - ${formData.notes || ""}`,
          }),
        })

        if (assignmentResponse.ok) {
          toast.success(`Job Order & Assignment berhasil dibuat`)
        } else {
          const errorData = await assignmentResponse.json()
          toast.warning(`Job Order dibuat, tapi Assignment gagal: ${errorData.error || "Unknown error"}`)
        }
      } else {
        toast.success("Job Order berhasil dibuat")
      }

      router.push("/dashboard/produksi")
    } catch (error) {
      console.error("Failed to create job order:", error)
      toast.error("Terjadi kesalahan saat membuat job order")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Job Order Baru"
        description="Buat job order produksi dan assign ke karyawan"
        actions={
          <Button variant="outline" asChild>
            <Link href="/dashboard/produksi">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Kembali
            </Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Produk (Referensi)</CardTitle>
              <CardDescription>Data stok bahan baku per kode lot - kuning = siap produksi</CardDescription>
            </CardHeader>
            <CardContent>
              {(allLots || []).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CubeIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Belum ada data produk</p>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-y">
                        <TableHead className="w-36">Kode</TableHead>
                        <TableHead className="w-32">SKU</TableHead>
                        <TableHead>Produk</TableHead>
                        <TableHead className="w-32 text-center">Masuk Produksi</TableHead>
                        <TableHead className="w-32 text-center">Lolos QC</TableHead>
                        <TableHead className="w-32 text-center">Stok Produksi</TableHead>
                        <TableHead className="w-28 text-center">Status</TableHead>
                        <TableHead className="w-24 text-center">Produksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allLots?.map((lot) => {
                        const masukProduksi = (lot.initialQty || 0) - lot.quantity
                        const lolosQC = qcSuccessByProduct[lot.product?.id || ""] || 0
                        const sisaStok = masukProduksi - lolosQC
                        return (
                          <TableRow key={lot.id} className="border-y-0">
                            <TableCell className="font-mono font-medium py-2">{lot.lotNumber}</TableCell>
                            <TableCell className="py-2 font-mono text-sm">
                              {lot.product?.code || "-"}
                            </TableCell>
                            <TableCell className="py-2">
                              <div>
                                <p className="font-medium">{lot.product?.name || "-"}</p>
                              </div>
                            </TableCell>
                            <TableCell className="py-2 text-center">
                              <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold text-sm">
                                {masukProduksi}
                              </span>
                            </TableCell>
                            <TableCell className="py-2 text-center">
                              <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-sm">
                                {lolosQC}
                              </span>
                            </TableCell>
                            <TableCell className="py-2 text-center">
                              <span className={`px-2 py-1 rounded-full font-semibold text-sm ${
                                sisaStok <= 0 
                                  ? "bg-red-100 text-red-700" 
                                  : sisaStok < (masukProduksi * 0.3)
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-blue-100 text-blue-700"
                              }`}>
                                {sisaStok}
                              </span>
                            </TableCell>
                            <TableCell className="py-2 text-center">
                              <Badge className={`${
                                lot.status === "AVAILABLE" ? "bg-green-100 text-green-800" :
                                lot.status === "IN_USE" ? "bg-yellow-100 text-yellow-800" :
                                "bg-gray-100 text-gray-800"
                              }`}>
                                {lot.status === "AVAILABLE" ? "Tersedia" : lot.status === "IN_USE" ? "Digunakan" : "Habis"}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2 text-center">
                              {lot.isReadyForProduction ? (
                                <Badge className="bg-blue-100 text-blue-800">Siap</Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-500">Belum</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informasi Job Order</CardTitle>
              <CardDescription>Detail job order produksi</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="lot">Pilih Kode *</Label>
                  {!productionReadyLots || productionReadyLots.length === 0 ? (
                    <div className="border rounded-md p-4 bg-muted/50">
                      <div className="flex flex-col items-center text-center">
                        <CubeIcon className="h-10 w-10 mb-2 text-muted-foreground/50" />
                        <p className="text-sm font-medium text-muted-foreground">Belum ada kode siap produksi</p>
                        <p className="text-xs text-muted-foreground/70 mb-3">
                          Tambahkan stok bahan baku dan tandai sebagai siap produksi
                        </p>
                        <Button asChild size="sm" variant="outline">
                          <Link href="/dashboard/inventory/materials">
                            <PlusIcon className="mr-1 h-3 w-3" />
                            Tambah Stok Bahan Baku
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select
                        id="lot"
                        value={formData.lotId}
                        onChange={(e) => setFormData({ ...formData, lotId: e.target.value })}
                        className="flex-1 h-7 px-3 border rounded-md bg-background text-sm"
                        required
                      >
                        <option value="">Pilih Kode</option>
                        {productionReadyLots?.map((lot) => (
                          <option key={lot.id} value={lot.id}>
                            {lot.lotNumber}
                          </option>
                        ))}
                      </select>
                      <ScanButton
                        variant="outline"
                        onScan={(raw) => {
                          const parsed = parseQRPayload(raw)
                          const code = parsed.payload?.code || raw
                          const found = (productionReadyLots || []).find(l => l.lotNumber === code || (l as unknown as { qrCode?: string }).qrCode === code || l.id === code)
                          const fallback = (allLots || []).find(l => l.lotNumber === code || (l as unknown as { qrCode?: string }).qrCode === code || l.id === code)
                          const lot = found || fallback
                          if (lot) {
                            setFormData(prev => ({ ...prev, lotId: lot.id }))
                            toast.success(`Lot terpilih: ${lot.lotNumber}`)
                          } else {
                            toast.error(`Lot tidak ditemukan: ${code}`)
                          }
                        }}
                      >
                        Scan Lot
                      </ScanButton>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="skuProduk">SKU / Produk</Label>
                  <Input
                    id="skuProduk"
                    value={selectedLot ? `${selectedLot.product?.code || "-"} - ${selectedLot.product?.name || "-"}` : ""}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="targetQuantity">
                    Target Qty (Pcs) *
                    {selectedLot && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (Stok tersedia: {remainingStock} pcs)
                      </span>
                    )}
                  </Label>
                  <FormattedNumberInput
                    id="targetQuantity"
                    placeholder="Contoh: 100"
                    value={formData.targetQuantity}
                    onValueChange={(val) => {
                      if (val && parseInt(val) > remainingStock) {
                        toast.warning(`Maksimal target adalah ${remainingStock} pcs`)
                        return
                      }
                      setFormData({ ...formData, targetQuantity: val })
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Tanggal Deadline</Label>
                  <DatePicker
                    id="dueDate"
                    value={formData.dueDate}
                    onChange={(date) => setFormData({ ...formData, dueDate: date })}
                    placeholder="Pilih tanggal deadline"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Assignment Karyawan
              </CardTitle>
              <CardDescription>
                Assign job ke karyawan untuk tracking progress dan kalkulasi gaji
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="employee">Karyawan (Penjahit)</Label>
                  <div className="flex gap-2">
                    <select
                      id="employee"
                      value={formData.employeeId}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                      className="flex-1 h-7 px-3 border rounded-md bg-background text-sm"
                    >
                      <option value="">Pilih Karyawan (Opsional)</option>
                      {employees?.filter(emp => emp.role === "KARYAWAN").sort((a, b) => a.name.localeCompare(b.name, "id-ID")).map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                    <ScanButton
                      variant="outline"
                      onScan={(raw) => {
                        const parsed = parseQRPayload(raw)
                        const code = parsed.payload?.code || raw
                        const id = parsed.payload?.id || raw
                        const found = (employees || []).find(e => e.id === id || e.id === code || (e as unknown as { qrCode?: string }).qrCode === code || e.name.toLowerCase().includes(code.toLowerCase()))
                        if (found) {
                          setFormData(prev => ({ ...prev, employeeId: found.id }))
                          // auto-fill rate if exists
                          if ((found as unknown as { ratePerUnit?: number }).ratePerUnit) {
                            setFormData(prev => ({ ...prev, ratePerUnit: String((found as unknown as { ratePerUnit: number }).ratePerUnit) }))
                          }
                          toast.success(`Karyawan terpilih: ${found.name}`)
                        } else {
                          toast.error(`Karyawan tidak ditemukan: ${code}`)
                        }
                      }}
                    >
                      Scan
                    </ScanButton>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ratePerUnit">Rate/Unit ({currencySymbol}) *</Label>
                  <FormattedNumberInput
                    id="ratePerUnit"
                    placeholder="Contoh: 5.000"
                    value={formData.ratePerUnit}
                    onValueChange={(v) => setFormData({ ...formData, ratePerUnit: v })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="totalGaji">Estimasi Total Gaji</Label>
                  <div className="h-10 px-3 border rounded-md bg-muted flex items-center">
                    <span className="text-sm text-muted-foreground">
                      {formData.targetQuantity && formData.ratePerUnit 
                        ? formatCurrency(parseInt(formData.targetQuantity) * parseFloat(formData.ratePerUnit || "0"))
                        : "-"
                      }
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Gaji = Target Qty × Rate
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Stok Tersedia (Belum QC)</Label>
                  <div className="h-10 px-3 border rounded-md bg-muted flex items-center">
                    {selectedLot ? (() => {
                      const masukProduksi = (selectedLot.initialQty || 0) - selectedLot.quantity
                      const lolosQC = qcSuccessByProduct[selectedLot.product?.id || ""] || 0
                      const sisaStok = masukProduksi - lolosQC
                      return (
                        <span className={`text-sm font-medium ${
                          sisaStok <= 0 
                            ? "text-red-600" 
                            : sisaStok < masukProduksi * 0.3
                              ? "text-orange-600"
                              : "text-emerald-600"
                        }`}>
                          {sisaStok} Pcs
                          {sisaStok <= 0 && <span className="ml-2 text-xs">(Habis)</span>}
                        </span>
                      )
                    })() : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sisa = Masuk Produksi - Lolos QC
                  </p>
                </div>
              </div>

              {formData.employeeId && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <p className="text-sm text-blue-800 font-medium">Summary Assignment:</p>
                  <ul className="text-sm text-blue-700 mt-2 space-y-1">
                    <li>• Karyawan: {employees?.find(e => e.id === formData.employeeId)?.name}</li>
                    <li>• Target: {formData.targetQuantity || 0} pcs</li>
                    <li>• Rate: {formData.ratePerUnit ? formatCurrency(parseFloat(formData.ratePerUnit)) : "-"} /pcs</li>
                    <li>• Lot: {selectedLot?.lotNumber || "Belum dipilih"}</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CubeIcon className="h-5 w-5 text-amber-600" />
                Estimasi Biaya Produksi (HPP)
              </CardTitle>
              <CardDescription>
                Isi estimasi per kategori DIRECT (6 kategori). Otomatis hitung HPP & HPP/pcs. Terhubung ke <code>Master Kategori Biaya</code> & akan muncul di Detail JO & Laporan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!costCategories || directCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground">Memuat kategori biaya...</p>
              ) : (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    {directCategories.map(cat => (
                      <div key={cat.code} className="space-y-1">
                        <Label htmlFor={`cost-${cat.code}`} className="flex items-center justify-between">
                          <span>{cat.code} - {cat.name}</span>
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">DIRECT</Badge>
                        </Label>
                        <FormattedNumberInput
                          id={`cost-${cat.code}`}
                          placeholder="0"
                          value={estimatedCosts[cat.code] || ""}
                          onValueChange={(v) => setEstimatedCosts(prev => ({ ...prev, [cat.code]: v }))}
                        />
                        <p className="text-xs text-muted-foreground">{cat.description}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-3 md:grid-cols-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div>
                      <p className="text-xs text-amber-700 font-medium">Total Estimasi HPP</p>
                      <p className="text-lg font-bold text-amber-800">{formatCurrency(totalEstimated)}</p>
                      <p className="text-xs text-amber-600">6 kategori DIRECT</p>
                    </div>
                    <div>
                      <p className="text-xs text-amber-700 font-medium">HPP / Pcs</p>
                      <p className="text-lg font-bold text-amber-800">{targetQtyNum > 0 ? formatCurrency(hppPerPcs) : "-"}</p>
                      <p className="text-xs text-amber-600">{targetQtyNum} pcs target</p>
                    </div>
                    <div>
                      <p className="text-xs text-amber-700 font-medium">Estimasi + Gaji</p>
                      <p className="text-lg font-bold text-amber-800">
                        {formatCurrency(totalEstimated + (parseInt(formData.targetQuantity || "0") * parseFloat(formData.ratePerUnit || "0") || 0))}
                      </p>
                      <p className="text-xs text-amber-600">HPP + (Target × Rate)</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    * Kosongkan jika tidak ada. Nanti biaya aktual akan terisi otomatis dari transaksi pengeluaran yang di-tag ke JO ini.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Catatan</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Tambahkan catatan jika diperlukan..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-2">
            {!canSubmit && formData.lotId && (
              <span className="text-sm text-red-600 mr-2">
                Stok sudah habis, tidak bisa produksi
              </span>
            )}
            <Button variant="outline" type="button" onClick={() => router.back()}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting || !productionReadyLots?.length || !formData.lotId || !formData.targetQuantity || !canSubmit}>
              {isSubmitting ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Simpan Job Order
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
