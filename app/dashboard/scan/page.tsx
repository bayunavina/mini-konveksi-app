"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/shared"
import { ScanModal } from "@/components/scanner"
import { QrCodeIcon, CameraIcon, CheckIcon, XMarkIcon, CommandLineIcon } from "@heroicons/react/24/outline"

interface ScanHistory {
  id: string
  data: string
  type: string
  result: string
  time: string
}

export default function ScanPage() {
  const [scanModalOpen, setScanModalOpen] = useState(false)
  const [scanResult, setScanResult] = useState<{
    success: boolean
    data: string
    match: boolean
  } | null>(null)
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([])

  useEffect(() => {
    const saved = localStorage.getItem("scanHistory")
    if (saved) {
      setScanHistory(JSON.parse(saved))
    }
  }, [])

  const handleScan = (result: string) => {
    const newResult = {
      success: true,
      data: result,
      match: !result.includes("INVALID"),
    }
    setScanResult(newResult)
    
    const newScan: ScanHistory = {
      id: Date.now().toString(),
      data: result,
      type: "SCAN",
      result: newResult.match ? "MATCH" : "NO_MATCH",
      time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    }
    
    const updatedHistory = [newScan, ...scanHistory].slice(0, 10)
    setScanHistory(updatedHistory)
    localStorage.setItem("scanHistory", JSON.stringify(updatedHistory))
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Scan QR/Barcode"
        description="Scan QR code atau barcode untuk verifikasi"
        actions={
          <Button onClick={() => setScanModalOpen(true)}>
            <QrCodeIcon className="mr-2 h-4 w-4" />
            Mulai Scan
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CameraIcon className="h-5 w-5" />
              Scan dengan Kamera
            </CardTitle>
            <CardDescription>
              Gunakan kamera untuk scan QR code atau barcode
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setScanModalOpen(true)} className="w-full" size="lg">
              <QrCodeIcon className="mr-2 h-5 w-5" />
              Buka Kamera
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CommandLineIcon className="h-5 w-5" />
              Input Manual / USB Scanner
            </CardTitle>
            <CardDescription>
              Ketik manual atau gunakan barcode scanner USB
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Scanner barcode USB akan otomatis terdeteksi saat Anda mengetik.
              Tekan Enter untuk memproses kode.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Scan Terakhir</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {scanHistory.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Belum ada riwayat scan</p>
            ) : scanHistory.map((scan) => (
              <div
                key={scan.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    scan.result === "MATCH" ? "bg-green-100" : "bg-red-100"
                  }`}>
                    {scan.result === "MATCH" ? (
                      <CheckIcon className="h-4 w-4 text-green-600" />
                    ) : (
                      <XMarkIcon className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-mono font-medium">{scan.data}</p>
                    <p className="text-xs text-muted-foreground">
                      {scan.type} - {scan.time}
                    </p>
                  </div>
                </div>
                <Badge className={
                  scan.result === "MATCH" 
                    ? "bg-green-100 text-green-800" 
                    : "bg-red-100 text-red-800"
                }>
                  {scan.result === "MATCH" ? "Cocok" : "Tidak Cocok"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ScanModal
        open={scanModalOpen}
        onOpenChange={setScanModalOpen}
        onScan={handleScan}
        title="Scan QR/Barcode"
        description="Arahkan kamera ke QR code atau barcode"
      />

      {scanResult && (
        <Card className={scanResult.match ? "border-green-500" : "border-red-500"}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle>Hasil Scan</CardTitle>
              <Badge className={
                scanResult.match 
                  ? "bg-green-100 text-green-800" 
                  : "bg-red-100 text-red-800"
              }>
                {scanResult.match ? "Cocok" : "Tidak Cocok"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-muted rounded-lg font-mono">
              {scanResult.data}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
