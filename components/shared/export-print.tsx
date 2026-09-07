"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PrinterIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline"

interface Column {
  key: string
  label: string
}

interface SummaryRow {
  label: string
  value: string | number
}

interface ExportPrintProps {
  columns: Column[]
  data: Record<string, unknown>[]
  title?: string
  filename?: string
  summary?: SummaryRow[]
  summaryTitle?: string
  className?: string
}

interface CompanyInfo {
  name: string
  address: string
  phone: string
  email: string
}

const STORAGE_KEY = "company_info"

const defaultCompanyInfo: CompanyInfo = {
  name: "PT Konveksi Maju Jaya",
  address: "Jl. Industri No. 123, Jakarta Pusat",
  phone: "021-12345678",
  email: "info@konveksimajujaya.com",
}

export function ExportPrint({ columns, data, title, filename, summary, summaryTitle, className }: ExportPrintProps) {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(defaultCompanyInfo)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setCompanyInfo(JSON.parse(stored))
      } catch (e) {
        console.error("Failed to parse company info:", e)
      }
    }
  }, [])

  const handleExportCSV = () => {
    const headers = columns.map(c => c.label).join(",")
    const rows = data.map(row => 
      columns.map(c => {
        const value = row[c.key]
        if (value === null || value === undefined) return ""
        if (typeof value === "string" && value.includes(",")) return `"${value}"`
        return String(value)
      }).join(",")
    )

    const csv = [headers, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `${filename || "data"}-${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const handlePrint = () => {
    let summaryTableHtml = ""
    if (summary && summary.length > 0) {
      summaryTableHtml = `
        <div style="page-break-before: auto; margin-top: 30px;">
          <h2 style="font-size: 16px; margin-bottom: 10px;">${summaryTitle || "Ringkasan"}</h2>
          <table style="width: auto; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="border: 1px solid #ddd; padding: 10px; background-color: #e8f4ea; text-align: left;">Kategori</th>
                <th style="border: 1px solid #ddd; padding: 10px; background-color: #e8f4ea; text-align: center;">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              ${summary.map(s => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 10px;">${s.label}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">${s.value}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `
    }

    const now = mounted ? new Date() : new Date("2026-01-01T12:00:00")
    const dateStr = now.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })
    const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title || "Data"}</title>
          <style>
            :root {
              --background: #ffffff;
              --foreground: #333333;
              --muted: #f5f5f5;
              --muted-foreground: #666666;
              --border: #e5e7eb;
              --success-light: #f0fdf4;
              --success-foreground: #166534;
              --destructive: #ef4444;
            }
            * { text-decoration: none !important; }
            body { font-family: Arial, sans-serif; padding: 20px; }
            .company-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid var(--foreground); padding-bottom: 15px; }
            .company-header h1 { font-size: 20px; margin: 0 0 5px 0; }
            .company-header p { font-size: 12px; margin: 2px 0; color: var(--muted-foreground); }
            h1 { font-size: 18px; margin-bottom: 5px; }
            h2 { font-size: 14px; margin-bottom: 5px; }
            .date { color: var(--muted-foreground); font-size: 12px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid var(--border); padding: 8px; text-align: left; }
            th { background-color: var(--muted); font-weight: bold; }
            tr:nth-child(even) { background-color: var(--muted); }
            .footer { margin-top: 20px; font-size: 10px; color: var(--muted-foreground); text-align: center; }
            a { color: inherit !important; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="company-header">
            <h1>${companyInfo.name}</h1>
            <p>${companyInfo.address}</p>
            <p>Telp: ${companyInfo.phone} | Email: ${companyInfo.email}</p>
          </div>
          <h1>${title || "Data"}</h1>
          <p class="date">Dicetak: ${dateStr} ${timeStr}</p>
          <table>
            <thead>
              <tr>${columns.map(c => `<th>${c.label}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${data.map(row => 
                `<tr>${columns.map(c => {
                  const value = row[c.key]
                  return `<td>${value ?? "-"}</td>`
                }).join("")}</tr>`
              ).join("")}
            </tbody>
          </table>
          ${summaryTableHtml}
          <p class="footer">ERP Konveksi - ${dateStr}</p>
          <script>window.print();</script>
        </body>
      </html>
    `
    
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
    }
  }

  if (!mounted) {
    return (
      <Button variant="outline" disabled className={className}>
        <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
        Export
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={className}>
          <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCSV}>
          <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
          Export CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePrint}>
          <PrinterIcon className="mr-2 h-4 w-4" />
          Print / Cetak
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
