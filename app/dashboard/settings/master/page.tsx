"use client"

import { memo, useState, useEffect, useCallback, useMemo } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/shared"
import { ArrowLeftIcon, TrashIcon, BeakerIcon, MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline"
import { toast } from "sonner"
import { useCurrency } from "@/hooks/useCurrency"

interface SKU {
  id: string
  code: string
  name: string
  category: string
  unit: string
  price: number
  isActive: boolean
}

interface Supplier {
  id: string
  code: string
  name: string
  contactPerson: string
  phone: string
  address: string
}

interface CostCategory {
  id: string
  code: string
  name: string
  type: "DIRECT" | "INDIRECT"
  description?: string
}

interface PaginatedResponse<T> {
  data: T[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

interface SearchPagination {
  page: number
  limit: number
  search: string
}

const defaultPagination: SearchPagination = { page: 1, limit: 10, search: "" }

// ============ MEMOIZED ROW COMPONENTS ============

const SkuRow = memo(function SkuRow({
  sku,
  formatCurrency,
  onToggle,
  onDelete,
}: {
  sku: SKU
  formatCurrency: (v: number) => string
  onToggle: (id: string, currentStatus: boolean) => void
  onDelete: (id: string, name: string, type: "SKU" | "SUPPLIER" | "COST") => void
}) {
  return (
    <TableRow className={!sku.isActive ? "opacity-50" : ""}>
      <TableCell className="font-mono text-xs whitespace-nowrap">{sku.code}</TableCell>
      <TableCell className="font-medium min-w-[160px]">{sku.name}</TableCell>
      <TableCell><Badge variant="outline">{sku.category || "-"}</Badge></TableCell>
      <TableCell className="whitespace-nowrap">{formatCurrency(typeof sku.price === "string" ? parseInt(sku.price as any) : sku.price)}</TableCell>
      <TableCell>
        <Badge className={`${sku.isActive ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-gray-100 text-gray-800"}`}>
          {sku.isActive ? "Aktif" : "Nonaktif"}
        </Badge>
      </TableCell>
      <TableCell className="text-right whitespace-nowrap">
        <Button variant="ghost" size="sm" onClick={() => onToggle(sku.id, sku.isActive)} title={sku.isActive ? "Nonaktifkan" : "Aktifkan"}>
          {sku.isActive ? "Nonaktifkan" : "Aktifkan"}
        </Button>
        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => onDelete(sku.id, sku.name, "SKU")}>
          <TrashIcon className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  )
}, (prev, next) => prev.sku === next.sku && prev.formatCurrency === next.formatCurrency && prev.onToggle === next.onToggle && prev.onDelete === next.onDelete)

const SupplierRow = memo(function SupplierRow({
  supplier,
  onDelete,
}: {
  supplier: Supplier
  onDelete: (id: string, name: string, type: "SKU" | "SUPPLIER" | "COST") => void
}) {
  return (
    <TableRow>
      <TableCell className="font-mono text-xs whitespace-nowrap">{supplier.code}</TableCell>
      <TableCell className="font-medium min-w-[160px]">{supplier.name}</TableCell>
      <TableCell className="whitespace-nowrap">{supplier.contactPerson || "-"}</TableCell>
      <TableCell className="font-mono text-xs whitespace-nowrap">{supplier.phone}</TableCell>
      <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground" title={supplier.address}>{supplier.address}</TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => onDelete(supplier.id, supplier.name, "SUPPLIER")}>
          <TrashIcon className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  )
}, (prev, next) => prev.supplier === next.supplier && prev.onDelete === next.onDelete)

const CostRow = memo(function CostRow({
  category,
  onDelete,
}: {
  category: CostCategory
  onDelete: (id: string, name: string, type: "SKU" | "SUPPLIER" | "COST") => void
}) {
  return (
    <TableRow>
      <TableCell className="font-mono text-xs whitespace-nowrap">{category.code}</TableCell>
      <TableCell className="font-medium min-w-[160px]">{category.name}</TableCell>
      <TableCell>
        <Badge className={`${category.type === "DIRECT" ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-orange-100 text-orange-800 hover:bg-orange-100"}`}>
          {category.type === "DIRECT" ? "Langsung" : "Tidak Langsung"}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground text-xs max-w-[280px] truncate" title={category.description}>{category.description || "-"}</TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => onDelete(category.id, category.name, "COST")}>
          <TrashIcon className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  )
}, (prev, next) => prev.category === next.category && prev.onDelete === next.onDelete)

// ============ LOADING SKELETON ============

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-24 mt-2" />
          </CardHeader>
          <CardContent><Skeleton className="h-3 w-32" /></CardContent>
        </Card>
      ))}
    </div>
  )
}

