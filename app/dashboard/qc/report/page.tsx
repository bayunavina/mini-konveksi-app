"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader } from "@/components/shared"
import { MagnifyingGlassIcon, ArrowPathIcon, CheckIcon, XMarkIcon, ArrowDownTrayIcon, PrinterIcon, ArrowLeftIcon } from "@heroicons/react/24/outline"
import * as XLSX from "xlsx"
import { useFetch } from "@/hooks/useFetch"
import { formatDate } from "@/lib/utils"

interface QCReport {
  id: string
  successQty: number
  rejectQty: number
  notes: string | null
  createdAt: string
  jobOrder: {
    id: string
    joNumber: string
  }
  employee: {
    id: string
    name: string
  } | null
}

export default function QCReportPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [dateFilter, setDateFilter] = useState<string>("all")
  const { data: reports, loading, error, refetch } = useFetch<QCReport[]>("/api/qc-reports")

  const filteredReports = (reports || []).filter((report) => {
    const matchesSearch = 
      report.jobOrder?.joNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.employee?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.notes?.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (dateFilter === "all") return matchesSearch
    
    if (dateFilter === "today") {
      const today = new Date().toDateString()
      const reportDate = new Date(report.createdAt).toDateString()
      return matchesSearch && today === reportDate
    }
    
    if (dateFilter === "week") {
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const reportDate = new Date(report.createdAt)
      return matchesSearch && reportDate >= weekAgo
    }
    
    if (dateFilter === "month") {
      const now = new Date()
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const reportDate = new Date(report.createdAt)
      return matchesSearch && reportDate >= monthAgo
    }
    
    return matchesSearch
  })

  const getSuggestions = () => {
    if (!searchQuery || searchQuery.length < 2) return []
    
    const suggestions: { type: string; value: string; label: string }[] = []
    const seen = new Set<string>()
    
    ;(reports || []).forEach((report) => {
      const joNumber = report.jobOrder?.joNumber
      if (joNumber && joNumber.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(joNumber)) {
        seen.add(joNumber)
        suggestions.push({ type: "joNumber", value: joNumber, label: joNumber })
      }
      const productName = report.employee?.name
      if (productName && productName.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(productName)) {
        seen.add(productName)
        suggestions.push({ type: "employee", value: productName, label: productName })
      }
    })
    
    return suggestions.slice(0, 10)
  }

  const suggestions = getSuggestions()

  const selectSuggestion = (value: string) => {
    setSearchQuery(value)
    setShowSuggestions(false)
  }

  const stats = reports ? {
    total: reports.length,
    totalSuccess: reports.reduce((sum, r) => sum + (r.successQty || 0), 0),
    totalReject: reports.reduce((sum, r) => sum + (r.rejectQty || 0), 0),
    todayCount: reports.filter(r => new Date(r.createdAt).toDateString() === new Date().toDateString()).length,
  } : { total: 0, totalSuccess: 0, totalReject: 0, todayCount: 0 }

  const handleExportExcel = () => {
    const dateStr = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-")
    
    const dataToExport = filteredReports.map((report, index) => ({
      No: index + 1,
      Tanggal: formatDate(report.createdAt),
      "No. JO": report.jobOrder?.joNumber || "-",
      "QC Pass (Pcs)": report.successQty,
      "QC Reject (Pcs)": report.rejectQty,
      "QC Staff": report.employee?.name || "-",
      Catatan: report.notes || "-",
    }))

    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "QC Reports")

    const colWidths = [
      { wch: 6 },
      { wch: 15 },
      { wch: 18 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 35 },
    ]
    ws["!cols"] = colWidths

    XLSX.writeFile(wb, `QC_Report_${dateStr}.xlsx`)
  }

  const handlePrint = () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const totalSuccess = filteredReports.reduce((sum, r) => sum + (r.successQty || 0), 0)
    const totalReject = filteredReports.reduce((sum, r) => sum + (r.rejectQty || 0), 0)

    const tableRows = filteredReports.map((report, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${formatDate(report.createdAt)}</td>
        <td>${report.jobOrder?.joNumber || "-"}</td>
        <td class="text-right">${report.successQty}</td>
        <td class="text-right">${report.rejectQty}</td>
        <td>${report.employee?.name || "-"}</td>
        <td>${report.notes || "-"}</td>
      </tr>
    `).join("")

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Laporan QC Reports - ERP Konveksi</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 15mm;
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', 'Calibri', Arial, sans-serif; 
              font-size: 11px;
              padding: 15px;
              background: #fff;
            }
            .report-header {
              text-align: center;
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 2px solid #333;
            }
            .report-header h1 { 
              font-size: 18px; 
              margin-bottom: 5px; 
              color: #333;
            }
            .report-header p { 
              font-size: 11px; 
              color: #666; 
            }
            .report-table { 
              width: 100%; 
              border-collapse: collapse; 
              font-size: 11px;
              margin-bottom: 20px;
            }
            .report-table thead {
              display: table-header-group;
            }
            .report-table th,
            .report-table td { 
              border: 1px solid #333;
              padding: 8px 10px; 
              vertical-align: middle;
              text-align: center;
            }
            .report-table th { 
              background-color: #f5f5f5; 
              font-weight: 600; 
              font-size: 11px;
            }
            .report-table td { 
              font-size: 11px;
            }
            .report-table tbody tr:nth-child(even) { 
              background-color: #fafafa; 
            }
            .summary-section {
              margin-top: 20px;
              padding: 15px;
              background-color: #f9f9f9;
              border: 1px solid #ddd;
              border-radius: 4px;
            }
            .summary-section h3 {
              font-size: 12px;
              margin-bottom: 10px;
              color: #333;
            }
            .summary-grid {
              display: flex;
              gap: 30px;
              flex-wrap: wrap;
            }
            .summary-item {
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .summary-label {
              font-size: 11px;
              color: #666;
            }
            .summary-value {
              font-size: 14px;
              font-weight: 600;
              color: #333;
            }
            .summary-value.success { color: #22c55e; }
            .summary-value.reject { color: #ef4444; }
            .report-footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 1px solid #ddd;
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              color: #666;
            }
            @media print {
              body { padding: 0; }
              .report-table { page-break-inside: auto; }
              .report-table tr { page-break-inside: avoid; page-break-after: auto; }
            }
          </style>
        </head>
        <body>
          <div class="report-header">
            <h1>QC Report ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })}</h1>
            <p>ERP Konveksi App | Dicetak: ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
          </div>

          <table class="report-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>No. JO</th>
                <th>Sukses (Pcs)</th>
                <th>Reject (Pcs)</th>
                <th>QC Staff</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="summary-section">
            <h3>RINGKASAN</h3>
            <div class="summary-grid">
              <div class="summary-item">
                <span class="summary-label">Total Laporan:</span>
                <span class="summary-value">${filteredReports.length}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Total Sukses:</span>
                <span class="summary-value success">${totalSuccess} Pcs</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Total Reject:</span>
                <span class="summary-value reject">${totalReject} Pcs</span>
              </div>
            </div>
          </div>

          <div class="report-footer">
            <span>Dokumen ini dicetak dari ERP Konveksi App</span>
            <span>Halaman 1</span>
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

  return (
    <div className="flex-1 space-y-3 sm:space-y-4 p-3 sm:p-6 pt-4">
      <PageHeader
        title="QC Reports"
        description="Laporan hasil quality control produksi"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={filteredReports.length === 0} className="min-h-[44px] px-3">
              <PrinterIcon className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Print</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={filteredReports.length === 0} className="min-h-[44px] px-3">
              <ArrowDownTrayIcon className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.location.href = "/dashboard/qc"} className="min-h-[44px] px-3">
              <ArrowLeftIcon className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Kembali</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="min-h-[44px] px-3">
              <ArrowPathIcon className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Total Laporan</p>
              <div className="text-xl sm:text-2xl font-bold">{loading ? "-" : stats.total}</div>
            </div>
            <CheckIcon className="h-5 w-5 text-muted-foreground shrink-0" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Hari Ini</p>
              <div className="text-xl sm:text-2xl font-bold">{loading ? "-" : stats.todayCount}</div>
            </div>
            <CheckIcon className="h-5 w-5 text-green-600 shrink-0" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Total Sukses</p>
              <div className="text-xl sm:text-2xl font-bold">{loading ? "-" : `${stats.totalSuccess} Pcs`}</div>
            </div>
            <CheckIcon className="h-5 w-5 text-green-600 shrink-0" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Total Reject</p>
              <div className="text-xl sm:text-2xl font-bold text-red-600">{loading ? "-" : `${stats.totalReject} Pcs`}</div>
            </div>
            <XMarkIcon className="h-5 w-5 text-red-600 shrink-0" />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg">Daftar Laporan QC</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Riwayat laporan quality control</CardDescription>
            </div>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-[140px] h-10 text-base">
                <SelectValue placeholder="Filter waktu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="today">Hari Ini</SelectItem>
                <SelectItem value="week">7 Hari</SelectItem>
                <SelectItem value="month">30 Hari</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="relative mb-4">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari JO, employee, catatan..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="pl-9 text-base"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg overflow-hidden">
                {suggestions.map((s, i) => (
                  <button
                    key={`${s.type}-${s.value}-${i}`}
                    className="w-full px-4 py-3 text-left hover:bg-muted flex items-center gap-2 text-sm min-h-[44px]"
                    onClick={() => selectSuggestion(s.value)}
                  >
                    <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${
                      s.type === "joNumber" ? "bg-blue-100 text-blue-700" :
                      s.type === "employee" ? "bg-purple-100 text-purple-700" :
                      "bg-green-100 text-green-700"
                    }`}>
                      {s.type === "joNumber" ? "JO" : s.type === "employee" ? "Employee" : "Other"}
                    </span>
                    <span className="font-medium truncate">{s.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <p>Gagal memuat data</p>
              <Button variant="outline" className="mt-2 min-h-[44px]" onClick={() => refetch()}>
                Coba Lagi
              </Button>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Belum ada laporan QC</p>
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-md">
              <Table id="qc-report-table">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-center w-10 p-2 text-xs">No</TableHead>
                    <TableHead className="text-center p-2 text-xs whitespace-nowrap">Tanggal</TableHead>
                    <TableHead className="text-center p-2 text-xs whitespace-nowrap">No. JO</TableHead>
                    <TableHead className="text-center p-2 text-xs">Sukses</TableHead>
                    <TableHead className="text-center p-2 text-xs">Reject</TableHead>
                    <TableHead className="text-center p-2 text-xs whitespace-nowrap hidden sm:table-cell">QC Staff</TableHead>
                    <TableHead className="text-center p-2 text-xs hidden md:table-cell">Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report, index) => (
                    <TableRow key={report.id} className="hover:bg-muted/30">
                      <TableCell className="text-center p-2 font-medium">{index + 1}</TableCell>
                      <TableCell className="text-center p-2 text-xs whitespace-nowrap">
                        {formatDate(report.createdAt)}
                      </TableCell>
                      <TableCell className="text-center p-2">
                        <Badge variant="outline" className="font-mono">
                          {report.jobOrder?.joNumber || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center p-2 text-green-600 font-semibold text-sm">
                        {report.successQty}
                      </TableCell>
                      <TableCell className={`text-center p-2 font-semibold text-sm ${report.rejectQty > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                        {report.rejectQty}
                      </TableCell>
                      <TableCell className="text-center p-2 text-xs hidden sm:table-cell">{report.employee?.name || "-"}</TableCell>
                      <TableCell className="text-center p-2 text-xs text-muted-foreground max-w-[120px] truncate hidden md:table-cell">
                        {report.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {filteredReports.length > 0 && (
            <div className="mt-4 p-3 sm:p-4 bg-muted/30 rounded-lg border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
                <span className="text-muted-foreground text-xs sm:text-sm">
                  Menampilkan <span className="font-semibold">{filteredReports.length}</span> data
                </span>
                <div className="flex gap-4 text-xs sm:text-sm">
                  <span>Total Sukses: <span className="font-semibold text-green-600">{stats.totalSuccess} Pcs</span></span>
                  <span>Total Reject: <span className="font-semibold text-red-600">{stats.totalReject} Pcs</span></span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
