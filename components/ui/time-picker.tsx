"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"))

function TimePicker({
  value,
  onChange,
  className,
}: {
  value?: string
  onChange?: (value: string) => void
  className?: string
}) {
  const parts = (value ?? "").split(":")
  const hour = parts[0] ?? "08"
  const minute = parts[1] ?? "00"

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select value={hour} onValueChange={(h) => onChange?.(`${h}:${minute}`)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Jam" />
        </SelectTrigger>
        <SelectContent className="max-h-56">
          {HOURS.map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground">:</span>
      <Select
        value={minute}
        onValueChange={(m) => onChange?.(`${hour}:${m}`)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Menit" />
        </SelectTrigger>
        <SelectContent className="max-h-56">
          {MINUTES.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export { TimePicker }