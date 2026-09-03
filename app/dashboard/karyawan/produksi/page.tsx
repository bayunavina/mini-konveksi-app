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

interface JobOrder {
  id: string
  joNumber: string
  targetQty: number
  completedQty: number
  rejectedQty: number
  status: string
  createdAt: string
  product: {
    id: string
    name: string
    sku: string
  } | null
}

interface Assignment {
  id: string
  jobOrderId: string | null
  targetQty: number
  completedQty: number
  acceptedQty: number
  status: string
  assignedAt: string
  jobOrder: {
    id: string
    joNumber: string
    status?: string
    createdAt?: string
  } | null
  product: {
    id: string
    name: string
    code: string
  } | null
}

export default function KaryawanProduksiPage() {
  const { user } = useSessionWithRole()
  const [searchQuery, setSearchQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)

  const { data: response, loading, refetch } = useFetch<{
    data: JobOrder[]
    pagination: { hasMore: boolean; limit: number; offset: number }
  }>(`/api/job-orders?limit=100`)

  const { data: assignments } = useFetch<Assignment[]>(
    user?.employeeId ? `/api/production/assign?employeeId=${user.employeeId}` : null
  )

  const jobOrders = response?.data || []
  const userAssignments = (assignments || []).filter(a => a.jobOrderId)

  const myJobOrders = useMemo(() => {
    const myJoIds = new Set(userAssignments.map(a => a.jobOrderId))
    return jobOrders.filter(jo => myJoIds.has(jo.id))
  }, [jobOrders, userAssignments])

  const enrichedData = useMemo(() => {
    return myJobOrders.map((jo, index) => {
      const assignment = userAssignments.find(a => a.jobOrderId === jo.id)
      const assignmentAccepted = assignment?.acceptedQty || 0
      
      return {
        nomor: index + 1,
        no: jo.joNumber,
        nama: user?.name || "-",
        jo: jo.joNumber,
        tanggal: new Date(jo.createdAt).toLocaleDateString("id-ID"),
        waktu: new Date(jo.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        produk: jo.product?.name || "-",
        sku: jo.product?.sku || "-",
        target: jo.targetQty,
        selesai: assignmentAccepted,
        status: jo.status,
        productName: jo.product?.name || "-",
        productSku: jo.product?.sku || "-",
      }
    })
  }, [myJobOrders, userAssignments, user])

  const filteredData = useMemo(() => {
    if (!searchQuery) return enrichedData
    const query = searchQuery.toLowerCase()
    return enrichedData.filter(item => 
      item.no.toLowerCase().includes(query) ||
      item.produk.toLowerCase().includes(query) ||
      item.sku.toLowerCase().includes(query) ||
      item.status.toLowerCase().includes(query)
    )
  }, [enrichedData, searchQuery])

  const suggestions = useMemo(() => {
    if (searchQuery.length < 2) return []
    const query = searchQuery.toLowerCase()
    const uniqueSuggestions = new Set<string>()
    
    enrichedData.forEach(item => {
      if (item.no.toLowerCase().includes(query)) uniqueSuggestions.add(item.no)
      if (item.produk.toLowerCase().includes(query)) uniqueSuggestions.add(item.produk)
      if (item.sku.toLowerCase().includes(query)) uniqueSuggestions.add(item.sku)
    })
    
    return Array.from(uniqueSuggestions).slice(0, 5)
  }, [enrichedData, searchQuery])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT": return "bg-gray-100 text-gray-800"
      case "APPROVED": return "bg-blue-100 text-blue-800"
      case "IN_PROGRESS": return "bg-yellow-100 text-yellow-800"
      case "QC_PENDING": return "bg-orange-100 text-orange-800"
      case "COMPLETED": return "bg-green-100 text-green-800"
      case "HOLD": return "bg-purple-100 text-purple-800"
      case "CANCELLED": return "bg-gray-100 text-gray-600"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "DRAFT": return "Draft"
      case "APPROVED": return "Disetujui"
      case "IN_PROGRESS": return "Produksi"
      case "QC_PENDING": return "Menunggu QC"
      case "COMPLETED": return "Selesai"
      case "HOLD": return "Hold"
      case "CANCELLED": return "Dibatalkan"
      default: return status
    }
  }

  return (
    <div className="flex-1 space-y-3 sm:space-y-4 p-3 sm:p-6 pt-4">
      <PageHeader
        title="Produksi Saya"
        description="Daftar job order yang dikerjakan"
      />

      <Card>
        <CardHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base sm:text-lg">Daftar Job Order</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => refetch()}>
                Refresh
              </Button>
              <ExportPrint
                columns={[
                  { key: "no", label: "Nomor JO" },
                  { key: "produk", label: "Produk" },
                  { key: "sku", label: "SKU" },
                  { key: "target", label: "Target" },
                  { key: "selesai", label: "Selesai" },
                  { key: "status", label: "Status" },
                ]}
                data={filteredData.map(item => ({
                  ...item,
                  status: getStatusLabel(item.status),
                }))}
                title="Daftar Job Order Produksi Saya"
                filename="produksi-saya"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-2 mb-4">
            <div className="relative w-full">
              <Input
                type="search"
                placeholder="Cari JO, produk, atau SKU..."
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
              <p className="text-sm">Belum ada Job Order ditemukan.</p>
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
                    <TableHead className="p-2 text-xs">Produk</TableHead>
                    <TableHead className="p-2 text-xs">Target</TableHead>
                    <TableHead className="p-2 text-xs hidden md:table-cell">Progress</TableHead>
                    <TableHead className="p-2 text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item) => (
                    <TableRow key={item.no}>
                      <TableCell className="font-medium p-2 text-xs">{item.nomor}</TableCell>
                      <TableCell className="font-medium text-primary p-2 text-xs whitespace-nowrap">{item.no}</TableCell>
                      <TableCell className="p-2 text-xs hidden md:table-cell">{item.tanggal}</TableCell>
                      <TableCell className="p-2 text-xs hidden lg:table-cell">{item.waktu}</TableCell>
                      <TableCell className="p-2">
                        <div className="flex flex-col">
                          <span className="font-medium text-xs truncate-1 max-w-[120px]">{item.produk}</span>
                          <span className="text-[10px] text-muted-foreground">{item.sku}</span>
                        </div>
                      </TableCell>
                      <TableCell className="p-2 text-xs">
                        <div className="flex flex-col">
                          <span>{item.selesai} / {item.target}</span>
                          <div className="md:hidden w-full h-1 bg-muted rounded-full overflow-hidden mt-1">
                            <div 
                              className="h-full bg-primary" 
                              style={{ width: `${Math.min((item.selesai / (item.target || 1)) * 100, 100)}%` }} 
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="p-2 hidden md:table-cell">
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary"
                              style={{ width: `${Math.min((item.selesai / (item.target || 1)) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs whitespace-nowrap">{Math.round((item.selesai / (item.target || 1)) * 100)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="p-2">
                        <Badge className={`${getStatusColor(item.status)} whitespace-nowrap`}>
                          {getStatusLabel(item.status)}
                        </Badge>
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