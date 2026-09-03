"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { useCurrency } from "@/hooks/useCurrency"
import { cn } from "@/lib/utils"

interface FormattedNumberInputProps extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> {
  value: string
  onValueChange: (rawValue: string) => void
  placeholder?: string
}

export function FormattedNumberInput({
  value,
  onValueChange,
  placeholder = "0",
  className,
  id,
  disabled,
  ...props
}: FormattedNumberInputProps) {
  const { formatNumber } = useCurrency()
  const inputRef = React.useRef<HTMLInputElement>(null)

  const displayValue = React.useMemo(() => {
    if (!value) return ""
    const num = parseInt(value, 10)
    if (isNaN(num)) return ""
    return formatNumber(num)
  }, [value, formatNumber])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value
    const cursorPos = e.target.selectionStart ?? rawInput.length
    const oldDisplay = e.target.value
    const oldLen = oldDisplay.length

    const rawValue = rawInput.replace(/\D/g, "")

    // If cleared
    if (!rawValue) {
      onValueChange("")
      return
    }

    const formatted = formatNumber(parseInt(rawValue, 10))
    const newLen = formatted.length
    const lengthDiff = newLen - oldLen

    onValueChange(rawValue)

    // Preserve cursor position after formatting
    requestAnimationFrame(() => {
      const input = inputRef.current || (document.getElementById(id || "") as HTMLInputElement | null)
      if (input) {
        // Calculate new cursor: old cursor + diff, clamped
        const newCursorPos = Math.max(0, Math.min(cursorPos + lengthDiff, newLen))
        try {
          input.setSelectionRange(newCursorPos, newCursorPos)
        } catch {
          // ignore for unsupported inputs
        }
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      const input = e.currentTarget
      const cursorPos = input.selectionStart ?? 0
      const selectionEnd = input.selectionEnd ?? 0
      // If there's a selection, default behavior handles it via onChange
      if (cursorPos !== selectionEnd) return
      const digitsBeforeCursor = input.value.substring(0, cursorPos).replace(/\D/g, "").length
      // If deleting the last remaining digit, clear the field
      if (digitsBeforeCursor <= 1 && input.value.replace(/\D/g, "").length <= 1) {
        // Let onChange handle via empty detection, but prevent leaving "0"
        // We'll allow clearing to empty string
      }
    }
  }

  return (
    <Input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={cn(className)}
      {...props}
    />
  )
}
