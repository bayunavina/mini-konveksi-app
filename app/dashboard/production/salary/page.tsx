"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
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
import { MagnifyingGlassIcon, ArrowLeftIcon, CurrencyDollarIcon } from "@heroicons/react/24/outline"
import { useFetch } from "@/hooks/useFetch"
import { useCurrency } from "@/hooks/useCurrency"
import { toast } from "sonner"

interface Employee {
  id: string
  name: string
  email: string
  role: string
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
  employee?: Employee
  product?: {
    name: string
    sku: string
  }
}

interface SalaryRecord {
  id: string
  totalCompleted: number
  totalRejected: number
  totalAccepted: number
  ratePerUnit: string
  totalSalary: string
  status: string
  paidAt: string
  createdAt: string
  employee?: Employee
}

export default function SalaryPage() {
  const router = useRouter()
  const { formatCurrency } = useCurrency()
  const [searchQuery, setSearchQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [calculateDialogOpen, setCalculateDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    assignmentId: "",
    employeeId: "",
  })

  const { data: assignments } = useFetch<Assignment[]>("/api/production/assign")
  const { data: salaries, loading, refetch } = useFetch<SalaryRecord[]>("/api/production/salary")

  const completedAssignments = (assignments || []).filter(
    (a) => a.status === "COMPLETED" && a.acceptedQty > 0
  )

  const filteredSalaries = (salaries || []).filter((s) => {
    const matchesSearch =
      s.employee?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const getSuggestions = () => {
    if (!searchQuery || searchQuery.length < 2) return []
    
    const suggestions: { type: string; value: string; label: string }[] = []
    const seen = new Set<string>()
    
    ;(salaries || []).forEach((s) => {
      if (s.employee?.name?.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(s.employee.name)) {
        seen.add(s.employee.name)
        suggestions.push({ type: "employee", value: s.employee.name, label: s.employee.name })
      }
    })
    
    return suggestions.slice(0, 10)
  }

  const suggestions = getSuggestions()

  const selectSuggestion = (value: string) => {
    setSearchQuery(value)
    setShowSuggestions(false)
  }

  const totalGaji = (salaries || []).reduce(
    (sum, s) => sum + parseFloat(s.totalSalary || "0"),
    0
  )

  const handleCalculateSalary = async () => {
    if (!formData.assignmentId || !formData.employeeId) {
      toast.error("Pilih assignment terlebih dahulu")
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/production/salary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: formData.assignmentId,
          employeeId: formData.employeeId,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`Gaji dihitung: ${formatCurrency(result.breakdown.totalSalary)}`)
        setCalculateDialogOpen(false)
        setFormData({ assignmentId: "", employeeId: "" })
        refetch()
      } else {
        toast.error("Gagal menghitung gaji")
      }
    } catch (error) {
      console.error("Error calculating salary:", error)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
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

  const handleAssignmentChange = (assignmentId: string) => {
    const assignment = assignments?.find((a) => a.id === assignmentId)
    setFormData({
      assignmentId,
      employeeId: assignment?.employee?.id || "",
    })
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Kalkulasi Gaji Produksi"
        description="Kalkulasi gaji berdasarkan qty yang selesai dan reject"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push("/dashboard/production")}>
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Kembali
            </Button>
            <Button onClick={() => setCalculateDialogOpen(true)}>
              <CurrencyDollarIcon className="mr-2 h-4 w-4" />
              Hitung Gaji
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gaji</CardTitle>
            <CurrencyDollarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalGaji)}</div>
            <p className="text-xs text-muted-foreground">Total semua gaji produksi</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jumlah Record</CardTitle>
            <CurrencyDollarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salaries?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Record kalkulasi gaji</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Riwayat Gaji</CardTitle>
              <CardDescription>Daftar gaji yang sudah dihitung</CardDescription>
            </div>
            <ExportPrint
              columns={[
                { key: "employee", label: "Karyawan" },
                { key: "completed", label: "Completed" },
                { key: "rejected", label: "Rejected" },
                { key: "accepted", label: "Accepted" },
                { key: "rate", label: "Rate" },
                { key: "totalSalary", label: "Total Gaji" },
                { key: "status", label: "Status" },
                { key: "date", label: "Tanggal" },
              ]}
              data={filteredSalaries.map(s => ({
                employee: s.employee?.name || "-",
                completed: s.totalCompleted,
                rejected: s.totalRejected > 0 ? s.totalRejected : "-",
                accepted: s.totalAccepted,
                rate: formatCurrency(parseFloat(s.ratePerUnit || "0")),
                totalSalary: formatCurrency(parseFloat(s.totalSalary || "0")),
                status: s.status,
                date: formatDate(s.createdAt),
              }))}
              title="Riwayat Gaji Produksi"
              filename="gaji-produksi"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari karyawan..."
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
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                        Karyawan
                      </span>
                      <span className="font-medium">{s.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button variant="outline" size="lg" onClick={() => refetch()}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredSalaries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CurrencyDollarIcon className="mx-auto h-12 w-12 mb-4 text-muted-foreground/50" />
              <p>Belum ada record gaji</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-y">
                  <TableHead>Karyawan</TableHead>
                  <TableHead className="text-center">Completed</TableHead>
                  <TableHead className="text-center">Rejected</TableHead>
                  <TableHead className="text-center">Accepted</TableHead>
                  <TableHead className="text-center">Rate</TableHead>
                  <TableHead className="text-center">Total Gaji</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Tanggal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSalaries.map((s) => (
                  <TableRow key={s.id} className="border-y-0">
                    <TableCell className="py-2 font-medium">{s.employee?.name || "-"}</TableCell>
                    <TableCell className="py-2 text-center">{s.totalCompleted}</TableCell>
                    <TableCell className="py-2 text-center text-red-500">{s.totalRejected > 0 ? s.totalRejected : "-"}</TableCell>
                    <TableCell className="py-2 text-center font-medium text-green-600">{s.totalAccepted}</TableCell>
                    <TableCell className="py-2 text-center">{formatCurrency(parseFloat(s.ratePerUnit || "0"))}</TableCell>
                    <TableCell className="py-2 text-center font-bold">{formatCurrency(parseFloat(s.totalSalary || "0"))}</TableCell>
                    <TableCell className="py-2 text-center">
                      <Badge className={`${s.status === "PAID" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 text-center text-sm text-muted-foreground">
                      {formatDate(s.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={calculateDialogOpen} onOpenChange={setCalculateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hitung Gaji Produksi</DialogTitle>
            <DialogDescription>
              Hitung gaji berdasarkan completed dan rejected qty
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Assignment *</label>
              <Select value={formData.assignmentId} onValueChange={handleAssignmentChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Assignment" />
                </SelectTrigger>
                <SelectContent>
                  {completedAssignments.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.employee?.name} - {a.product?.name} (Accepted: {a.acceptedQty})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {completedAssignments.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Tidak ada job completed yang bisa dihitung
                </p>
              )}
            </div>

            {formData.assignmentId && (
              <div className="bg-muted p-4 rounded-lg space-y-2">
                {(() => {
                  const assignment = assignments?.find((a) => a.id === formData.assignmentId)
                  if (!assignment) return null
                  return (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Karyawan:</span>
                        <span className="font-medium">{assignment.employee?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Completed:</span>
                        <span>{assignment.completedQty} pcs</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Rejected:</span>
                        <span className="text-red-500">{assignment.rejectedQty} pcs</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 mt-2">
                        <span className="text-sm font-medium">Accepted:</span>
                        <span className="font-bold text-green-600">{assignment.acceptedQty} pcs</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Rate:</span>
                        <span>{formatCurrency(parseFloat(assignment.ratePerUnit || "0"))}/pcs</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 mt-2">
                        <span className="text-sm font-bold">Total Gaji:</span>
                        <span className="font-bold text-lg">{formatCurrency(assignment.totalSalary)}</span>
                      </div>
                    </>
                  )
                })()}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCalculateDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleCalculateSalary} disabled={!formData.assignmentId || submitting}>
              {submitting ? <Spinner data-icon="inline-start" /> : <CurrencyDollarIcon className="mr-2 h-4 w-4" />}
              Hitung & Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