// ============ PAGINATION CONTROL (memoized) ============

const PaginationControl = memo(function PaginationControl({ page, totalPages, total, limit, onPageChange, onLimitChange }: {
  page: number
  totalPages: number
  total: number
  limit: number
  onPageChange: (p: number) => void
  onLimitChange: (l: number) => void
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 sm:px-0 py-3 border-t">
      <p className="text-xs text-muted-foreground">Halaman {page} dari {totalPages} ({total} total)</p>
      <div className="flex items-center gap-2">
        <select className="h-7 rounded-md border border-input bg-background px-2 text-sm" value={limit} onChange={(e) => onLimitChange(Number(e.target.value))}>
          <option value={10}>10 / hal</option>
          <option value={25}>25 / hal</option>
          <option value={50}>50 / hal</option>
          <option value={100}>100 / hal</option>
        </select>
        <div className="flex items-center gap-1">
          <Button variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <span className="text-sm px-2">{page}/{totalPages}</span>
          <Button variant="outline" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
})

// ============ SKU TAB (lazy, isolated) ============

interface SkuTabProps {
  onToggle: (id: string, currentStatus: boolean) => void
  onDelete: (id: string, name: string, type: "SKU" | "SUPPLIER" | "COST") => void
}

const SkuTab = memo(function SkuTab({ onToggle, onDelete }: SkuTabProps) {
  const { formatCurrency } = useCurrency()
  const [state, setState] = useState<SearchPagination>(defaultPagination)
  const query = useQuery({
    queryKey: ["master-skus", state],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(state.page), limit: String(state.limit), search: state.search })
      const res = await fetch(`/api/master-skus?${params}`)
      if (!res.ok) throw new Error("Failed to fetch SKUs")
      return res.json() as Promise<PaginatedResponse<SKU>>
    },
  })

  const skus = query.data?.data ?? []
  const pagination = query.data?.pagination

  const setPage = useCallback((p: number) => setState((s) => ({ ...s, page: p })), [])
  const setLimit = useCallback((l: number) => setState((s) => ({ ...s, page: 1, limit: l })), [])
  const setSearch = useCallback((search: string) => setState((s) => ({ ...s, page: 1, search })), [])

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle>Daftar Bahan Baku</CardTitle>
            <CardDescription>Kelola bahan baku produksi</CardDescription>
          </div>
          <SkuAddDialog />
        </div>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari bahan baku (kode, nama, kategori)..." value={state.search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-6">
        <div className="overflow-x-auto">
          {query.isLoading ? (
            <TableSkeleton />
          ) : skus.length === 0 ? (
            <div className="py-12 text-center border rounded-lg border-dashed bg-muted/30">
              <BeakerIcon className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium">{state.search ? "Tidak ada hasil pencarian" : "Belum ada bahan baku di database"}</p>
              <p className="text-xs text-muted-foreground mt-1">{state.search ? "Coba kata kunci lain" : "Klik Tambah Bahan Baku untuk menambahkan data, atau tunggu auto-seed selesai."}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Kode</TableHead>
                  <TableHead className="whitespace-nowrap">Nama Bahan Baku</TableHead>
                  <TableHead className="whitespace-nowrap">Kategori</TableHead>
                  <TableHead className="whitespace-nowrap">Harga</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skus.map((sku) => (
                  <SkuRow key={sku.id} sku={sku} formatCurrency={formatCurrency} onToggle={onToggle} onDelete={onDelete} />
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        {pagination && pagination.totalPages > 1 && (
          <PaginationControl page={state.page} totalPages={pagination.totalPages} total={pagination.total} limit={state.limit} onPageChange={setPage} onLimitChange={setLimit} />
        )}
      </CardContent>
    </Card>
  )
})

const SkuAddDialog = dynamic(() => import("./_components/SkuAddDialog").then((m) => m.SkuAddDialog), { ssr: false })

// ============ SUPPLIER TAB ============

interface SupplierTabProps {
  onDelete: (id: string, name: string, type: "SKU" | "SUPPLIER" | "COST") => void
}

const SupplierTab = memo(function SupplierTab({ onDelete }: SupplierTabProps) {
  const [state, setState] = useState<SearchPagination>(defaultPagination)
  const query = useQuery({
    queryKey: ["master-suppliers", state],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(state.page), limit: String(state.limit), search: state.search })
      const res = await fetch(`/api/suppliers?${params}`)
      if (!res.ok) throw new Error("Failed to fetch suppliers")
      return res.json() as Promise<PaginatedResponse<Supplier>>
    },
  })

  const suppliers = query.data?.data ?? []
  const pagination = query.data?.pagination

  const setPage = useCallback((p: number) => setState((s) => ({ ...s, page: p })), [])
  const setLimit = useCallback((l: number) => setState((s) => ({ ...s, page: 1, limit: l })), [])
  const setSearch = useCallback((search: string) => setState((s) => ({ ...s, page: 1, search })), [])

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle>Daftar Supplier</CardTitle>
            <CardDescription>Kelola data supplier bahan baku</CardDescription>
          </div>
          <SupplierAddDialog />
        </div>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari supplier (kode, nama, contact)..." value={state.search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-6">
        <div className="overflow-x-auto">
          {query.isLoading ? (
            <TableSkeleton />
          ) : suppliers.length === 0 ? (
            <div className="py-12 text-center border rounded-lg border-dashed bg-muted/30">
              <p className="text-sm text-muted-foreground">{state.search ? "Tidak ada hasil pencarian" : "Belum ada supplier. Tunggu auto-seed atau klik Tambah Supplier."}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Kode</TableHead>
                  <TableHead className="whitespace-nowrap">Nama</TableHead>
                  <TableHead className="whitespace-nowrap">Contact</TableHead>
                  <TableHead className="whitespace-nowrap">Telepon</TableHead>
                  <TableHead className="whitespace-nowrap">Alamat</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <SupplierRow key={supplier.id} supplier={supplier} onDelete={onDelete} />
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        {pagination && pagination.totalPages > 1 && (
          <PaginationControl page={state.page} totalPages={pagination.totalPages} total={pagination.total} limit={state.limit} onPageChange={setPage} onLimitChange={setLimit} />
        )}
      </CardContent>
    </Card>
  )
})

