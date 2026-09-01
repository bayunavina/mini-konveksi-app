import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-"
  const d = new Date(date)
  if (isNaN(d.getTime())) return "-"
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function formatDateLong(date: string | Date | null | undefined): string {
  if (!date) return "-"
  const d = new Date(date)
  if (isNaN(d.getTime())) return "-"
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return "-"
  const d = new Date(date)
  if (isNaN(d.getTime())) return "-"
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
  })
}

export function generateKode(prefix: string): string {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const last6 = timestamp.slice(-6)
  const random = Math.floor(Math.random() * 100).toString().padStart(2, "0")
  return `${prefix}-${random}${last6}`
}

export function generateKasbonCode(seq: number): string {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "")
  return `KB-${dateStr}-${seq.toString().padStart(3, "0")}`
}
