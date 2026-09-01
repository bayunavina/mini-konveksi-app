"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/shared"
import { QRCodeGenerator } from "@/components/qr-generator"
import { BarcodeGenerator, BatchBarcodeGenerator } from "@/components/qr-generator"
import { Button } from "@/components/ui/button"
import { QrCodeIcon, RectangleStackIcon, ListBulletIcon } from "@heroicons/react/24/outline"

export default function QRGeneratorPage() {
  const [qrValue, setQRValue] = useState("")
  const [barcodeValue, setBarcodeValue] = useState("")
  const [batchItems, setBatchItems] = useState<{ sku: string; name: string }[]>([])

  const handleGenerateFromForm = (type: "lot" | "sku") => {
    if (type === "lot") {
      const lotId = `LOT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`
      const data = JSON.stringify({
        type: "MATERIAL_LOT",
        lotId,
        sku: "KAIN-KATUN-001",
        quantity: 100,
        unit: "Pcs",
        supplier: "PT Textile",
        dateIn: new Date().toISOString().split("T")[0],
      })
      setQRValue(data)
    } else {
      const skuCode = `SKU-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`
      setBarcodeValue(skuCode)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="QR/Barcode Generator"
        description="Generate QR Code dan Barcode untuk lot bahan dan SKU produk"
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
          <Card>
            <CardHeader>
              <CardTitle>Generate QR Code Lot Bahan</CardTitle>
              <CardDescription>
                Generate QR code untuk lot bahan baku dengan data JSON
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={() => handleGenerateFromForm("lot")} className="dark:bg-[#304ffe] dark:hover:bg-[#304ffe]/80">
                  Generate Sample Lot
                </Button>
              </div>
              <QRCodeGenerator
                value={qrValue}
                onChange={setQRValue}
                size={250}
                showDownload
                showPrint
              />
              <div className="space-y-2">
                <p className="text-sm font-medium">Format Data QR:</p>
                <pre className="p-3 bg-muted rounded-lg text-xs overflow-auto">
                  {qrValue || '{"type": "MATERIAL_LOT", "lotId": "...", "sku": "...", "quantity": ...}'}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="barcode" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generate Barcode SKU</CardTitle>
              <CardDescription>
                Generate barcode untuk SKU produk menggunakan Code128
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={() => handleGenerateFromForm("sku")} className="dark:bg-[#304ffe] dark:hover:bg-[#304ffe]/80">
                  Generate Sample SKU
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
          <BatchBarcodeGenerator
            items={batchItems}
            onItemsChange={setBatchItems}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
