"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Input } from "@/components/ui/input"

interface KeyboardScannerProps {
  onScan: (result: string) => void
  placeholder?: string
  disabled?: boolean
  autoFocus?: boolean
  className?: string
}

export function KeyboardScanner({
  onScan,
  placeholder = "Scan barcode atau ketik manual...",
  disabled = false,
  autoFocus = true,
  className,
}: KeyboardScannerProps) {
  const [value, setValue] = useState("")
  const [buffer, setBuffer] = useState("")
  const bufferTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastKeyTimeRef = useRef<number>(0)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (disabled) return

    const currentTime = Date.now()
    const timeDiff = currentTime - lastKeyTimeRef.current
    lastKeyTimeRef.current = currentTime

    if (e.key === "Enter") {
      if (buffer.length > 0) {
        e.preventDefault()
        onScan(buffer)
        setBuffer("")
      } else if (value.length > 0) {
        e.preventDefault()
        onScan(value)
        setValue("")
      }
      return
    }

    if (bufferTimeoutRef.current) {
      clearTimeout(bufferTimeoutRef.current)
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (timeDiff < 50) {
        setBuffer((prev) => prev + e.key)
      } else {
        setBuffer(e.key)
      }

      bufferTimeoutRef.current = setTimeout(() => {
        setBuffer("")
      }, 100)
    }
  }, [disabled, buffer, value, onScan])

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      if (bufferTimeoutRef.current) {
        clearTimeout(bufferTimeoutRef.current)
      }
    }
  }, [handleKeyDown])

  const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.trim()) {
      onScan(value.trim())
      setValue("")
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <Input
        type="text"
        value={value}
        onChange={handleManualInput}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className="font-mono"
      />
      {buffer && (
        <p className="text-xs text-muted-foreground mt-1 font-mono">
          Buffer: {buffer}
        </p>
      )}
    </form>
  )
}

interface HiddenKeyboardScannerProps {
  onScan: (result: string) => void
  children?: React.ReactNode
  enabled?: boolean
}

export function HiddenKeyboardScanner({
  onScan,
  children,
  enabled = true,
}: HiddenKeyboardScannerProps) {
  const bufferRef = useRef("")
  const lastKeyTimeRef = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      const currentTime = Date.now()
      const timeDiff = currentTime - lastKeyTimeRef.current
      lastKeyTimeRef.current = currentTime

      if (e.key === "Enter" && bufferRef.current.length > 0) {
        e.preventDefault()
        onScan(bufferRef.current)
        bufferRef.current = ""
        return
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (timeDiff < 50) {
          bufferRef.current += e.key
        } else {
          bufferRef.current = e.key
        }

        timeoutRef.current = setTimeout(() => {
          bufferRef.current = ""
        }, 100)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [enabled, onScan])

  return <>{children}</>
}
