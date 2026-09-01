"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader } from "@/components/shared"
import { ExportPrint } from "@/components/shared/export-print"
import { MagnifyingGlassIcon, ArrowLeftIcon, PlusIcon, ArrowPathIcon, UserIcon, CubeIcon } from "@heroicons/react/24/outline"
import { useFetch } from "@/hooks/useFetch"
import { useCurrency } from "@/hooks/useCurrency"
import { toast } from "sonner"

interface Employee {
  id: string
  name: string
  email: string
  role: string
}

interface MaterialLot {
  id: string
  lotNumber: string
  qrCode: string
  quantity: number
  product?: {
    id: string
    name: string
    sku: string
  }
}

interface Assignment {
  id: string
  targetQty: number
  completedQty: number
  rejectedQty: number
  acceptedQty: number
  ratePerUnit: string
  totalSalary: number
  status: string
  notes: string
  assignedAt: string
  startedAt: string
  completedAt: string
  employee?: Employee
  materialLot?: MaterialLot
  product?: {
    id: string
    name: string
    sku: string
  }
}

export default function AssignmentsPage() {
  const { formatCurrency, currencySymbol } = useCurrency()
  const [searchQuery, setSearchQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    employeeId: "",
    materialLotId: "",
    targetQty: "",
    ratePerUnit: "",
    notes: "",
  })

  const { data: employees } = useFetch<Employee[]>("/api/employees")
  const { data: lots } = useFetch<MaterialLot[]>("/api/material-lots")
  const { data: assignments, loading, refetch } = useFetch<Assignment[]>("/api/production/assign")

  const filteredAssignments = (assignments || []).filter((a) => {
    const matchesSearch =
      a.employee?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.materialLot?.lotNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.product?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || a.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getSuggestions = () => {
    if (!searchQuery || searchQuery.length < 2) return []
    
    const suggestions: { type: string; value: string; label: string }[] = []
    const seen = new Set<string>()
    
    ;(assignments || []).forEach((a) => {
      if (a.employee?.name?.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(a.employee.name)) {
        seen.add(a.employee.name)
        suggestions.push({ type: "employee", value: a.employee.name, label: a.employee.name })
      }
    })
    
    ;(assignments || []).forEach((a) => {
      if (a.materialLot?.lotNumber?.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(a.materialLot.lotNumber)) {
        seen.add(a.materialLot.lotNumber)
        suggestions.push({ type: "lot", value: a.materialLot.lotNumber, label: a.materialLot.lotNumber })
      }
    })
    
    ;(assignments || []).forEach((a) => {
      if (a.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(a.product.name)) {
        seen.add(a.product.name)
        suggestions.push({ type: "product", value: a.product.name, label: a.product.name })
      }
    })
    
    return suggestions.slice(0, 10)
  }

  const suggestions = getSuggestions()

  const selectSuggestion = (value: string) => {
    setSearchQuery(value)
    setShowSuggestions(false)
  }

  const handleAddAssignment = async () => {
    if (!formData.employeeId || !formData.materialLotId || !formData.targetQty) {
      toast.error("Lengkapi form terlebih dahulu")
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/production/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: formData.employeeId,
          materialLotId: formData.materialLotId,
          targetQty: parseInt(formData.targetQty),
          ratePerUnit: parseFloat(formData.ratePerUnit) || 0,
          notes: formData.notes,
        }),
      })

      if (response.ok) {
        toast.success("Job berhasil di-assign ke karyawan")
        setAddDialogOpen(false)
        setFormData({ employeeId: "", materialLotId: "", targetQty: "", ratePerUnit: "", notes: "" })
        refetch()
      } else {
        toast.error("Gagal membuat assignment")
      }
    } catch (error) {
      console.error("Error creating assignment:", error)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ASSIGNED":
        return <Badge className="bg-blue-100 text-blue-800">Assigned</Badge>
      case "IN_PROGRESS":
        return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>
      case "COMPLETED":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-"
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Assignment Produksi"
        description="Assign job produksi ke karyawan"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/production">
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Kembali
              </Link>
            </Button>
            <Button onClick={() => setAddDialogOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Assign Job
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Daftar Assignment</CardTitle>
              <CardDescription>Monitoring job yang di-assign ke karyawan</CardDescription>
            </div>
            <ExportPrint
              columns={[
                { key: "employee", label: "Karyawan" },
                { key: "product", label: "Produk" },
                { key: "target", label: "Target" },
                { key: "completed", label: "Completed" },
                { key: "rejected", label: "Rejected" },
                { key: "accepted", label: "Accepted" },
                { key: "rate", label: "Rate" },
                { key: "gaji", label: "Gaji" },
                { key: "status", label: "Status" },
                { key: "date", label: "Tanggal" },
              ]}
              data={filteredAssignments.map(a => ({
                employee: a.employee?.name || "-",
                product: a.product?.name || "-",
                target: a.targetQty,
                completed: a.completedQty,
                rejected: a.rejectedQty > 0 ? a.rejectedQty : "-",
                accepted: a.acceptedQty,
                rate: formatCurrency(parseFloat(a.ratePerUnit || "0")),
                gaji: formatCurrency(a.totalSalary),
                status: a.status,
                date: formatDate(a.assignedAt),
              }))}
              title="Daftar Assignment Produksi"
              filename="assignment-produksi"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari karyawan atau produk..."
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
                        s.type === "employee" ? "bg-blue-100 text-blue-700" :
                        s.type === "lot" ? "bg-purple-100 text-purple-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {s.type === "employee" ? "Karyawan" : s.type === "lot" ? "Lot" : "Produk"}
                      </span>
                      <span className="font-medium">{s.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CubeIcon className="mx-auto h-12 w-12 mb-4 text-muted-foreground/50" />
              <p>Belum ada assignment</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-y">
                  <TableHead>Karyawan</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-center">Target</TableHead>
                  <TableHead className="text-center">Completed</TableHead>
                  <TableHead className="text-center">Rejected</TableHead>
                  <TableHead className="text-center">Accepted</TableHead>
                  <TableHead className="text-center">Rate</TableHead>
                  <TableHead className="text-center">Gaji</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Tanggal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.map((a) => (
                  <TableRow key={a.id} className="border-y-0">
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{a.employee?.name || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div>
                        <p className="font-medium">{a.product?.name || "-"}</p>
                        <p className="text-xs text-muted-foreground">{a.materialLot?.lotNumber}</p>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-center font-medium">{a.targetQty}</TableCell>
                    <TableCell className="py-2 text-center">{a.completedQty}</TableCell>
                    <TableCell className="py-2 text-center text-red-500">{a.rejectedQty > 0 ? a.rejectedQty : "-"}</TableCell>
                    <TableCell className="py-2 text-center font-medium text-green-600">{a.acceptedQty}</TableCell>
                    <TableCell className="py-2 text-center text-sm">{formatCurrency(parseFloat(a.ratePerUnit || "0"))}</TableCell>
                    <TableCell className="py-2 text-center font-medium">{formatCurrency(a.totalSalary)}</TableCell>
                    <TableCell className="py-2 text-center">{getStatusBadge(a.status)}</TableCell>
                    <TableCell className="py-2 text-center text-sm text-muted-foreground">
                      {formatDate(a.assignedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Job ke Karyawan</DialogTitle>
            <DialogDescription>Assign job produksi untuk dikerjakan karyawan</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Karyawan *</label>
              <Select value={formData.employeeId} onValueChange={(v) => setFormData({ ...formData, employeeId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Karyawan" />
                </SelectTrigger>
                <SelectContent>
                  {(employees || []).map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} ({e.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bahan Baku *</label>
              <Select value={formData.materialLotId} onValueChange={(v) => setFormData({ ...formData, materialLotId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Bahan Baku" />
                </SelectTrigger>
                <SelectContent>
                  {(lots || []).map((l) => (
                    <SelectItem key={l.id} value={l.id} disabled={l.quantity === 0}>
                      {l.lotNumber} - {l.product?.name} (Stok: {l.quantity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Target Qty *</label>
                <Input
                  type="number"
                  placeholder="100"
                  value={formData.targetQty}
                  onChange={(e) => setFormData({ ...formData, targetQty: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Rate/Unit ({currencySymbol})</label>
                <Input
                  type="number"
                  placeholder="5000"
                  value={formData.ratePerUnit}
                  onChange={(e) => setFormData({ ...formData, ratePerUnit: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Input
                placeholder="Catatan opsional"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleAddAssignment} disabled={!formData.employeeId || !formData.materialLotId || !formData.targetQty || submitting}>
              {submitting ? <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" /> : <PlusIcon className="mr-2 h-4 w-4" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
