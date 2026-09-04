"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CameraScanner } from "./camera-scanner"
import { KeyboardScanner } from "./keyboard-scanner"
import { QrCodeIcon, CameraIcon, ArrowUpTrayIcon, PhotoIcon } from "@heroicons/react/24/outline"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { Html5Qrcode } from "html5-qrcode"

interface ScanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScan: (result: string) => void
  title?: string
  description?: string
}

export function ScanModal({
  open,
  onOpenChange,
  onScan,
  title = "Scan QR/Barcode",
  description = "Arahkan kamera ke QR code atau barcode, atau masukkan secara manual",
}: ScanModalProps) {
  const [activeTab, setActiveTab] = useState("camera")
  const [lastScan, setLastScan] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [scanningImage, setScanningImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  const handleScan = useCallback((result: string) => {
    setLastScan(result)
    onScan(result)
  }, [onScan])

  const handleConfirm = () => {
    if (lastScan) {
      onScan(lastScan)
      onOpenChange(false)
      setLastScan(null)
      setImagePreview(null)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setLastScan(null)
    setImagePreview(null)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string)
      toast.success("Gambar berhasil diupload. Klik 'Scan QR Code' untuk memindai.")
    }
    reader.onerror = () => {
      toast.error("Gagal membaca gambar")
    }
    reader.readAsDataURL(file)
  }

  const handleScanFromImage = async () => {
    if (!imagePreview) {
      toast.error("Upload gambar terlebih dahulu")
      return
    }

    setScanningImage(true)
    
    try {
      // Create a temporary scanner for image scanning
      const scanner = new Html5Qrcode("qr-reader-image-scan")
      scannerRef.current = scanner

      // Try to find QR code in the image
      const fileInput = fileInputRef.current
      if (fileInput?.files && fileInput.files[0]) {
        try {
          const result = await scanner.scanFile(fileInput.files[0], false)
          setLastScan(result)
          onScan(result)
          toast.success(`QR Code terdeteksi: ${result}`)
        } catch (scanError) {
          // If QR scan fails, try barcode detection or show manual input option
          console.log("QR scan failed:", scanError)
          
          // Try to extract any text/numbers that look like a transfer number
          const imgSrc = imagePreview
          const match = imgSrc.match(/TRF[-_]?(?:IN|OUT)?[-_]?\d{6}[-_]?[A-Z0-9]{4}/gi)
          if (match && match.length > 0) {
            const transferCode = match[0].replace(/[-_]/g, "-")
            setLastScan(transferCode)
            onScan(transferCode)
            toast.success(`Transfer terdeteksi: ${transferCode}`)
          } else {
            // If no transfer code found, show manual input option
            toast.error("QR Code tidak terbaca. Coba gunakan manual input.")
          }
        }
      }
    } catch (error) {
      console.error("Scan error:", error)
      toast.error("Gagal memindai QR Code")
    } finally {
      setScanningImage(false)
    }
  }

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear()
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }, [])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="dark sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex w-full gap-1 rounded-lg bg-gray-800 p-1">
            <TabsTrigger
              value="camera"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-3 py-2 text-sm font-medium transition-colors data-[state=active]:bg-gray-700 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:border-gray-600 data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-400 hover:data-[state=inactive]:bg-gray-700"
            >
              <CameraIcon className="h-4 w-4" />
              Kamera
            </TabsTrigger>
            <TabsTrigger
              value="image"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-3 py-2 text-sm font-medium transition-colors data-[state=active]:bg-gray-700 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:border-gray-600 data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-400 hover:data-[state=inactive]:bg-gray-700"
            >
              <PhotoIcon className="h-4 w-4" />
              Gambar
            </TabsTrigger>
            <TabsTrigger
              value="manual"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-3 py-2 text-sm font-medium transition-colors data-[state=active]:bg-gray-700 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:border-gray-600 data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-400 hover:data-[state=inactive]:bg-gray-700"
            >
              <span className="h-4 w-4">⌨️</span>
              Manual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="camera" className="mt-4">
            <Card>
              <CardContent className="p-4">
                <CameraScanner
                  onScan={handleScan}
                  className="relative bg-gray-900 rounded-lg overflow-hidden border border-gray-700"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="image" className="mt-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div id="qr-reader-image-scan" className="hidden"></div>
                <div className="border border-gray-700 rounded-lg p-4 text-center">
                  {imagePreview ? (
                    <div className="space-y-4">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-h-48 mx-auto rounded-lg object-contain"
                      />
                      <div className="flex gap-2 justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                          onClick={() => {
                            setImagePreview(null)
                            fileInputRef.current?.click()
                          }}
                        >
                          Ganti Gambar
                        </Button>
                        <Button
                          size="sm"
                          className="bg-gray-700 text-white hover:bg-gray-600"
                          onClick={handleScanFromImage}
                          disabled={scanningImage}
                        >
                          {scanningImage ? (
                            <>
                              <Spinner data-icon="inline-start" />
                              Memindai...
                            </>
                          ) : (
                            <>
                              <QrCodeIcon className="mr-2 h-4 w-4" />
                              Scan QR Code
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8">
                      <ArrowUpTrayIcon className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                      <p className="text-sm text-gray-400 mb-4">
                        Upload gambar yang mengandung QR Code
                      </p>
                      <Button onClick={() => fileInputRef.current?.click()} className="bg-gray-700 text-white hover:bg-gray-600">
                        <ArrowUpTrayIcon className="mr-2 h-4 w-4" />
                        Pilih Gambar
                      </Button>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <p className="text-xs text-gray-500 text-center">
                  Format: JPG, PNG, WebP. Pastikan QR Code terlihat jelas.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <KeyboardScanner
                  onScan={handleScan}
                  placeholder="Scan barcode atau ketik manual..."
                  autoFocus
                />
                <div className="text-center text-sm text-gray-400">
                  atau ketik nomor transfer: TRF-IN-xxxxxx-XXXX
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {lastScan && (
          <div className="mt-4 p-3 bg-gray-800 rounded-lg">
            <p className="text-sm font-medium">Hasil Scan:</p>
            <p className="text-sm font-mono break-all">{lastScan}</p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white" onClick={handleClose}>
            Batal
          </Button>
          {lastScan && (
            <Button onClick={handleConfirm} className="bg-gray-700 text-white hover:bg-gray-600">
              Gunakan Hasil
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ScanButtonProps {
  onScan: (result: string) => void
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  children?: React.ReactNode
  className?: string
}

export function ScanButton({
  onScan,
  variant = "default",
  size = "default",
  children,
  className,
}: ScanButtonProps) {
  const [open, setOpen] = useState(false)

  const handleScan = (result: string) => {
    onScan(result)
    setOpen(false)
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={className}
      >
        <QrCodeIcon className="mr-2 h-4 w-4" />
        {children || "Scan"}
      </Button>
      <ScanModal
        open={open}
        onOpenChange={setOpen}
        onScan={handleScan}
      />
    </>
  )
}
