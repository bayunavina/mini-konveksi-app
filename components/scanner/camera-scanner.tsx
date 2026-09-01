"use client"

import { useEffect, useRef, useCallback, useState, createContext, useContext } from "react"
import { BrowserMultiFormatReader } from "@zxing/browser"

interface ScannerContextType {
  lastResult: string | null
  isScanning: boolean
  error: string | null
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

export function ScannerProvider({ children }: ScannerProviderProps) {
  const [lastResult, setLastResult] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
    try {
      setError(null)
      const reader = new BrowserMultiFormatReader()
      codeReaderRef.current = reader
      
      const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices()
      
      if (videoInputDevices.length === 0) {
        setError("Tidak ada kamera yang ditemukan")
        return
      }

      const selectedDeviceId = videoInputDevices[0].deviceId
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
    } catch (_err) {
      setError("Gagal memulai scanner. Pastikan kamera diizinkan.")
      console.error(_err)
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
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null)

  const stopCameraTracks = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
  }, [])

  const startScanning = useCallback(async () => {
    try {
      setError(null)
      const reader = new BrowserMultiFormatReader()
      codeReaderRef.current = reader
      
      const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices()
      
      if (videoInputDevices.length === 0) {
        const err = "Tidak ada kamera yang ditemukan"
        setError(err)
        onError?.(err)
        return
      }

      const selectedDeviceId = videoInputDevices[0].deviceId
      setIsScanning(true)
      
      if (videoRef.current) {
        await reader.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result) => {
            if (result) {
              const scannedValue = result.getText()
              onScan(scannedValue)
            }
          }
        )
      }
    } catch {
      const errorMsg = "Gagal memulai scanner. Pastikan kamera diizinkan."
      setError(errorMsg)
      onError?.(errorMsg)
      setIsScanning(false)
    }
  }, [onScan, onError])

  // Auto-start camera when component mounts
  useEffect(() => {
    startScanning()
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

  useEffect(() => {
    return () => {
      stopScanning()
    }
  }, [stopScanning])

  return (
    <div className={`${className} relative`}>
      <video
        ref={videoRef}
        className="w-full h-full object-cover rounded-lg bg-black"
        style={{ minHeight: "300px" }}
        autoPlay
        playsInline
        muted
      />
      {!isScanning && !error && (
        <div className="flex flex-col items-center justify-center absolute inset-0 bg-muted/50">
          <CameraIcon className="h-12 w-12 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Memuat kamera...</p>
        </div>
      )}
      {error && (
        <div className="flex flex-col items-center justify-center absolute inset-0 bg-muted rounded-lg">
          <p className="text-sm text-red-500 text-center p-4">{error}</p>
          <Button onClick={startScanning} variant="outline" size="sm">
            Coba Lagi
          </Button>
        </div>
      )}
      {isScanning && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-48 h-48 border-2 border-primary rounded-lg relative">
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />
          </div>
        </div>
      )}
    </div>
  )
}

import { Button } from "@/components/ui/button"
import { CameraIcon } from "@heroicons/react/24/outline"
