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
    <div className="flex-1 space-y-4 p-4 md:p-6 pt-4">
      <PageHeader
        title="Produksi Saya"
        description="Daftar job order yang dikerjakan"
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Daftar Job Order</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
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
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative w-full sm:max-w-sm">
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
              <p>Belum ada Job Order ditemukan.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">No</TableHead>
                  <TableHead>Nomor JO</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Produk / SKU</TableHead>
                  <TableHead>Target / Selesai</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow key={item.no}>
                    <TableCell className="font-medium">{item.nomor}</TableCell>
                    <TableCell className="font-medium text-primary">{item.no}</TableCell>
                    <TableCell>{item.tanggal}</TableCell>
                    <TableCell>{item.waktu}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{item.produk}</span>
                        <span className="text-xs text-muted-foreground">{item.sku}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.selesai} / {item.target}
                    </TableCell>
                    <TableCell>
                      <div className="w-[80px] flex items-center gap-2">
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary"
                            style={{ width: `${Math.min((item.selesai / (item.target || 1)) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs">{Math.round((item.selesai / (item.target || 1)) * 100)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(item.status)}>
                        {getStatusLabel(item.status)}
                      </Badge>
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