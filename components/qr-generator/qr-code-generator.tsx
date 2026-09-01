"use client"

import { useState, useRef, useEffect } from "react"
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react"
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

interface QRCodeGeneratorProps {
  value: string
  onChange?: (value: string) => void
  size?: number
  showDownload?: boolean
  showPrint?: boolean
  showEdit?: boolean
  className?: string
}

export function QRCodeGenerator({
  value: initialValue,
  onChange,
  size = 200,
  showDownload = true,
  showPrint = true,
  showEdit = true,
  className,
}: QRCodeGeneratorProps) {
  const [value, setValue] = useState(initialValue || "")
  const [renderAs, setRenderAs] = useState<"svg" | "canvas">("svg")
  const [copied, setCopied] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (initialValue) {
      setValue(initialValue)
    }
  }, [initialValue])

  const handleValueChange = (newValue: string) => {
    setValue(newValue)
    onChange?.(newValue)
  }

  const handleCopy = async () => {
    if (renderAs === "canvas") {
      const canvas = qrRef.current?.querySelector("canvas")
      if (canvas) {
        try {
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/png")
          )
          if (blob) {
            await navigator.clipboard.write([
              new ClipboardItem({ "image/png": blob }),
            ])
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }
        } catch (err) {
          console.error("Failed to copy:", err)
        }
      }
    }
  }

  const handleDownload = () => {
    if (renderAs === "svg") {
      const svg = qrRef.current?.querySelector("svg")
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg)
        const blob = new Blob([svgData], { type: "image/svg+xml" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `qrcode-${value || "untitled"}.svg`
        link.click()
        URL.revokeObjectURL(url)
      }
    } else {
      const canvas = qrRef.current?.querySelector("canvas")
      if (canvas) {
        const url = canvas.toDataURL("image/png")
        const link = document.createElement("a")
        link.href = url
        link.download = `qrcode-${value || "untitled"}.png`
        link.click()
      }
    }
  }

  const handlePrint = () => {
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - ${value || "Untitled"}</title>
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
              .qr-container {
                text-align: center;
                border: 1px solid #ccc;
                padding: 20px;
              }
              .qr-label {
                margin-top: 10px;
                font-size: 14px;
              }
              @media print {
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            <div class="qr-container">
              ${renderAs === "svg" 
                ? qrRef.current?.querySelector("svg")?.outerHTML 
                : `<img src="${qrRef.current?.querySelector("canvas")?.toDataURL()}" />`
              }
              <div class="qr-label">${value || "Untitled"}</div>
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
      {showEdit && (
        <CardHeader>
          <CardTitle>Generate QR Code</CardTitle>
          <CardDescription>Masukkan data untuk generate QR Code</CardDescription>
        </CardHeader>
      )}
      <CardContent className={cn(showEdit ? "" : "pt-4")}>
        {showEdit && (
          <div className="space-y-4 mb-4">
            <div className="space-y-2">
              <Input
                value={value}
                onChange={(e) => handleValueChange(e.target.value)}
                placeholder="Masukkan data (contoh: LOT-2025-001)"
                className="font-mono"
              />
            </div>
            <Select value={renderAs} onValueChange={(v) => setRenderAs(v as "svg" | "canvas")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="svg">SVG (Vector)</SelectItem>
                <SelectItem value="canvas">Canvas (Raster)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div
          ref={qrRef}
          className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border"
        >
          {value ? (
            renderAs === "svg" ? (
              <QRCodeSVG
                value={value}
                size={size}
                level="H"
                includeMargin
              />
            ) : (
              <QRCodeCanvas
                value={value}
                size={size}
                level="H"
                includeMargin
              />
            )
          ) : (
            <div
              className="flex items-center justify-center bg-gray-100 rounded"
              style={{ width: size, height: size }}
            >
              <span className="text-gray-400 text-sm">Masukkan data</span>
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

interface MaterialQRData {
  type: "MATERIAL_LOT"
  lotId: string
  sku: string
  quantity: number
  unit: string
  supplier?: string
  dateIn?: string
  poNumber?: string
}

export function generateMaterialQRData(data: MaterialQRData): string {
  return JSON.stringify(data)
}

export function parseMaterialQRData(qrString: string): MaterialQRData | null {
  try {
    const data = JSON.parse(qrString)
    if (data.type === "MATERIAL_LOT") {
      return data as MaterialQRData
    }
    return null
  } catch {
    return null
  }
}
