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
import { MagnifyingGlassIcon, ArrowPathIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline"
import { useFetch } from "@/hooks/useFetch"
import { formatDate } from "@/lib/utils"

const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: true })
}

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

export default function QCReportsPage() {
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
      const employeeName = report.employee?.name
      if (employeeName && employeeName.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(employeeName)) {
        seen.add(employeeName)
        suggestions.push({ type: "employee", value: employeeName, label: employeeName })
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

  return (
    <div className="flex-1 space-y-3 sm:space-y-4 p-3 sm:p-6 pt-4">
      <PageHeader
        title="QC Reports"
        description="Laporan hasil quality control produksi"
        actions={
          <Button variant="outline" size="lg" onClick={() => refetch()} className="px-3">
            <ArrowPathIcon className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
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
              <SelectTrigger className="w-full sm:w-[140px]">
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
                      "bg-purple-100 text-purple-700"
                    }`}>
                      {s.type === "joNumber" ? "JO" : "Employee"}
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
              <Button variant="outline" className="mt-2" onClick={() => refetch()}>
                Coba Lagi
              </Button>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Belum ada laporan QC</p>
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-center p-2 text-xs whitespace-nowrap">Tanggal</TableHead>
                    <TableHead className="text-center p-2 text-xs whitespace-nowrap">Waktu</TableHead>
                    <TableHead className="text-center p-2 text-xs whitespace-nowrap">JO Number</TableHead>
                    <TableHead className="text-center p-2 text-xs">Sukses</TableHead>
                    <TableHead className="text-center p-2 text-xs">Reject</TableHead>
                    <TableHead className="text-center p-2 text-xs hidden md:table-cell">QC Staff</TableHead>
                    <TableHead className="text-center p-2 text-xs hidden lg:table-cell">Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.id} className="hover:bg-muted/30">
                      <TableCell className="text-center p-2 text-xs whitespace-nowrap">
                        {formatDate(report.createdAt)}
                      </TableCell>
                      <TableCell className="text-center p-2 text-xs text-muted-foreground whitespace-nowrap">
                        {formatTime(report.createdAt)}
                      </TableCell>
                      <TableCell className="text-center p-2">
                        <Badge variant="outline" className="font-mono whitespace-nowrap">
                          {report.jobOrder?.joNumber || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center p-2 text-green-600 font-medium text-sm">
                        {report.successQty} Pcs
                      </TableCell>
                      <TableCell className={`text-center p-2 text-sm ${report.rejectQty > 0 ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                        {report.rejectQty > 0 ? `${report.rejectQty} Pcs` : "-"}
                      </TableCell>
                      <TableCell className="text-center p-2 text-xs hidden md:table-cell">{report.employee?.name || "-"}</TableCell>
                      <TableCell className="text-center p-2 text-xs text-muted-foreground max-w-[120px] truncate hidden lg:table-cell">
                        {report.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
