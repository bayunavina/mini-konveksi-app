"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
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
import { PageHeader } from "@/components/shared"
import { ExportPrint } from "@/components/shared/export-print"
import { PlusIcon, BanknotesIcon, EyeIcon, PencilIcon, TrashIcon, CalculatorIcon } from "@heroicons/react/24/outline"
import { useFetch } from "@/hooks/useFetch"
import { useCurrency } from "@/hooks/useCurrency"
import { useSessionWithRole } from "@/lib/use-session-with-role"
import { FormattedNumberInput } from "@/components/ui/formatted-number-input"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { formatDateLong } from "@/lib/utils"

interface Salary {
  id: string
  period: string
  baseSalary: number
  totalAllowances: number
  totalDeductions: number
  totalSalary: number
  status: string
  paidAt?: string
  createdAt: string
  employee?: {
    id: string
    name: string
    ratePerUnit?: number
  }
  productionSalary?: number
  completedQty?: number
}

interface SalaryCalculation {
  employeeId: string
  employeeName: string
  employmentType: string
  periodWeek: string
  periodYear: number
  ratePerUnit: number
  baseSalary: number
  totalCompletedQty: number
  productionSalary: number
  estimatedSalary: number
  allowances: number
  deductions: number
}

interface Employee {
  id: string
  name: string
  ratePerUnit?: number
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PAID: "bg-green-100 text-green-800",
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

function getCurrentWeekPeriod(): { week: string; year: number } {
  const now = new Date()
  const week = `W${getWeekNumber(now)}`
  const year = now.getFullYear()
  return { week, year }
}

export default function SalariesPage() {
  const { formatCurrency, formatNumber } = useCurrency()
  const router = useRouter()
  const { user, isLoading } = useSessionWithRole()

  const [searchQuery, setSearchQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [calculateDialogOpen, setCalculateDialogOpen] = useState(false)
  const [selectedSalary, setSelectedSalary] = useState<Salary | null>(null)
  const [calculation, setCalculation] = useState<SalaryCalculation | null>(null)
  const [formData, setFormData] = useState({
    employeeId: "",
    period: "",
    baseSalary: "",
    totalAllowances: "",
    totalDeductions: "",
  })
  const [calcFormData, setCalcFormData] = useState({
    employeeId: "",
    periodWeek: "",
    periodYear: "",
    allowances: "",
    deductions: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [calculating, setCalculating] = useState(false)

  const { week, year } = getCurrentWeekPeriod()

  const { data: salaries, loading, refetch } = useFetch<Salary[]>("/api/salaries")
  const { data: employees } = useFetch<Employee[]>("/api/employees")

  useEffect(() => {
    setCalcFormData(prev => ({
      ...prev,
      periodWeek: week,
      periodYear: year.toString(),
    }))
  }, [week, year])

  useEffect(() => {
    if (!isLoading && user && user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
      router.push("/dashboard")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Spinner className="size-8 text-primary" />
      </div>
    )
  }

  if (!isLoading && user?.role !== "ADMIN" && user?.role !== "SUPERADMIN") {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Spinner className="size-8 text-primary" />
      </div>
    )
  }

  const filteredSalaries = (salaries || []).filter((s) => {
    const matchesSearch = 
      s.employee?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.period.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || s.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getSuggestions = () => {
    if (!searchQuery || searchQuery.length < 2) return []
    
    const suggestions: { type: "karyawan" | "periode"; value: string; label: string }[] = []
    const seen = new Set<string>()
    
    salaries?.forEach((s) => {
      if (s.employee?.name && s.employee.name.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(s.employee.name)) {
        seen.add(s.employee.name)
        suggestions.push({ type: "karyawan", value: s.employee.name, label: s.employee.name })
      }
      if (s.period.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(s.period)) {
        seen.add(s.period)
        suggestions.push({ type: "periode", value: s.period, label: s.period })
      }
    })
    
    return suggestions.slice(0, 10)
  }

  const suggestions = getSuggestions()

  const selectSuggestion = (value: string) => {
    setSearchQuery(value)
    setShowSuggestions(false)
  }

  const totalPending = (salaries || [])
    .filter(s => s.status === "PENDING")
    .reduce((sum, s) => sum + s.totalSalary, 0)
  
  const totalPaid = (salaries || [])
    .filter(s => s.status === "PAID")
    .reduce((sum, s) => sum + s.totalSalary, 0)

  const openViewDialog = (salary: Salary) => {
    setSelectedSalary(salary)
    setViewDialogOpen(true)
  }

  const openEditDialog = (salary: Salary) => {
    setSelectedSalary(salary)
    setFormData({
      employeeId: salary.employee?.id || "",
      period: salary.period,
      baseSalary: salary.baseSalary.toString(),
      totalAllowances: salary.totalAllowances.toString(),
      totalDeductions: salary.totalDeductions.toString(),
    })
    setEditDialogOpen(true)
  }

  const openDeleteDialog = (salary: Salary) => {
    setSelectedSalary(salary)
    setDeleteDialogOpen(true)
  }

  const handleCalculate = async () => {
    if (!calcFormData.employeeId || !calcFormData.periodWeek || !calcFormData.periodYear) {
      toast.error("Pilih karyawan dan periode")
      return
    }
    
    setCalculating(true)
    try {
      const calcRes = await fetch("/api/production-logs/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: calcFormData.employeeId,
          periodWeek: calcFormData.periodWeek,
          periodYear: parseInt(calcFormData.periodYear),
          allowances: parseInt(calcFormData.allowances || "0"),
          deductions: parseInt(calcFormData.deductions || "0"),
        }),
      })
      
      if (calcRes.ok) {
        const calc = await calcRes.json()
        setCalculation(calc)
        setCalculateDialogOpen(true)
      } else {
        toast.error("Gagal menghitung gaji")
      }
    } catch (err) {
      console.error("Error calculating:", err)
      toast.error("Terjadi kesalahan")
    } finally {
      setCalculating(false)
    }
  }

  const handleCreateFromCalculation = async () => {
    if (!calculation || !calcFormData.employeeId) return
    
    setSubmitting(true)
    try {
      const allowances = parseInt(calcFormData.allowances || "0")
      const deductions = parseInt(calcFormData.deductions || "0")
      const totalSalary = calculation.estimatedSalary + allowances - deductions

      const res = await fetch("/api/salaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: calcFormData.employeeId,
          period: `${calculation.periodWeek}/${calculation.periodYear}`,
          baseSalary: calculation.estimatedSalary,
          totalAllowances: allowances,
          totalDeductions: deductions,
          totalSalary,
          productionSalary: calculation.productionSalary,
          completedQty: calculation.totalCompletedQty,
        }),
      })
      
      if (res.ok) {
        toast.success("Gaji berhasil dibuat dari hasil kalkulasi")
        setCalculateDialogOpen(false)
        setCalculation(null)
        setCalcFormData({
          employeeId: "",
          periodWeek: week,
          periodYear: year.toString(),
          allowances: "",
          deductions: "",
        })
        refetch()
      } else {
        toast.error("Gagal membuat gaji")
      }
    } catch (err) {
      console.error("Error creating salary:", err)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateSalary = async () => {
    if (!formData.employeeId || !formData.period) return
    setSubmitting(true)
    try {
      const baseSalary = parseInt(formData.baseSalary || "0")
      const allowances = parseInt(formData.totalAllowances || "0")
      const deductions = parseInt(formData.totalDeductions || "0")
      const totalSalary = baseSalary + allowances - deductions

      const res = await fetch("/api/salaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: formData.employeeId,
          period: formData.period,
          baseSalary,
          totalAllowances: allowances,
          totalDeductions: deductions,
          totalSalary,
        }),
      })
      if (res.ok) {
        toast.success("Gaji berhasil dibuat")
        setDialogOpen(false)
        setFormData({ employeeId: "", period: "", baseSalary: "", totalAllowances: "", totalDeductions: "" })
        refetch()
      } else {
        toast.error("Gagal membuat gaji")
      }
    } catch (err) {
      console.error("Error creating salary:", err)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async () => {
    if (!selectedSalary) return
    setSubmitting(true)
    try {
      const baseSalary = parseInt(formData.baseSalary || "0")
      const allowances = parseInt(formData.totalAllowances || "0")
      const deductions = parseInt(formData.totalDeductions || "0")
      const totalSalary = baseSalary + allowances - deductions

      const res = await fetch(`/api/salaries/${selectedSalary.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: formData.period,
          baseSalary,
          totalAllowances: allowances,
          totalDeductions: deductions,
          totalSalary,
        }),
      })
      if (res.ok) {
        toast.success("Gaji berhasil diperbarui")
        setEditDialogOpen(false)
        refetch()
      } else {
        toast.error("Gagal memperbarui gaji")
      }
    } catch (err) {
      console.error("Error updating salary:", err)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  const handlePay = async (salary: Salary) => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/salaries/${salary.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      })
      if (res.ok) {
        toast.success("Gaji berhasil ditandai terbayar")
        refetch()
      } else {
        toast.error("Gagal memperbarui status")
      }
    } catch (err) {
      console.error("Error paying salary:", err)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedSalary) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/salaries/${selectedSalary.id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        toast.success("Gaji berhasil dihapus")
        setDeleteDialogOpen(false)
        refetch()
      } else {
        toast.error("Gagal menghapus gaji")
      }
    } catch (err) {
      console.error("Error deleting salary:", err)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Penggajian"
        description="Kelola gaji dan slip gaji karyawan"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              setCalcFormData({
                employeeId: "",
                periodWeek: week,
                periodYear: year.toString(),
                allowances: "",
                deductions: "",
              })
              setCalculation(null)
              setCalculateDialogOpen(true)
            }}>
              <CalculatorIcon className="mr-2 h-4 w-4" />
              Hitung Otomatis
            </Button>
            <Button onClick={() => setDialogOpen(true)} className="dark:bg-[var(--brand-primary)] dark:hover:bg-[var(--brand-primary)]/80">
              <PlusIcon className="mr-2 h-4 w-4" />
              Tambah Gaji
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Slip Gaji</CardTitle>
            <BanknotesIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "-" : (salaries || []).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {loading ? "-" : formatCurrency(totalPending)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Terbayar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loading ? "-" : formatCurrency(totalPaid)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Daftar Gaji</CardTitle>
              <CardDescription>Riwayat penggajian karyawan</CardDescription>
            </div>
            <ExportPrint
              columns={[
                { key: "employee", label: "Karyawan" },
                { key: "period", label: "Periode" },
                { key: "baseSalary", label: "Gaji Pokok" },
                { key: "allowances", label: "Tunjangan" },
                { key: "deductions", label: "Potongan" },
                { key: "totalSalary", label: "Total" },
                { key: "status", label: "Status" },
              ]}
              data={filteredSalaries.map(s => ({
                employee: s.employee?.name || "-",
                period: s.period,
                baseSalary: formatCurrency(s.baseSalary),
                allowances: formatCurrency(s.totalAllowances),
                deductions: formatCurrency(s.totalDeductions),
                totalSalary: formatCurrency(s.totalSalary),
                status: s.status === "PENDING" ? "Pending" : "Terbayar",
              }))}
              title="Daftar Gaji Karyawan"
              filename="gaji-karyawan"
              summary={[
                { label: "Total Slip Gaji", value: filteredSalaries.length },
                { label: "Total Jumlah Gaji", value: formatCurrency(filteredSalaries.reduce((sum, s) => sum + s.totalSalary, 0)) },
              ]}
              summaryTitle="Ringkasan Gaji"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <Input
                type="search"
                placeholder="Cari karyawan atau periode..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="max-w-xs pl-9"
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
                        s.type === "karyawan" ? "bg-blue-100 text-blue-700" :
                        "bg-purple-100 text-purple-700"
                      }`}>
                        {s.type === "karyawan" ? "Karyawan" : "Periode"}
                      </span>
                      <span className="font-medium">{s.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-7 border rounded-md px-3 text-sm"
            >
              <option value="all">Semua Status</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Terbayar</option>
            </select>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredSalaries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Belum ada data gaji</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Karyawan</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead className="text-right">Gaji Pokok</TableHead>
                  <TableHead className="text-right">Tunjangan</TableHead>
                  <TableHead className="text-right">Potongan</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSalaries.map((salary) => (
                  <TableRow key={salary.id}>
                    <TableCell className="font-medium">{salary.employee?.name || "-"}</TableCell>
                    <TableCell>{salary.period}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(salary.baseSalary)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(salary.totalAllowances)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(salary.totalDeductions)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(salary.totalSalary)}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${STATUS_COLORS[salary.status] || "bg-gray-100 text-gray-800"}`}>
                        {salary.status === "PENDING" ? "Pending" : "Terbayar"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openViewDialog(salary)}>
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(salary)}>
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        {salary.status === "PENDING" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => handlePay(salary)}>
                            <BanknotesIcon className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => openDeleteDialog(salary)}>
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Gaji</DialogTitle>
            <DialogDescription>
              Buat slip gaji baru
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Karyawan</label>
              <select
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="">Pilih Karyawan</option>
                {employees?.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Periode</label>
              <Input
                placeholder="Contoh: 2025-03"
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Gaji Pokok</label>
              <Input
                type="text"
                placeholder="0"
                value={formData.baseSalary ? formatNumber(parseInt(formData.baseSalary)) : ""}
                onChange={(e) => {
                  const rawValue = e.target.value.replace(/[^\d]/g, "")
                  if (!rawValue) {
                    setFormData({ ...formData, baseSalary: "" })
                    return
                  }
                  const formatted = formatNumber(parseInt(rawValue))
                  const cursorPos = e.target.selectionStart || formatted.length
                  const oldLength = e.target.value.length
                  const newLength = formatted.length
                  const lengthDiff = newLength - oldLength
                  setFormData({ ...formData, baseSalary: rawValue })
                    setTimeout(() => {
                      const input = document.getElementById("base-salary-input") as HTMLInputElement
                      if (input) {
                        const newCursorPos = Math.max(0, Math.min(cursorPos + lengthDiff, newLength))
                        input.setSelectionRange(newCursorPos, newCursorPos)
                      }
                    }, 0)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Backspace") {
                    const cursorPos = e.currentTarget.selectionStart || 0
                    const value = e.currentTarget.value
                    const digitsBeforeCursor = value.substring(0, cursorPos).replace(/[^\d]/g, "").length
                    if (digitsBeforeCursor <= 1) {
                      e.preventDefault()
                      setFormData({ ...formData, baseSalary: "" })
                    }
                  }
                }}
                id="base-salary-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tunjangan</label>
                <Input
                  type="text"
                  placeholder="0"
                  value={formData.totalAllowances ? formatNumber(parseInt(formData.totalAllowances)) : ""}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/[^\d]/g, "")
                    if (!rawValue) {
                      setFormData({ ...formData, totalAllowances: "" })
                      return
                    }
                    const formatted = formatNumber(parseInt(rawValue))
                    const cursorPos = e.target.selectionStart || formatted.length
                    const oldLength = e.target.value.length
                    const newLength = formatted.length
                    const lengthDiff = newLength - oldLength
                    setFormData({ ...formData, totalAllowances: rawValue })
                    setTimeout(() => {
                      const input = document.getElementById("allowances-input") as HTMLInputElement
                      if (input) {
                        const newCursorPos = Math.max(0, Math.min(cursorPos + lengthDiff, newLength))
                        input.setSelectionRange(newCursorPos, newCursorPos)
                      }
                    }, 0)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace") {
                      const cursorPos = e.currentTarget.selectionStart || 0
                      const value = e.currentTarget.value
                      const digitsBeforeCursor = value.substring(0, cursorPos).replace(/[^\d]/g, "").length
                      if (digitsBeforeCursor <= 1) {
                        e.preventDefault()
                        setFormData({ ...formData, totalAllowances: "" })
                      }
                    }
                  }}
                  id="allowances-input"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Potongan</label>
                <Input
                  type="text"
                  placeholder="0"
                  value={formData.totalDeductions ? formatNumber(parseInt(formData.totalDeductions)) : ""}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/[^\d]/g, "")
                    if (!rawValue) {
                      setFormData({ ...formData, totalDeductions: "" })
                      return
                    }
                    const formatted = formatNumber(parseInt(rawValue))
                    const cursorPos = e.target.selectionStart || formatted.length
                    const oldLength = e.target.value.length
                    const newLength = formatted.length
                    const lengthDiff = newLength - oldLength
                    setFormData({ ...formData, totalDeductions: rawValue })
                    setTimeout(() => {
                      const input = document.getElementById("deductions-input") as HTMLInputElement
                      if (input) {
                        const newCursorPos = Math.max(0, Math.min(cursorPos + lengthDiff, newLength))
                        input.setSelectionRange(newCursorPos, newCursorPos)
                      }
                    }, 0)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace") {
                      const cursorPos = e.currentTarget.selectionStart || 0
                      const value = e.currentTarget.value
                      const digitsBeforeCursor = value.substring(0, cursorPos).replace(/[^\d]/g, "").length
                      if (digitsBeforeCursor <= 1) {
                        e.preventDefault()
                        setFormData({ ...formData, totalDeductions: "" })
                      }
                    }
                  }}
                  id="deductions-input"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleCreateSalary} disabled={submitting}>
              {submitting && <Spinner data-icon="inline-start" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Gaji</DialogTitle>
          </DialogHeader>
          {selectedSalary && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Karyawan</p>
                  <p className="font-medium">{selectedSalary.employee?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Periode</p>
                  <p className="font-medium">{selectedSalary.period}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Gaji Pokok</p>
                  <p className="font-medium">{formatCurrency(selectedSalary.baseSalary)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tunjangan</p>
                  <p className="font-medium text-green-600">{formatCurrency(selectedSalary.totalAllowances)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Potongan</p>
                  <p className="font-medium text-red-600">{formatCurrency(selectedSalary.totalDeductions)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-bold text-lg">{formatCurrency(selectedSalary.totalSalary)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={STATUS_COLORS[selectedSalary.status]}>
                    {selectedSalary.status === "PENDING" ? "Pending" : "Terbayar"}
                  </Badge>
                </div>
                {selectedSalary.paidAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Tanggal Bayar</p>
                    <p className="font-medium">{formatDateLong(selectedSalary.paidAt)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Gaji</DialogTitle>
            <DialogDescription>Perbarui slip gaji</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Periode</label>
              <Input
                placeholder="Contoh: 2025-03"
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Gaji Pokok</label>
              <FormattedNumberInput
                placeholder="0"
                value={formData.baseSalary}
                onValueChange={(v) => setFormData({ ...formData, baseSalary: v })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tunjangan</label>
                <FormattedNumberInput
                  placeholder="0"
                  value={formData.totalAllowances}
                  onValueChange={(v) => setFormData({ ...formData, totalAllowances: v })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Potongan</label>
                <FormattedNumberInput
                  placeholder="0"
                  value={formData.totalDeductions}
                  onValueChange={(v) => setFormData({ ...formData, totalDeductions: v })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Batal</Button>
            <Button onClick={handleUpdate} disabled={submitting}>
              {submitting && <Spinner data-icon="inline-start" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Gaji</DialogTitle>
            <DialogDescription>Yakin ingin menghapus slip gaji ini?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting && <Spinner data-icon="inline-start" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={calculateDialogOpen} onOpenChange={setCalculateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Kalkulasi Gaji Otomatis</DialogTitle>
            <DialogDescription>
              Hitung gaji berdasarkan output produksi karyawan
            </DialogDescription>
          </DialogHeader>
          
          {!calculation ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Karyawan</label>
                <select
                  value={calcFormData.employeeId}
                  onChange={(e) => setCalcFormData({ ...calcFormData, employeeId: e.target.value })}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="">Pilih Karyawan</option>
                  {employees?.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} {emp.ratePerUnit ? `(Rate: ${formatCurrency(emp.ratePerUnit)})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Minggu Ke-</label>
                  <Input
                    placeholder="W1"
                    value={calcFormData.periodWeek}
                    onChange={(e) => setCalcFormData({ ...calcFormData, periodWeek: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tahun</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="2026"
                    value={calcFormData.periodYear}
                    onChange={(e) => setCalcFormData({ ...calcFormData, periodYear: e.target.value.replace(/\D/g, "") })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCalculateDialogOpen(false)}>
                  Batal
                </Button>
                <Button onClick={handleCalculate} disabled={calculating || !calcFormData.employeeId}>
                  {calculating && <Spinner data-icon="inline-start" />}
                  Hitung
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">Hasil Kalkulasi:</p>
                <p className="text-2xl font-bold">{formatCurrency(calculation.estimatedSalary)}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCalculation(null)}>
                  Hitung Ulang
                </Button>
                <Button onClick={handleCreateFromCalculation} disabled={submitting}>
                  {submitting && <Spinner data-icon="inline-start" />}
                  Simpan
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
