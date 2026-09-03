"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { PageHeader } from "@/components/shared"
import { ExportPrint } from "@/components/shared/export-print"
import { useFetch } from "@/hooks/useFetch"
import { useSessionWithRole } from "@/lib/use-session-with-role"

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

export default function KaryawanQCReportPage() {
  const { user } = useSessionWithRole()
  const [searchQuery, setSearchQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)

  const { data: reports, loading, refetch } = useFetch<QCReport[]>("/api/qc-reports")

  const myReports = useMemo(() => {
    if (!reports || !user?.employeeId) return []
    return reports.filter(r => r.employee?.id === user.employeeId)
  }, [reports, user?.employeeId])

  const enrichedData = useMemo(() => {
    return myReports.map((report, index) => ({
      nomor: index + 1,
      joNumber: report.jobOrder?.joNumber || "-",
      tanggal: new Date(report.createdAt).toLocaleDateString("id-ID"),
      waktu: new Date(report.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      successQty: report.successQty,
      rejectQty: report.rejectQty,
      totalQty: report.successQty + report.rejectQty,
      notes: report.notes || "-",
    }))
  }, [myReports])

  const filteredData = useMemo(() => {
    if (!searchQuery) return enrichedData
    const query = searchQuery.toLowerCase()
    return enrichedData.filter(item => 
      item.joNumber.toLowerCase().includes(query) ||
      item.notes.toLowerCase().includes(query)
    )
  }, [enrichedData, searchQuery])

  const suggestions = useMemo(() => {
    if (searchQuery.length < 2) return []
    const query = searchQuery.toLowerCase()
    const uniqueSuggestions = new Set<string>()
    
    enrichedData.forEach(item => {
      if (item.joNumber.toLowerCase().includes(query)) uniqueSuggestions.add(item.joNumber)
    })
    
    return Array.from(uniqueSuggestions).slice(0, 5)
  }, [enrichedData, searchQuery])

  return (
    <div className="flex-1 space-y-3 sm:space-y-4 p-3 sm:p-6 pt-4">
      <PageHeader
        title="Laporan QC"
        description="Riwayat laporan quality control"
      />

      <Card>
        <CardHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base sm:text-lg">Daftar Laporan QC</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => refetch()}>
                Refresh
              </Button>
              <ExportPrint
                columns={[
                  { key: "joNumber", label: "Nomor JO" },
                  { key: "tanggal", label: "Tanggal" },
                  { key: "successQty", label: "Berhasil" },
                  { key: "rejectQty", label: "Reject" },
                  { key: "totalQty", label: "Total" },
                ]}
                data={filteredData}
                title="Daftar Laporan QC"
                filename="laporan-qc"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-2 mb-4">
            <div className="relative w-full">
              <Input
                type="search"
                placeholder="Cari nomor JO..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setShowSuggestions(e.target.value.length >= 2)
                }}
                onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full text-base min-h-[44px]"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg overflow-hidden">
                  {suggestions.map((sug, idx) => (
                    <button
                      key={idx}
                      className="w-full text-left px-4 py-3 hover:bg-accent text-sm min-h-[44px]"
                      onClick={() => {
                        setSearchQuery(sug)
                        setShowSuggestions(false)
                      }}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-md" />
              ))}
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/20">
              <p className="text-sm">Belum ada laporan QC ditemukan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10 p-2 text-xs">No</TableHead>
                    <TableHead className="p-2 text-xs whitespace-nowrap">Nomor JO</TableHead>
                    <TableHead className="p-2 text-xs hidden md:table-cell">Tanggal</TableHead>
                    <TableHead className="p-2 text-xs hidden lg:table-cell">Waktu</TableHead>
                    <TableHead className="p-2 text-xs">Berhasil</TableHead>
                    <TableHead className="p-2 text-xs">Reject</TableHead>
                    <TableHead className="p-2 text-xs">Total</TableHead>
                    <TableHead className="p-2 text-xs hidden md:table-cell">Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item) => (
                    <TableRow key={item.joNumber + item.nomor}>
                      <TableCell className="font-medium p-2 text-xs">{item.nomor}</TableCell>
                      <TableCell className="font-medium text-primary p-2 text-xs whitespace-nowrap">{item.joNumber}</TableCell>
                      <TableCell className="p-2 text-xs hidden md:table-cell whitespace-nowrap">{item.tanggal}</TableCell>
                      <TableCell className="p-2 text-xs hidden lg:table-cell">{item.waktu}</TableCell>
                      <TableCell className="p-2">
                        <Badge className="bg-green-100 text-green-800">{item.successQty}</Badge>
                      </TableCell>
                      <TableCell className="p-2">
                        <Badge className="bg-red-100 text-red-800">{item.rejectQty}</Badge>
                      </TableCell>
                      <TableCell className="p-2 text-xs">{item.totalQty}</TableCell>
                      <TableCell className="p-2 max-w-[140px] truncate text-xs text-muted-foreground hidden md:table-cell">{item.notes}</TableCell>
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