const SupplierAddDialog = dynamic(() => import("./_components/SupplierAddDialog").then((m) => m.SupplierAddDialog), { ssr: false })

// ============ COST TAB ============

interface CostTabProps {
  onDelete: (id: string, name: string, type: "SKU" | "SUPPLIER" | "COST") => void
}

const CostTab = memo(function CostTab({ onDelete }: CostTabProps) {
  const [state, setState] = useState<SearchPagination>(defaultPagination)
  const query = useQuery({
    queryKey: ["master-cost-categories", state],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(state.page), limit: String(state.limit), search: state.search })
      const res = await fetch(`/api/cost-categories?${params}`)
      if (!res.ok) throw new Error("Failed to fetch cost categories")
      return res.json() as Promise<PaginatedResponse<CostCategory>>
    },
  })

  const categories = query.data?.data ?? []
  const pagination = query.data?.pagination

  const setPage = useCallback((p: number) => setState((s) => ({ ...s, page: p })), [])
  const setLimit = useCallback((l: number) => setState((s) => ({ ...s, page: 1, limit: l })), [])
  const setSearch = useCallback((search: string) => setState((s) => ({ ...s, page: 1, search })), [])

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle>Kategori Biaya</CardTitle>
            <CardDescription>Kelola kategori biaya produksi</CardDescription>
          </div>
          <CostAddDialog />
        </div>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari kategori (kode, nama, deskripsi)..." value={state.search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-6">
        <div className="overflow-x-auto">
          {query.isLoading ? (
            <TableSkeleton />
          ) : categories.length === 0 ? (
            <div className="py-12 text-center border rounded-lg border-dashed bg-muted/30">
              <p className="text-sm text-muted-foreground">{state.search ? "Tidak ada hasil pencarian" : "Belum ada kategori di database. Tunggu auto-seed atau klik Tambah Kategori."}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Kode</TableHead>
                  <TableHead className="whitespace-nowrap">Nama</TableHead>
                  <TableHead className="whitespace-nowrap">Jenis</TableHead>
                  <TableHead className="whitespace-nowrap">Deskripsi</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <CostRow key={category.id} category={category} onDelete={onDelete} />
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        {pagination && pagination.totalPages > 1 && (
          <PaginationControl page={state.page} totalPages={pagination.totalPages} total={pagination.total} limit={state.limit} onPageChange={setPage} onLimitChange={setLimit} />
        )}
      </CardContent>
    </Card>
  )
})

