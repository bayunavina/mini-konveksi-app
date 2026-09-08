"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageHeader } from "@/components/shared"
import { QRCodeGenerator } from "@/components/qr-generator"
import { BarcodeGenerator, BatchBarcodeGenerator } from "@/components/qr-generator"
import { Button } from "@/components/ui/button"
import { useFetch } from "@/hooks/useFetch"
import { generateMaterialLotQR, generateEmployeeQR, generateJobOrderQR } from "@/lib/qr-payload"
import { QrCodeIcon, RectangleStackIcon, ListBulletIcon, InformationCircleIcon } from "@heroicons/react/24/outline"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"

export default function QRGeneratorPage() {
  const [qrValue, setQRValue] = useState("")
  const [barcodeValue, setBarcodeValue] = useState("")
  const [qrEntityType, setQrEntityType] = useState<"MATERIAL_LOT" | "EMPLOYEE" | "JOB_ORDER">("MATERIAL_LOT")
  const [selectedLotId, setSelectedLotId] = useState("")
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("")
  const [selectedJoId, setSelectedJoId] = useState("")

  const { data: lots } = useFetch<{ id: string; lotNumber: string; qrCode: string; quantity: number; product?: { code: string; name: string; unit?: string }; supplier?: string }[]>("/api/material-lots")
  const { data: employees } = useFetch<{ id: string; name: string; qrCode?: string; role?: string }[]>("/api/employees")
  const { data: joData } = useFetch<{ data: { id: string; joNumber: string; qrCode?: string; product?: { name: string } }[] }>("/api/job-orders")
  const joList = (joData as unknown as { data?: { id: string; joNumber: string; qrCode?: string; product?: { name: string } }[] })?.data || (Array.isArray(joData) ? (joData as unknown as { id: string; joNumber: string }[]) : [])

  const handleGenerateFromForm = (type: "lot" | "sku") => {
    if (type === "lot") {
      const lotId = `BB-MTSEL8L9-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`
      const payload = generateMaterialLotQR({
        id: lotId,
        lotNumber: lotId,
        skuCode: "SKU-CLN-001",
        skuName: "Kain Katun",
        quantity: 1,
        unit: "Pcs",
        supplier: "PT. Sandang Jaya Textile",
        dateIn: "2026-09-08",
      })
      setQRValue(payload)
    } else {
      const skuCode = `SKU-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`
      setBarcodeValue(skuCode)
    }
  }

  const handleGenerateRealQR = () => {
    try {
      if (qrEntityType === "MATERIAL_LOT") {
        const lot = (lots || []).find(l => l.id === selectedLotId)
        if (!lot) { toast.error("Pilih lot terlebih dahulu"); return }
        const payload = generateMaterialLotQR({
          id: lot.id,
          lotNumber: lot.lotNumber,
          skuCode: lot.product?.code,
          skuName: lot.product?.name,
          quantity: lot.quantity,
          unit: lot.product?.unit,
          supplier: lot.supplier,
        })
        setQRValue(payload)
        toast.success(`QR generated untuk lot ${lot.lotNumber}`)
      } else if (qrEntityType === "EMPLOYEE") {
        const emp = (employees || []).find(e => e.id === selectedEmployeeId)
        if (!emp) { toast.error("Pilih karyawan terlebih dahulu"); return }
        const payload = generateEmployeeQR({ id: emp.id, name: emp.name, role: emp.role, pin: emp.qrCode || undefined })
        setQRValue(payload)
        toast.success(`QR generated untuk karyawan ${emp.name}`)
      } else if (qrEntityType === "JOB_ORDER") {
        const jo = joList.find((j: { id: string }) => j.id === selectedJoId)
        if (!jo) { toast.error("Pilih JO terlebih dahulu"); return }
        const payload = generateJobOrderQR({ id: jo.id, joNumber: jo.joNumber, productName: (jo as { product?: { name: string } }).product?.name })
        setQRValue(payload)
        toast.success(`QR generated untuk JO ${jo.joNumber}`)
      }
    } catch (e) {
      toast.error("Gagal generate QR")
      console.error(e)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="QR/Barcode Generator"
        description="Generate QR untuk lot bahan baku, karyawan, dan job order; barcode untuk kode bahan baku"
      />

      <Tabs defaultValue="qr" className="space-y-4">
        <TabsList>
          <TabsTrigger value="qr" className="flex items-center gap-2">
            <QrCodeIcon className="h-4 w-4" />
            QR Code
          </TabsTrigger>
          <TabsTrigger value="barcode" className="flex items-center gap-2">
            <RectangleStackIcon className="h-4 w-4" />
            Barcode
          </TabsTrigger>
          <TabsTrigger value="batch" className="flex items-center gap-2">
            <ListBulletIcon className="h-4 w-4" />
            Batch Generate
          </TabsTrigger>
        </TabsList>

        <TabsContent value="qr" className="space-y-4">
          <Alert className="border-brand-primary/30 bg-brand-primary/5">
            <InformationCircleIcon />
            <AlertTitle>Apa yang di-generate di sini?</AlertTitle>
            <AlertDescription>
              <p>
                Pilih tipe entity dan record dari database, lalu klik{" "}
                <span className="font-medium text-foreground">Generate QR</span>. Format payload (JSON) disusun
                otomatis dari data — kamu <span className="font-medium text-foreground">tidak perlu menulis JSON manual</span>.
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>
                  <span className="font-medium text-foreground">Bahan Baku (Lot)</span> — ditempel di fisik
                  bahan. Saat discan di <em>Produksi Baru</em>, lot dan stok batch langsung terpilih.
                </li>
                <li>
                  <span className="font-medium text-foreground">Karyawan (Badge)</span> — ditempel di badge.
                  Scan untuk menandai siapa yang mengerjakan produksi.
                </li>
                <li>
                  <span className="font-medium text-foreground">Job Order</span> — scan untuk membuka detail
                  pesanan kerja yang dimaksud.
                </li>
              </ul>
              <p>
                <span className="font-medium text-foreground">QR Lot vs Barcode Bahan Baku:</span> QR Lot (di sini)
                dipakai untuk scan di <em>Produksi Baru</em> dan <em>Inventori Bahan</em>. Barcode Bahan Baku
                (tab <strong>Barcode</strong>) dipakai untuk scan di <em>Transfer</em> dan <em>Inventori Produk</em>.
              </p>
              <p>
                <span className="font-medium text-foreground">LOT vs Bahan Baku:</span> Bahan Baku adalah jenis
                materi yang diolah (mis. <code className="font-mono">KAIN-KATUN-001</code>, disimpan dengan kode SKU),
                sedangkan Lot adalah batch atau penerimaan spesifik bahan itu (mis. <code className="font-mono">BB-…</code>).
                Satu bahan baku bisa memiliki banyak lot — itulah kenapa <code className="font-mono">code</code> di QR
                memakai nomor Lot, supaya batch mana yang dipakai selalu jelas.
              </p>
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Generate QR Code (Data Real)</CardTitle>
              <CardDescription>
                Generate QR code dari data yang ada di database — format konsisten, bisa di-scan langsung
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipe Entity</label>
                  <Select value={qrEntityType} onValueChange={(v) => setQrEntityType(v as typeof qrEntityType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MATERIAL_LOT">Bahan Baku (Lot)</SelectItem>
                      <SelectItem value="EMPLOYEE">Karyawan (Badge)</SelectItem>
                      <SelectItem value="JOB_ORDER">Job Order</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {qrEntityType === "MATERIAL_LOT" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pilih Lot</label>
                    <Select value={selectedLotId} onValueChange={setSelectedLotId}>
                      <SelectTrigger><SelectValue placeholder="Pilih lot..." /></SelectTrigger>
                      <SelectContent>
                        {(lots || []).map(lot => (
                          <SelectItem key={lot.id} value={lot.id}>
                            {lot.lotNumber} • {lot.product?.code || "-"} ({lot.product?.name || "-"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {qrEntityType === "EMPLOYEE" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pilih Karyawan</label>
                    <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                      <SelectTrigger><SelectValue placeholder="Pilih karyawan..." /></SelectTrigger>
                      <SelectContent>
                        {(employees || []).filter(e => e).map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>{emp.name} - {emp.role || "KARYAWAN"}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {qrEntityType === "JOB_ORDER" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pilih JO</label>
                    <Select value={selectedJoId} onValueChange={setSelectedJoId}>
                      <SelectTrigger><SelectValue placeholder="Pilih JO..." /></SelectTrigger>
                      <SelectContent>
                        {joList.map((jo: { id: string; joNumber: string }) => (
                          <SelectItem key={jo.id} value={jo.id}>{jo.joNumber}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex h-full flex-col items-end gap-2">
                  <span className="invisible text-sm font-medium">Generate QR</span>
                  <Button
                    onClick={handleGenerateRealQR}
                    className="w-auto whitespace-nowrap ml-auto dark:bg-[var(--brand-primary)] dark:hover:bg-[var(--brand-primary)]/80"
                  >
                    <QrCodeIcon className="mr-2 h-4 w-4" />
                    Generate QR
                  </Button>
                </div>
              </div>

              <QRCodeGenerator
                value={qrValue}
                size={250}
                showDownload
                showPrint
                showEdit={false}
              />
              <div className="space-y-2">
                <p className="text-sm font-medium">Pratinjau Payload (dibaca scanner):</p>
                {qrValue ? (
                  <pre className="p-3 bg-muted rounded-lg text-xs overflow-auto">{qrValue}</pre>
                ) : (
                  <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground border border-dashed">
                    Belum ada data. Pilih tipe entity &amp; record di atas, lalu klik{" "}
                    <span className="font-medium text-foreground">Generate QR</span> — format payload dibuat otomatis.
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Arti field: <code className="font-mono">type</code> = jenis entity ·{" "}
                  <code className="font-mono">id</code> = ID unik di database ·{" "}
                  <code className="font-mono">code</code> = nomor lot / ID karyawan / nomor JO ·{" "}
                  <code className="font-mono">name</code> = nama tampilan.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generate Sample (Demo)</CardTitle>
              <CardDescription>Sample untuk testing — bukan dari database</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleGenerateFromForm("lot")}>
                  Generate Sample Lot
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Gunakan card di atas untuk data real. Sample hanya untuk testing format.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="barcode" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generate Barcode Bahan Baku</CardTitle>
              <CardDescription>
                Generate barcode untuk kode bahan baku menggunakan Code128
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={() => handleGenerateFromForm("sku")} className="dark:bg-[var(--brand-primary)] dark:hover:bg-[var(--brand-primary)]/80">
                  Generate Sample Bahan Baku
                </Button>
              </div>
              <BarcodeGenerator
                value={barcodeValue}
                onChange={setBarcodeValue}
                type="code128"
                showDownload
                showPrint
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batch" className="space-y-4">
          <BatchBarcodeGenerator />
        </TabsContent>
      </Tabs>
    </div>
  )
}
