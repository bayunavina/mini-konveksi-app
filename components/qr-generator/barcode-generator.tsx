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

interface BatchItem {
  sku: string
  name: string
  quantity: number
}

interface GenerateResult {
  sku: string
  labelName: string
  barcode: string
  image: string
}

interface BatchBarcodeGeneratorProps {
  items?: { sku: string; name: string }[]
  className?: string
}

export function BatchBarcodeGenerator({
  items: initialItems,
  className,
}: BatchBarcodeGeneratorProps) {
  const [items, setItems] = useState<BatchItem[]>(
    (initialItems || []).map((i) => ({ ...i, quantity: 1 }))
  )
  const [generated, setGenerated] = useState<GenerateResult[]>([])
  const [warnings, setWarnings] = useState<string[]>([])

  const duplicateSkus = items.reduce<string[]>((acc, item, _i, arr) => {
    const key = (item.sku || item.name || "").trim().toUpperCase()
    if (!key) return acc
    if (arr.findIndex((x) => (x.sku || x.name || "").trim().toUpperCase() === key) !== _i) {
      if (!acc.includes(key)) acc.push(key)
    }
    return acc
  }, [])

  const handleAddItem = () => {
    setItems([...items, { sku: "", name: "", quantity: 1 }])
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, field: keyof BatchItem, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const handleGenerateAll = async () => {
    const results: GenerateResult[] = []
    const newWarnings: string[] = []
    const counters = new Map<string, number>()
    const seenBarcodes = new Set<string>()

    for (const item of items) {
      if (!item.name) continue
      const qty = Math.max(1, Math.min(Number(item.quantity) || 1, 10000))
      const key = (item.sku || item.name).trim().toUpperCase()
      const currentSeq = (counters.get(key) ?? 0) + 1

      for (let i = 0; i < qty; i++) {
        const seq = currentSeq + i
        const suffix = String(seq).padStart(4, "0")
        const barcodeText = item.sku ? `${item.sku}-${suffix}` : `${item.name}-${suffix}`
        const labelName = `${item.name}-${suffix}`

        if (seenBarcodes.has(barcodeText)) {
          newWarnings.push(`Barcode duplikat dilewati: ${barcodeText}`)
          continue
        }
        seenBarcodes.add(barcodeText)

        let image = ""
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const bwipjs = require("bwip-js")
          const canvas = document.createElement("canvas")
          bwipjs.toCanvas(canvas, {
            bcid: "code128",
            text: barcodeText,
            scale: 3,
            height: 10,
            includetext: true,
            textxalign: "center",
          })
          image = canvas.toDataURL("image/png")
        } catch (err) {
          console.error(`Failed to generate barcode for ${barcodeText}:`, err)
        }
        results.push({ sku: item.sku, labelName, barcode: barcodeText, image })
      }
      counters.set(key, currentSeq + qty - 1)
    }

    if (duplicateSkus.length > 0) {
      newWarnings.push(
        `SKU duplikat dalam daftar: ${duplicateSkus.join(", ")}. Nomor urut di-reset per-SKU.`
      )
    }
    setWarnings(newWarnings)
    setGenerated(results)
  }

  const handlePrintAll = () => {
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      const codesHtml = generated
        .map((g) => `
          <div class="barcode-item">
            <img src="${g.image}" alt="${g.barcode}" />
            ${g.sku ? `<div class="barcode-sku">${g.sku}</div>` : ""}
            <div class="barcode-name">${g.labelName}</div>
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
              .barcode-sku {
                margin-top: 8px;
                font-size: 12px;
                font-weight: bold;
                font-family: monospace;
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
        <CardDescription>
          Generate banyak barcode sekaligus. Format: <code className="font-mono">SKU-NamaProduk</code> + nomor urut.
          Nomor urut di-reset per-SKU (mis. Celana PDL-0001, -0002, dst. untuk qty 3, lalu Kaos-0001 dst.).
        </CardDescription>
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
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                  placeholder="Qty"
                  className="w-20"
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
            <Button
              onClick={handleGenerateAll}
              className="dark:bg-[var(--brand-primary)] dark:hover:bg-[var(--brand-primary)]/80"
            >
              Generate ({generated.length || items.reduce((s, i) => s + (Number(i.quantity) || 1), 0)})
            </Button>
          </div>

          {warnings.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
              <p className="font-medium mb-1">Peringatan:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {duplicateSkus.length > 0 && generated.length === 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
              <p className="font-medium">
                SKU duplikat terdeteksi: {duplicateSkus.join(", ")}.
                Nomor urut akan di-reset per-SKU saat generate.
              </p>
            </div>
          )}

          {generated.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-4 mt-4">
                {generated.map((g, index) => (
                  <div key={index} className="text-center border rounded p-2">
                    {g.image ? (
                      <img
                        src={g.image}
                        alt={g.barcode}
                        className="mx-auto"
                      />
                    ) : (
                      <p className="text-xs">{g.barcode}</p>
                    )}
                    {g.sku && <p className="text-xs font-mono mt-1">{g.sku}</p>}
                    <p className="text-xs">{g.labelName}</p>
                  </div>
                ))}
              </div>
              <Button onClick={handlePrintAll} className="w-full mt-4">
                Print All Barcodes ({generated.length})
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
