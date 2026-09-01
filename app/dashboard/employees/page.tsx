"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/shared"
import { ExportPrint } from "@/components/shared/export-print"
import { 
  UsersIcon, 
  ArrowRightIcon, 
  ArrowPathIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline"
import { useFetch } from "@/hooks/useFetch"

import { ROLE_LABELS } from "@/lib/constants"
import { toast } from "sonner"


interface Employee {
  id: string
  name: string
  email?: string
  phone?: string
  role: string
  employmentType?: string
  baseSalary?: number
  ratePerUnit?: number
  pin?: string
  isActive: boolean
  team?: {
    id: string
    name: string
  }
}

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  PERMANENT: "Permanent",
  HARIAN: "Harian",
  NA: "N/A",
}

const EMPLOYMENT_TYPE_COLORS: Record<string, string> = {
  PERMANENT: "bg-green-100 text-green-800",
  HARIAN: "bg-orange-100 text-orange-800",
  NA: "bg-gray-100 text-gray-600",
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-800",
  KARYAWAN: "bg-blue-100 text-blue-800",
  QC: "bg-purple-100 text-purple-800",
  GUDANG: "bg-green-100 text-green-800",
}

export default function EmployeesPage() {

  const [searchQuery, setSearchQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [roleFilter, setRoleFilter] = useState<string>("")
  const [typeFilter, setTypeFilter] = useState<string>("")
  const [sortField, setSortField] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [stats, setStats] = useState({ total: 0, karyawan: 0, qc: 0, gudang: 0 })
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "KARYAWAN",
    employmentType: "HARIAN",
    baseSalary: "",
    ratePerUnit: "",
    teamId: "",
  })
  const [submitting, setSubmitting] = useState(false)

  const { data: employees, loading, error, refetch } = useFetch<Employee[]>("/api/employees")
  const { data: teams } = useFetch<{ id: string; name: string }[]>("/api/teams")

  useEffect(() => {
    if (employees) {
      const filteredEmployees = employees.filter(e => e.email !== "adsteknologi@gmail.com")
      setStats({
        total: filteredEmployees.length,
        karyawan: filteredEmployees.filter(e => e.role === "KARYAWAN").length,
        qc: filteredEmployees.filter(e => e.role === "QC").length,
        gudang: filteredEmployees.filter(e => e.role === "GUDANG").length,
      })
    }
  }, [employees])

  const filtered = useMemo(() => {
    const result = (employees || []).filter(
      (e) =>
        e.email !== "adsteknologi@gmail.com" &&
        (e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.team?.name.toLowerCase().includes(searchQuery.toLowerCase())) &&
        (roleFilter === "" || e.role === roleFilter) &&
        (typeFilter === "" || e.employmentType === typeFilter)
    )

    if (sortField) {
      result.sort((a, b) => {
        let valA: string | number | boolean = ""
        let valB: string | number | boolean = ""
        
        if (sortField === "isActive") {
          valA = a.isActive
          valB = b.isActive
        } else if (sortField === "role") {
          valA = a.role
          valB = b.role
        } else if (sortField === "name") {
          valA = a.name.toLowerCase()
          valB = b.name.toLowerCase()
        }
        
        if (valA < valB) return sortDirection === "asc" ? -1 : 1
        if (valA > valB) return sortDirection === "asc" ? 1 : -1
        return 0
      })
    }

    return result
  }, [employees, searchQuery, roleFilter, typeFilter, sortField, sortDirection])

  const activeFilters = useMemo(() => {
    const filters: string[] = []
    if (searchQuery) filters.push(`Pencarian: "${searchQuery}"`)
    if (roleFilter) filters.push(`Role: ${ROLE_LABELS[roleFilter as keyof typeof ROLE_LABELS]}`)
    if (typeFilter) filters.push(`Tipe: ${EMPLOYMENT_TYPE_LABELS[typeFilter]}`)
    return filters
  }, [searchQuery, roleFilter, typeFilter])

  const getSuggestions = () => {
    if (!searchQuery || searchQuery.length < 2) return []
    
    const suggestions: { type: "nama" | "email" | "tim"; value: string; label: string }[] = []
    const seen = new Set<string>()
    const filteredEmployees = employees?.filter(e => e.email !== "adsteknologi@gmail.com") || []
    
    filteredEmployees.forEach((emp) => {
      if (emp.name.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(emp.name)) {
        seen.add(emp.name)
        suggestions.push({ type: "nama", value: emp.name, label: emp.name })
      }
      if (emp.email && emp.email.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(emp.email)) {
        seen.add(emp.email)
        suggestions.push({ type: "email", value: emp.email, label: emp.email })
      }
      if (emp.team?.name && emp.team.name.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(emp.team.name)) {
        seen.add(emp.team.name)
        suggestions.push({ type: "tim", value: emp.team.name, label: emp.team.name })
      }
    })
    
    return suggestions.slice(0, 10)
  }

  const suggestions = getSuggestions()

  const selectSuggestion = (value: string) => {
    setSearchQuery(value)
    setShowSuggestions(false)
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const resetFilters = () => {
    setSearchQuery("")
    setRoleFilter("")
    setTypeFilter("")
    setSortField("")
    setSortDirection("asc")
  }

  const openViewDialog = (employee: Employee) => {
    setSelectedEmployee(employee)
    setViewDialogOpen(true)
  }

  const openEditDialog = (employee: Employee) => {
    setSelectedEmployee(employee)
    setFormData({
      name: employee.name || "",
      email: employee.email || "",
      phone: employee.phone || "",
      role: employee.role || "KARYAWAN",
      employmentType: employee.role === "ADMIN" ? "NA" : (employee.employmentType || "HARIAN"),
      baseSalary: employee.role === "ADMIN" ? "" : (employee.baseSalary?.toString() || ""),
      ratePerUnit: employee.role === "ADMIN" ? "" : (employee.ratePerUnit?.toString() || ""),
      teamId: employee.team?.id || "",
    })
    setEditDialogOpen(true)
  }

  const openAddDialog = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: "KARYAWAN",
      employmentType: "HARIAN",
      baseSalary: "",
      ratePerUnit: "",
      teamId: "",
    })
    setAddDialogOpen(true)
  }

  const handleRoleChange = (role: string) => {
    setFormData(prev => ({
      ...prev,
      role,
      employmentType: role === "ADMIN" ? "NA" : prev.employmentType === "NA" ? "HARIAN" : prev.employmentType,
      baseSalary: role === "ADMIN" ? "" : prev.baseSalary,
      ratePerUnit: role === "ADMIN" ? "" : prev.ratePerUnit,
    }))
  }

  const handleAdd = async () => {
    if (!formData.name) {
      toast.error("Nama harus diisi")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          role: formData.role,
          employmentType: formData.employmentType,
          baseSalary: parseInt(formData.baseSalary) || 0,
          ratePerUnit: parseInt(formData.ratePerUnit) || 0,
          teamId: formData.teamId || null,
        }),
      })
      if (res.ok) {
        toast.success("Karyawan berhasil ditambahkan")
        setAddDialogOpen(false)
        refetch()
      } else {
        const error = await res.json()
        toast.error(error.message || "Gagal menambahkan karyawan")
      }
    } catch (err) {
      console.error("Error adding employee:", err)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  const openDeleteDialog = (employee: Employee) => {
    setSelectedEmployee(employee)
    setDeleteDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (!selectedEmployee) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          role: formData.role,
          employmentType: formData.employmentType,
          baseSalary: parseInt(formData.baseSalary) || 0,
          ratePerUnit: parseInt(formData.ratePerUnit) || 0,
          teamId: formData.teamId || null,
        }),
      })
      if (res.ok) {
        toast.success("Karyawan berhasil diperbarui")
        setEditDialogOpen(false)
        refetch()
      } else {
        toast.error("Gagal memperbarui karyawan")
      }
    } catch (err) {
      console.error("Error updating employee:", err)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedEmployee) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        toast.success("Karyawan berhasil dihapus")
        setDeleteDialogOpen(false)
        refetch()
      } else {
        toast.error("Gagal menghapus karyawan")
      }
    } catch (err) {
      console.error("Error deleting employee:", err)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Karyawan"
        description="Kelola data karyawan"
        actions={
          <Button onClick={openAddDialog} className="dark:bg-[#304ffe] dark:hover:bg-[#304ffe]/80">
            <PlusIcon className="mr-2 h-4 w-4" />
            Tambah Karyawan
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Karyawan</CardTitle>
            <UsersIcon className="h-4 w-4 text-[var(--chart-blue)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "-" : stats.karyawan}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">QC Staff</CardTitle>
            <UsersIcon className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "-" : stats.qc}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gudang</CardTitle>
            <UsersIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "-" : stats.gudang}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "-" : stats.total}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Menu Karyawan</CardTitle>
              <CardDescription>Kelola karyawan dan penggajian</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <ArrowPathIcon className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Link href="/dashboard/employees/salaries">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Penggajian
                  <ArrowRightIcon className="h-4 w-4" />
                </CardTitle>
                <CardDescription>Kelola gaji dan bonus</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/dashboard/employees/advances">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Kasbon
                  <ArrowRightIcon className="h-4 w-4" />
                </CardTitle>
                <CardDescription>Pengajuan kasbon karyawan</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/dashboard/employees/teams">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Tim Produksi
                  <ArrowRightIcon className="h-4 w-4" />
                </CardTitle>
                <CardDescription>Kelola tim produksi</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Daftar Karyawan</CardTitle>
              <CardDescription>Kelola dan filter data karyawan</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={resetFilters}>
              <ArrowPathIcon className="mr-2 h-4 w-4" />
              Reset Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari nama, email, atau tim..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="pl-10"
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
                        s.type === "nama" ? "bg-blue-100 text-blue-700" :
                        s.type === "email" ? "bg-purple-100 text-purple-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {s.type === "nama" ? "Nama" : s.type === "email" ? "Email" : "Tim"}
                      </span>
                      <span className="font-medium">{s.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={roleFilter || "ALL"} onValueChange={(v) => setRoleFilter(v === "ALL" ? "" : v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Role</SelectItem>
                  <SelectItem value="KARYAWAN">Karyawan</SelectItem>
                  <SelectItem value="QC">QC</SelectItem>
                  <SelectItem value="GUDANG">Gudang</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter || "ALL"} onValueChange={(v) => setTypeFilter(v === "ALL" ? "" : v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Tipe</SelectItem>
                  <SelectItem value="HARIAN">Harian</SelectItem>
                  <SelectItem value="PERMANENT">Permanent</SelectItem>
                </SelectContent>
              </Select>
              <ExportPrint
                columns={[
                  { key: "name", label: "Nama" },
                  { key: "email", label: "Email" },
                  { key: "role", label: "Role" },
                  { key: "employmentType", label: "Tipe" },
                  { key: "baseSalary", label: "Gaji Pokok" },
                  { key: "ratePerUnit", label: "Rate" },
                  { key: "isActive", label: "Status" },
                ]}
                data={filtered.map(e => ({
                  ...e,
                  role: ROLE_LABELS[e.role as keyof typeof ROLE_LABELS] || e.role,
                  employmentType: e.role === "ADMIN" ? "N/A" : (EMPLOYMENT_TYPE_LABELS[e.employmentType || "HARIAN"] || e.employmentType),
                  baseSalary: e.baseSalary && e.baseSalary > 0 ? `Rp ${e.baseSalary.toLocaleString()}` : "-",
                  ratePerUnit: e.ratePerUnit && e.ratePerUnit > 0 ? `Rp ${e.ratePerUnit.toLocaleString()}` : "-",
                  isActive: e.isActive ? "Aktif" : "Nonaktif",
                }))}
                title="Daftar Karyawan"
                filename="karyawan"
              />
            </div>
          </div>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-xs text-muted-foreground">Filter aktif:</span>
              {activeFilters.map((filter, idx) => (
                <span key={idx} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                  {filter}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Menampilkan <span className="font-medium text-foreground">{filtered.length}</span> dari <span className="font-medium">{employees?.filter(e => e.email !== "adsteknologi@gmail.com").length || 0}</span> data
            </p>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <p>Gagal memuat data: {error.message}</p>
              <Button variant="outline" className="mt-2" onClick={() => refetch()}>
                Coba Lagi
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-lg">
              <FunnelIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium mb-1">Tidak ada data ditemukan</p>
              <p className="text-sm">Coba ubah filter pencarian Anda</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead 
                      className="cursor-pointer select-none hover:text-primary transition-colors"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center gap-1">
                        Nama
                        {sortField === "name" && (
                          <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:text-primary transition-colors"
                      onClick={() => handleSort("role")}
                    >
                      <div className="flex items-center gap-1">
                        Role
                        {sortField === "role" && (
                          <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">Tipe</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">Gaji Pokok</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">Rate</TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:text-primary transition-colors"
                      onClick={() => handleSort("isActive")}
                    >
                      <div className="flex items-center gap-1">
                        Status
                        {sortField === "isActive" && (
                          <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((employee) => (
                    <TableRow key={employee.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{employee.email || "-"}</TableCell>
                      <TableCell>
                        <Badge className={ROLE_COLORS[employee.role] || "bg-gray-100 text-gray-800"}>
                          {ROLE_LABELS[employee.role as keyof typeof ROLE_LABELS] || employee.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge className={employee.role === "ADMIN" ? EMPLOYMENT_TYPE_COLORS["NA"] : EMPLOYMENT_TYPE_COLORS[employee.employmentType || "HARIAN"]}>
                          {employee.role === "ADMIN" ? "N/A" : EMPLOYMENT_TYPE_LABELS[employee.employmentType || "HARIAN"]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right hidden lg:table-cell">
                        {employee.baseSalary && employee.baseSalary > 0
                          ? `Rp ${employee.baseSalary.toLocaleString()}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right hidden lg:table-cell">
                        {employee.ratePerUnit && employee.ratePerUnit > 0
                          ? `Rp ${employee.ratePerUnit.toLocaleString()}`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={employee.isActive ? "default" : "secondary"}>
                          {employee.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openViewDialog(employee)}>
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(employee)}>
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => openDeleteDialog(employee)}>
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center mt-4">
            Tekan header kolom untuk mengurutkan data
          </p>
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Karyawan</DialogTitle>
            <DialogDescription>Tambah karyawan baru</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nama *</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                placeholder="Nama lengkap"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={formData.email} 
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                  placeholder="email@contoh.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Telepon</Label>
                <Input 
                  value={formData.phone} 
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                  placeholder="08xxxxxxxxxx"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <select
                  value={formData.role}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 bg-background"
                >
                  <option value="KARYAWAN">Karyawan</option>
                  <option value="QC">QC</option>
                  <option value="GUDANG">Gudang</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Tipe Karyawan</Label>
                <select
                  value={formData.employmentType}
                  onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  disabled={formData.role === "ADMIN"}
                >
                  {formData.role === "ADMIN" ? (
                    <option value="NA">N/A (Admin Panel)</option>
                  ) : (
                    <>
                      <option value="HARIAN">Harian (Upah Produksi)</option>
                      <option value="PERMANENT">Permanent (Gaji Pokok)</option>
                    </>
                  )}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tim</Label>
                <select
                  value={formData.teamId}
                  onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 bg-background"
                >
                  <option value="">Tanpa Tim</option>
                  {teams?.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Gaji Pokok (Bulanan)</Label>
                <Input 
                  type="number" 
                  value={formData.baseSalary} 
                  onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })} 
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rate per Pcs</Label>
              <Input 
                type="number" 
                value={formData.ratePerUnit} 
                onChange={(e) => setFormData({ ...formData, ratePerUnit: e.target.value })} 
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Batal</Button>
            <Button onClick={handleAdd} disabled={submitting}>
              {submitting && <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Karyawan</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nama</p>
                  <p className="font-medium">{selectedEmployee.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedEmployee.email || "-"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Telepon</p>
                  <p className="font-medium">{selectedEmployee.phone || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <Badge className={ROLE_COLORS[selectedEmployee.role]}>
                    {ROLE_LABELS[selectedEmployee.role as keyof typeof ROLE_LABELS] || selectedEmployee.role}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tipe Karyawan</p>
                  <Badge className={EMPLOYMENT_TYPE_COLORS[selectedEmployee.role === "ADMIN" ? "NA" : (selectedEmployee.employmentType || "HARIAN")]}>
                    {selectedEmployee.role === "ADMIN" ? "N/A" : EMPLOYMENT_TYPE_LABELS[selectedEmployee.employmentType || "HARIAN"]}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tim</p>
                  <p className="font-medium">{selectedEmployee.team?.name || "-"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Gaji Pokok</p>
                  <p className="font-medium">
                    {selectedEmployee.baseSalary && selectedEmployee.baseSalary > 0
                      ? `Rp ${selectedEmployee.baseSalary.toLocaleString()}`
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rate/Pcs</p>
                  <p className="font-medium">
                    {selectedEmployee.ratePerUnit && selectedEmployee.ratePerUnit > 0
                      ? `Rp ${selectedEmployee.ratePerUnit.toLocaleString()}`
                      : "-"}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant="outline">{selectedEmployee.isActive ? "Aktif" : "Nonaktif"}</Badge>
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
            <DialogTitle>Edit Karyawan</DialogTitle>
            <DialogDescription>Perbarui data karyawan</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Telepon</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <select
                  value={formData.role}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="KARYAWAN">Karyawan</option>
                  <option value="QC">QC</option>
                  <option value="GUDANG">Gudang</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Tipe Karyawan</Label>
                <select
                  value={formData.employmentType}
                  onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                  className="w-full border rounded-md px-3 py-2"
                  disabled={formData.role === "ADMIN"}
                >
                  {formData.role === "ADMIN" ? (
                    <option value="NA">N/A (Admin Panel)</option>
                  ) : (
                    <>
                      <option value="HARIAN">Harian (Upah Produksi)</option>
                      <option value="PERMANENT">Permanent (Gaji Pokok)</option>
                    </>
                  )}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tim</Label>
                <select
                  value={formData.teamId}
                  onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="">Tanpa Tim</option>
                  {teams?.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Gaji Pokok (Bulanan)</Label>
                <Input type="number" value={formData.baseSalary} onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rate per Pcs</Label>
              <Input type="number" value={formData.ratePerUnit} onChange={(e) => setFormData({ ...formData, ratePerUnit: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Batal</Button>
            <Button onClick={handleUpdate} disabled={submitting}>
              {submitting && <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Karyawan</DialogTitle>
            <DialogDescription>Yakin ingin menghapus {selectedEmployee?.name}?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting && <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
