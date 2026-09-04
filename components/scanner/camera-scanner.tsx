"use client"

import { useEffect, useRef, useCallback, useState, createContext, useContext } from "react"
import { BrowserMultiFormatReader } from "@zxing/browser"
import { Button } from "@/components/ui/button"
import { CameraIcon } from "@heroicons/react/24/outline"
import {
  checkCameraPrerequisites,
  getCameraErrorInfo,
  type CameraBlockInfo,
} from "@/lib/camera-utils"
import { CameraBlockAlert } from "./camera-block-alert"

interface ScannerContextType {
  lastResult: string | null
  isScanning: boolean
  error: string | null
  blockInfo: CameraBlockInfo | null
  startScanning: () => Promise<void>
  stopScanning: () => void
  onResult: (callback: (result: string) => void) => void
}

const ScannerContext = createContext<ScannerContextType | null>(null)

export function useScanner() {
  const context = useContext(ScannerContext)
  if (!context) {
    throw new Error("useScanner must be used within ScannerProvider")
  }
  return context
}

interface ScannerProviderProps {
  children: React.ReactNode
}

/** Pilih kamera belakang bila tersedia (label berisi back/rear/environment), fallback ke perangkat terakhir. */
function pickPreferredDeviceId(devices: { deviceId: string; label: string }[]): string {
  const back = devices.find((d) => /back|rear|environment|belakang/i.test(d.label))
  return (back ?? devices[devices.length - 1] ?? devices[0]).deviceId
}

export function ScannerProvider({ children }: ScannerProviderProps) {
  const [lastResult, setLastResult] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blockInfo, setBlockInfo] = useState<CameraBlockInfo | null>(null)
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const callbackRef = useRef<((result: string) => void) | null>(null)

  const stopCameraTracks = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
  }, [])

  const startScanning = useCallback(async () => {
    // 1. Cek secure context & dukungan browser SEBELUM menyentuh kamera,
    //    agar user HP via http://IP-lokal mendapat pesan HTTPS yang jelas.
    const pre = checkCameraPrerequisites()
    if (!pre.ok) {
      setBlockInfo(pre)
      setError(pre.title)
      setIsScanning(false)
      console.warn("[scanner] blocked:", pre.code, pre.currentUrl)
      return
    }

    try {
      setError(null)
      setBlockInfo(null)
      const reader = new BrowserMultiFormatReader()
      codeReaderRef.current = reader

      const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices()

      if (videoInputDevices.length === 0) {
        const info = getCameraErrorInfo(new DOMException("No camera found", "NotFoundError"))
        setBlockInfo(info)
        setError(info.title)
        return
      }

      const selectedDeviceId = pickPreferredDeviceId(videoInputDevices)
      setIsScanning(true)

      if (videoRef.current) {
        await reader.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result, error) => {
            if (result) {
              const scannedValue = result.getText()
              setLastResult(scannedValue)
              callbackRef.current?.(scannedValue)
            }
            if (error && error.name !== "NotFoundException") {
              console.error("Scan error:", error)
            }
          }
        )
      }
    } catch (err) {
      const info = getCameraErrorInfo(err)
      setBlockInfo(info)
      setError(info.title)
      console.error("[scanner] start failed:", err)
      setIsScanning(false)
    }
  }, [])

  const stopScanning = useCallback(() => {
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current = null
      } catch (err) {
        console.error("Error stopping scanner:", err)
      }
    }
    stopCameraTracks()
    setIsScanning(false)
  }, [stopCameraTracks])

  const onResult = useCallback((callback: (result: string) => void) => {
    callbackRef.current = callback
  }, [])

  useEffect(() => {
    return () => {
      stopScanning()
    }
  }, [stopScanning])

  return (
    <ScannerContext.Provider
      value={{
        lastResult,
        isScanning,
        error,
        blockInfo,
        startScanning,
        stopScanning,
        onResult,
      }}
    >
      {children}
    </ScannerContext.Provider>
  )
}

interface CameraScannerProps {
  onScan: (result: string) => void
  onError?: (error: string) => void
  className?: string
}

export function CameraScanner({ onScan, onError, className }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blockInfo, setBlockInfo] = useState<CameraBlockInfo | null>(null)
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  const stopCameraTracks = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
  }, [])

  const startScanning = useCallback(async () => {
    // 1. Cek secure context & dukungan browser SEBELUM menyentuh kamera.
    const pre = checkCameraPrerequisites()
    if (!pre.ok) {
      setBlockInfo(pre)
      setError(pre.title)
      onErrorRef.current?.(pre.title ?? "Kamera diblokir")
      setIsScanning(false)
      console.warn("[camera-scanner] blocked:", pre.code, pre.currentUrl)
      return
    }

    try {
      setError(null)
      setBlockInfo(null)
      const reader = new BrowserMultiFormatReader()
      codeReaderRef.current = reader

      const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices()

      if (videoInputDevices.length === 0) {
        const info = getCameraErrorInfo(new DOMException("No camera found", "NotFoundError"))
        setBlockInfo(info)
        setError(info.title)
        onErrorRef.current?.(info.title ?? "Tidak ada kamera")
        return
      }

      const selectedDeviceId = pickPreferredDeviceId(videoInputDevices)
      setIsScanning(true)

      if (videoRef.current) {
        await reader.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result) => {
            if (result) {
              const scannedValue = result.getText()
              onScanRef.current(scannedValue)
            }
          }
        )
      }
    } catch (err) {
      const info = getCameraErrorInfo(err)
      setBlockInfo(info)
      setError(info.title)
      onErrorRef.current?.(info.title ?? "Gagal memulai scanner")
      console.error("[camera-scanner] start failed:", err)
      setIsScanning(false)
    }
  }, [])

  const stopScanning = useCallback(() => {
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current = null
      } catch (err) {
        console.error("Error stopping scanner:", err)
      }
    }
    stopCameraTracks()
    setIsScanning(false)
  }, [stopCameraTracks])

  // Auto-start camera when component mounts
  useEffect(() => {
    startScanning()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      stopScanning()
    }
  }, [stopScanning])

  return (
    <div className={`${className ?? ""} relative`}>
      <video
        ref={videoRef}
        className="w-full h-full object-cover rounded-lg bg-gray-900"
        style={{ minHeight: "300px" }}
        autoPlay
        playsInline
        muted
      />
      {!isScanning && !error && (
        <div className="flex flex-col items-center justify-center absolute inset-0 bg-gray-900">
          <CameraIcon className="h-12 w-12 text-gray-500 mb-2" />
          <p className="text-sm text-gray-400">Memuat kamera...</p>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 overflow-y-auto bg-gray-800 rounded-lg p-3">
          {blockInfo ? (
            <CameraBlockAlert block={blockInfo} onRetry={startScanning} />
          ) : (
            <>
              <p className="text-sm text-red-500 text-center p-4">{error}</p>
              <div className="flex justify-center">
                <Button onClick={startScanning} variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white">
                  Coba Lagi
                </Button>
              </div>
            </>
          )}
        </div>
      )}
      {isScanning && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-48 h-48 border-2 border-gray-500 rounded-lg relative">
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-gray-300 rounded-tl-lg" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-gray-300 rounded-tr-lg" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-gray-300 rounded-bl-lg" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-gray-300 rounded-br-lg" />
          </div>
        </div>
      )}
    </div>
  )
}