const CostAddDialog = dynamic(() => import("./_components/CostAddDialog").then((m) => m.CostAddDialog), { ssr: false })

// ============ STATS OVERVIEW (memoized) ============

interface StatsProps {
  skuTotal: number
  supplierTotal: number
  costTotal: number
  skuActiveInPage: number
  costDirectInPage: number
  costIndirectInPage: number
}

const StatsOverview = memo(function StatsOverview({ skuTotal, supplierTotal, costTotal, skuActiveInPage, costDirectInPage, costIndirectInPage }: StatsProps) {
  return (
    <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total Bahan Baku</CardDescription>
          <CardTitle className="text-2xl">
            {skuTotal}
            <span className="text-sm font-normal text-muted-foreground"> ({skuActiveInPage} aktif di halaman ini)</span>
          </CardTitle>
        </CardHeader>
        <CardContent><p className="text-xs text-muted-foreground">Jenis bahan baku produksi</p></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Supplier</CardDescription>
          <CardTitle className="text-2xl">
            {supplierTotal}
            <span className="text-sm font-normal text-muted-foreground"> mitra</span>
          </CardTitle>
        </CardHeader>
        <CardContent><p className="text-xs text-muted-foreground">PT/CV tekstil & bahan baku</p></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Kategori Biaya</CardDescription>
          <CardTitle className="text-2xl">
            {costTotal}
            <span className="text-sm font-normal text-muted-foreground"> ({costDirectInPage} langsung, {costIndirectInPage} tak langsung di halaman ini)</span>
          </CardTitle>
        </CardHeader>
        <CardContent><p className="text-xs text-muted-foreground">DIRECT vs INDIRECT (HPP)</p></CardContent>
      </Card>
    </div>
  )
})

// ============ MAIN PAGE ============

// MASTER DATA: Data real dari backend API (database PostgreSQL)
// Auto-seed saat halaman dimuat bila database kosong
// Server-side pagination + search untuk skalabilitas 1000+ baris

