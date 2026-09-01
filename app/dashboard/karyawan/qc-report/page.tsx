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
    <div className="flex-1 space-y-4 p-4 md:p-6 pt-4">
      <PageHeader
        title="Laporan QC"
        description="Riwayat laporan quality control"
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Daftar Laporan QC</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
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
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative w-full sm:max-w-sm">
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
                className="w-full"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg">
                  {suggestions.map((sug, idx) => (
                    <button
                      key={idx}
                      className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
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
              <p>Belum ada laporan QC ditemukan.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">No</TableHead>
                  <TableHead>Nomor JO</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Berhasil</TableHead>
                  <TableHead>Reject</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow key={item.joNumber + item.nomor}>
                    <TableCell className="font-medium">{item.nomor}</TableCell>
                    <TableCell className="font-medium text-primary">{item.joNumber}</TableCell>
                    <TableCell>{item.tanggal}</TableCell>
                    <TableCell>{item.waktu}</TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800">{item.successQty}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-red-100 text-red-800">{item.rejectQty}</Badge>
                    </TableCell>
                    <TableCell>{item.totalQty}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{item.notes}</TableCell>
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