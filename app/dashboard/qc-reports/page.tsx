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
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="QC Reports"
        description="Laporan hasil quality control produksi"
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <ArrowPathIcon className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Laporan</CardTitle>
            <CheckIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "-" : stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hari Ini</CardTitle>
            <CheckIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "-" : stats.todayCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sukses</CardTitle>
            <CheckIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "-" : `${stats.totalSuccess} Pcs`}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reject</CardTitle>
            <XMarkIcon className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{loading ? "-" : `${stats.totalReject} Pcs`}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Daftar Laporan QC</CardTitle>
              <CardDescription>Riwayat laporan quality control</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[140px]">
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari JO number, nama employee, catatan..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="pl-9"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg overflow-hidden">
                {suggestions.map((s, i) => (
                  <button
                    key={`${s.type}-${s.value}-${i}`}
                    className="w-full px-4 py-2 text-left hover:bg-muted flex items-center gap-2 text-sm"
                    onClick={() => selectSuggestion(s.value)}
                  >
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      s.type === "joNumber" ? "bg-blue-100 text-blue-700" :
                      "bg-purple-100 text-purple-700"
                    }`}>
                      {s.type === "joNumber" ? "JO" : "Employee"}
                    </span>
                    <span className="font-medium">{s.label}</span>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead>JO Number</TableHead>
                  <TableHead>Sukses</TableHead>
                  <TableHead>Reject</TableHead>
                  <TableHead>QC Staff</TableHead>
                  <TableHead>Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(report.createdAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatTime(report.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {report.jobOrder?.joNumber || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-green-600 font-medium">
                      {report.successQty} Pcs
                    </TableCell>
                    <TableCell className={report.rejectQty > 0 ? "text-red-600 font-medium" : ""}>
                      {report.rejectQty > 0 ? `${report.rejectQty} Pcs` : "-"}
                    </TableCell>
                    <TableCell>{report.employee?.name || "-"}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {report.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
