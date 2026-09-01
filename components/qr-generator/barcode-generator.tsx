"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowDownTrayIcon, PrinterIcon, ClipboardIcon, CheckIcon } from "@heroicons/react/24/outline"
import { cn } from "@/lib/utils"

type BarcodeType = "code128" | "code39" | "ean13" | "upc" | "qrcode"

interface BarcodeGeneratorProps {
  value: string
  onChange?: (value: string) => void
  type?: BarcodeType
  onTypeChange?: (type: BarcodeType) => void
  showDownload?: boolean
  showPrint?: boolean
  showEdit?: boolean
  className?: string
}

export function BarcodeGenerator({
  value: initialValue,
  onChange,
  type: initialType = "code128",
  onTypeChange,
  showDownload = true,
  showPrint = true,
  showEdit = true,
  className,
}: BarcodeGeneratorProps) {
  const [value, setValue] = useState(initialValue || "")
  const [type, setType] = useState<BarcodeType>(initialType)
  const [copied, setCopied] = useState(false)
  const [barcodeUrl, setBarcodeUrl] = useState<string | null>(null)

  useEffect(() => {
    if (initialValue) {
      setValue(initialValue)
    }
  }, [initialValue])

  useEffect(() => {
    if (initialType) {
      setType(initialType)
    }
  }, [initialType])

  useEffect(() => {
    generateBarcode()
  }, [value, type])

  const generateBarcode = async () => {
    if (!value) {
      setBarcodeUrl(null)
      return
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const bwipjs = require("bwip-js")
      const canvas = document.createElement("canvas")
      
      // Auto-detect appropriate barcode type based on value
      let barcodeType = type === "qrcode" ? "qrcode" : type
      let textValue = value

      // ean13 requires exactly 12 or 13 digits
      if (barcodeType === "ean13") {
        const digitsOnly = value.replace(/\D/g, "")
        if (digitsOnly.length === 12 || digitsOnly.length === 13) {
          textValue = digitsOnly
        } else {
          // Fallback to code128 for non-ean13 values
          barcodeType = "code128"
        }
      }

      // upc requires exactly 11 or 12 digits
      if (barcodeType === "upc") {
        const digitsOnly = value.replace(/\D/g, "")
        if (digitsOnly.length === 11 || digitsOnly.length === 12) {
          textValue = digitsOnly
        } else {
          barcodeType = "code128"
        }
      }
      
      bwipjs.toCanvas(canvas, {
        bcid: barcodeType,
        text: textValue,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: "center",
      })

      setBarcodeUrl(canvas.toDataURL("image/png"))
    } catch (err) {
      console.error("Failed to generate barcode:", err)
      setBarcodeUrl(null)
    }
  }

  const handleValueChange = (newValue: string) => {
    setValue(newValue)
    onChange?.(newValue)
  }

  const handleTypeChange = (newType: BarcodeType) => {
    setType(newType)
    onTypeChange?.(newType)
  }

  const handleCopy = async () => {
    if (barcodeUrl) {
      try {
        const response = await fetch(barcodeUrl)
        const blob = await response.blob()
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ])
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error("Failed to copy:", err)
      }
    }
  }

  const handleDownload = () => {
    if (barcodeUrl) {
      const link = document.createElement("a")
      link.href = barcodeUrl
      link.download = `barcode-${value || "untitled"}.png`
      link.click()
    }
  }

  const handlePrint = () => {
    if (barcodeUrl) {
      const printWindow = window.open("", "_blank")
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Barcode - ${value || "Untitled"}</title>
              <style>
                body {
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                  margin: 0;
                  font-family: Arial, sans-serif;
                }
                .barcode-container {
                  text-align: center;
                  border: 1px solid #ccc;
                  padding: 20px;
                }
                .barcode-label {
                  margin-top: 10px;
                  font-size: 14px;
                  font-family: monospace;
                }
                @media print {
                  body { padding: 0; }
                }
              </style>
            </head>
            <body>
              <div class="barcode-container">
                <img src="${barcodeUrl}" alt="Barcode" />
                <div class="barcode-label">${value || "Untitled"}</div>
              </div>
              <script>
                window.onload = function() {
                  window.print();
                }
              </script>
            </body>
          </html>
        `)
        printWindow.document.close()
      }
    }
  }

  return (
    <Card className={className}>
      {showEdit && (
        <CardHeader>
          <CardTitle>Generate Barcode</CardTitle>
          <CardDescription>Generate barcode untuk SKU produk</CardDescription>
        </CardHeader>
      )}
      <CardContent className={cn(showEdit ? "" : "pt-4")}>
        {showEdit && (
          <div className="space-y-4 mb-4">
            <div className="space-y-2">
              <Input
                value={value}
                onChange={(e) => handleValueChange(e.target.value.toUpperCase())}
                placeholder="Masukkan SKU (contoh: SKU-001)"
                className="font-mono"
              />
            </div>
            <Select value={type} onValueChange={(v) => handleTypeChange(v as BarcodeType)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tipe Barcode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="code128">Code 128</SelectItem>
                <SelectItem value="code39">Code 39</SelectItem>
                <SelectItem value="ean13">EAN-13</SelectItem>
                <SelectItem value="upc">UPC</SelectItem>
                <SelectItem value="qrcode">QR Code</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div
          className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border"
        >
          {barcodeUrl ? (
            <img src={barcodeUrl} alt="Barcode" className="max-w-full" />
          ) : (
            <div
              className="flex items-center justify-center bg-gray-100 rounded"
              style={{ width: 300, height: 100 }}
            >
              <span className="text-gray-400 text-sm">Masukkan SKU</span>
            </div>
          )}
          {showEdit && value && (
            <p className="mt-2 text-sm text-muted-foreground font-mono">{value}</p>
          )}
        </div>

        {showDownload && value && (
          <div className="flex items-center gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={handleCopy} className="flex-1">
              {copied ? (
                <>
                  <CheckIcon className="mr-2 h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <ClipboardIcon className="mr-2 h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} className="flex-1">
              <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
              Download
            </Button>
            {showPrint && (
              <Button variant="outline" size="sm" onClick={handlePrint} className="flex-1">
                <PrinterIcon className="mr-2 h-4 w-4" />
                Print
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface BatchBarcodeGeneratorProps {
  items: { sku: string; name: string }[]
  onItemsChange?: (items: { sku: string; name: string }[]) => void
  className?: string
}

export function BatchBarcodeGenerator({
  items: initialItems,
  onItemsChange,
  className,
}: BatchBarcodeGeneratorProps) {
  const [items, setItems] = useState(initialItems || [])
  const [generatedCodes, setGeneratedCodes] = useState<Map<string, string>>(new Map())

  const handleAddItem = () => {
    const newItems = [...items, { sku: "", name: "" }]
    setItems(newItems)
    onItemsChange?.(newItems)
  }

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    setItems(newItems)
    onItemsChange?.(newItems)
  }

  const handleItemChange = (index: number, field: "sku" | "name", value: string) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
    onItemsChange?.(newItems)
  }

  const handleGenerateAll = async () => {
    const codes = new Map<string, string>()
    
    for (const item of items) {
      if (item.sku) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const bwipjs = require("bwip-js")
          const canvas = document.createElement("canvas")
          
          bwipjs.toCanvas(canvas, {
            bcid: "code128",
            text: item.sku,
            scale: 3,
            height: 10,
            includetext: true,
            textxalign: "center",
          })
          
          codes.set(item.sku, canvas.toDataURL("image/png"))
        } catch (err) {
          console.error(`Failed to generate barcode for ${item.sku}:`, err)
        }
      }
    }
    
    setGeneratedCodes(codes)
  }

  const handlePrintAll = () => {
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      const codesHtml = items
        .filter((item) => generatedCodes.has(item.sku))
        .map((item) => `
          <div class="barcode-item">
            <img src="${generatedCodes.get(item.sku)}" alt="${item.sku}" />
            <div class="barcode-name">${item.name}</div>
          </div>
        `)
        .join("")

      printWindow.document.write(`
        <html>
          <head>
            <title>Print Barcodes</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 20px;
              }
              .barcode-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
              }
              .barcode-item {
                text-align: center;
                border: 1px solid #ccc;
                padding: 10px;
              }
              .barcode-name {
                margin-top: 10px;
                font-size: 12px;
              }
              @media print {
                body { padding: 0; }
                .barcode-item { break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <div class="barcode-grid">
              ${codesHtml}
            </div>
            <script>
              window.onload = function() {
                window.print();
              }
            </script>
          </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Batch Generate Barcode</CardTitle>
        <CardDescription>Generate multiple barcodes sekaligus</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={item.sku}
                  onChange={(e) => handleItemChange(index, "sku", e.target.value.toUpperCase())}
                  placeholder="SKU"
                  className="w-32 font-mono"
                />
                <Input
                  value={item.name}
                  onChange={(e) => handleItemChange(index, "name", e.target.value)}
                  placeholder="Nama Produk"
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveItem(index)}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleAddItem}>
              + Tambah Item
            </Button>
            <Button onClick={handleGenerateAll}>
              Generate All
            </Button>
          </div>

          {generatedCodes.size > 0 && (
            <>
              <div className="grid grid-cols-3 gap-4 mt-4">
                {items
                  .filter((item) => generatedCodes.has(item.sku))
                  .map((item) => (
                    <div key={item.sku} className="text-center border rounded p-2">
                      <img
                        src={generatedCodes.get(item.sku)}
                        alt={item.sku}
                        className="mx-auto"
                      />
                      <p className="text-xs mt-1">{item.name}</p>
                    </div>
                  ))}
              </div>
              <Button onClick={handlePrintAll} className="w-full mt-4">
                Print All Barcodes
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