export default function MasterPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const refetchSkus = useCallback(() => queryClient.invalidateQueries({ queryKey: ["master-skus"] }), [queryClient])
  const refetchSuppliers = useCallback(() => queryClient.invalidateQueries({ queryKey: ["master-suppliers"] }), [queryClient])
  const refetchCostCategories = useCallback(() => queryClient.invalidateQueries({ queryKey: ["master-cost-categories"] }), [queryClient])

  // Auto-seed check: load first pages concurrently and check totals
  const skuStatsQuery = useQuery({
    queryKey: ["master-skus", "stats"],
    queryFn: async () => {
      const res = await fetch("/api/master-skus?limit=1")
      if (!res.ok) throw new Error("Failed")
      return res.json() as Promise<PaginatedResponse<SKU>>
    },
    staleTime: 60_000,
  })
  const supplierStatsQuery = useQuery({
    queryKey: ["master-suppliers", "stats"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers?limit=1")
      if (!res.ok) throw new Error("Failed")
      return res.json() as Promise<PaginatedResponse<Supplier>>
    },
    staleTime: 60_000,
  })
  const costStatsQuery = useQuery({
    queryKey: ["master-cost-categories", "stats"],
    queryFn: async () => {
      const res = await fetch("/api/cost-categories?limit=1")
      if (!res.ok) throw new Error("Failed")
      return res.json() as Promise<PaginatedResponse<CostCategory>>
    },
    staleTime: 60_000,
  })

  const [seedChecked, setSeedChecked] = useState(false)
  useEffect(() => {
    if (seedChecked) return
    if (skuStatsQuery.isLoading || supplierStatsQuery.isLoading || costStatsQuery.isLoading) return
    const sp = skuStatsQuery.data?.pagination
    const sup = supplierStatsQuery.data?.pagination
    const cp = costStatsQuery.data?.pagination
    if (!sp || !sup || !cp) return
    setSeedChecked(true)
    if (sp.total + sup.total + cp.total === 0) {
      fetch("/api/seed/master", { method: "POST" })
        .then((res) => (res.ok ? res.json() : null))
        .then((result) => {
          if (result) {
            refetchSkus()
            refetchSuppliers()
            refetchCostCategories()
            const created = result.skus.created + result.suppliers.created + result.costCategories.created
            if (created > 0) toast.success(`Data master dimuat: ${result.skus.created} bahan baku, ${result.suppliers.created} supplier, ${result.costCategories.created} kategori biaya`)
          }
        })
        .catch(() => toast.error("Gagal memuat data master"))
    }
  }, [skuStatsQuery.isLoading, supplierStatsQuery.isLoading, costStatsQuery.isLoading, skuStatsQuery.data, supplierStatsQuery.data, costStatsQuery.data, seedChecked, refetchSkus, refetchSuppliers, refetchCostCategories])

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: "SKU" | "SUPPLIER" | "COST"; name: string } | null>(null)

  const handleToggleSKU = useCallback(async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/master-skus/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !currentStatus }) })
      if (response.ok) { toast.success("Status bahan baku berhasil diupdate"); refetchSkus() } else { toast.error("Gagal mengupdate status") }
    } catch { toast.error("Terjadi kesalahan") }
  }, [refetchSkus])

  const handleDeleteClick = useCallback((id: string, name: string, type: "SKU" | "SUPPLIER" | "COST") => {
    setDeleteTarget({ id, type, name })
    setDeleteDialogOpen(true)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      let success = false
      let errorMsg = ""
      if (deleteTarget.type === "SKU") {
        const response = await fetch(`/api/master-skus/${deleteTarget.id}`, { method: "DELETE" })
        if (response.ok) { success = true; refetchSkus() } else errorMsg = "Gagal menghapus bahan baku"
      } else if (deleteTarget.type === "SUPPLIER") {
        const response = await fetch(`/api/suppliers/${deleteTarget.id}`, { method: "DELETE" })
        if (response.ok) { success = true; refetchSuppliers() }
        else { const err = await response.json().catch(() => ({})); errorMsg = err.error || "Gagal menghapus supplier" }
      } else {
        const response = await fetch(`/api/cost-categories/${deleteTarget.id}`, { method: "DELETE" })
        if (response.ok) { success = true; refetchCostCategories() }
        else { const err = await response.json().catch(() => ({})); errorMsg = err.error || "Gagal menghapus kategori biaya" }
      }
      if (success) toast.success(deleteTarget.type === "SKU" ? "Bahan baku berhasil dihapus" : `${deleteTarget.type === "SUPPLIER" ? "Supplier" : "Kategori biaya"} berhasil dihapus`)
      else toast.error(errorMsg)
    } catch { toast.error("Terjadi kesalahan") }
    finally { setDeleteDialogOpen(false); setDeleteTarget(null) }
  }, [deleteTarget, refetchSkus, refetchSuppliers, refetchCostCategories])

  const stats = useMemo(() => ({
    skuTotal: skuStatsQuery.data?.pagination?.total ?? 0,
    supplierTotal: supplierStatsQuery.data?.pagination?.total ?? 0,
    costTotal: costStatsQuery.data?.pagination?.total ?? 0,
  }), [skuStatsQuery.data, supplierStatsQuery.data, costStatsQuery.data])

  const statsLoading = skuStatsQuery.isLoading || supplierStatsQuery.isLoading || costStatsQuery.isLoading

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Data Master"
        description="Kelola Bahan Baku, Supplier, dan Kategori Biaya"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/dashboard/settings")}>
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Kembali
            </Button>
          </div>
        }
      />

      {statsLoading ? (
        <StatsSkeleton />
      ) : (
        <StatsOverview
          skuTotal={stats.skuTotal}
          supplierTotal={stats.supplierTotal}
          costTotal={stats.costTotal}
          skuActiveInPage={0}
          costDirectInPage={0}
          costIndirectInPage={0}
        />
      )}

      <Tabs defaultValue="sku" className="space-y-4">
        <TabsList className="w-full sm:w-auto overflow-x-auto justify-start">
          <TabsTrigger value="sku">Bahan Baku <Badge variant="secondary" className="ml-2">{stats.skuTotal}</Badge></TabsTrigger>
          <TabsTrigger value="supplier">Supplier <Badge variant="secondary" className="ml-2">{stats.supplierTotal}</Badge></TabsTrigger>
          <TabsTrigger value="cost">Kategori Biaya <Badge variant="secondary" className="ml-2">{stats.costTotal}</Badge></TabsTrigger>
        </TabsList>

        <TabsContent value="sku"><SkuTab onToggle={handleToggleSKU} onDelete={handleDeleteClick} /></TabsContent>
        <TabsContent value="supplier"><SupplierTab onDelete={handleDeleteClick} /></TabsContent>
        <TabsContent value="cost"><CostTab onDelete={handleDeleteClick} /></TabsContent>
      </Tabs>

      <DeleteDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} target={deleteTarget} onConfirm={handleConfirmDelete} />
    </div>
  )
}

// ============ DELETE DIALOG (separate, only mounted when open) ============

const DeleteDialog = memo(function DeleteDialog({ open, onOpenChange, target, onConfirm }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: { id: string; type: "SKU" | "SUPPLIER" | "COST"; name: string } | null
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrashIcon className="h-5 w-5 text-red-600" />
            Konfirmasi Hapus
          </DialogTitle>
          <DialogDescription>
            Apakah Anda yakin ingin menghapus {target?.type === "SKU" ? "Bahan Baku" : target?.type === "SUPPLIER" ? "Supplier" : "Kategori Biaya"} ini?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-200 font-medium">{target?.name || "Item yang akan dihapus"}</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">Tindakan ini tidak dapat dibatalkan.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button variant="destructive" onClick={onConfirm} className="bg-red-600 hover:bg-red-700">
            <TrashIcon className="mr-2 h-4 w-4" />
            Hapus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})