"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader } from "@/components/shared"
import { ExportPrint } from "@/components/shared/export-print"
import { MagnifyingGlassIcon, PlusIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, ArrowLeftIcon } from "@heroicons/react/24/outline"
import { useFetch } from "@/hooks/useFetch"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"
import { useCurrency } from "@/hooks/useCurrency"

interface Transaction {
  id: string
  date: string
  type: string
  category: string
  amount: number
  description?: string
  reference?: string
  createdAt?: string
}

interface CostCategory {
  id: string
  code: string
  name: string
  type: "DIRECT" | "INDIRECT"
  description?: string
}

const TYPE_LABELS: Record<string, string> = {
  INCOME: "Pemasukan",
  EXPENSE: "Pengeluaran",
}

const INCOME_CATEGORY_LABELS: Record<string, string> = {
  SELLING: "Penjualan",
  SERVICE: "Jasa",
  CAPITAL: "Modal",
  OTHER: "Lainnya",
}

const LEGACY_CATEGORY_LABELS: Record<string, string> = {
  SELLING: "Penjualan",
  SERVICE: "Jasa",
  CAPITAL: "Modal",
  SALARY: "Gaji",
  GAJI: "Gaji",
  MATERIAL: "Bahan Baku",
  UTILITY: "Utilitas",
  RENT: "Sewa",
  OTHER: "Lainnya",
}

export default function TransactionsPage() {
  const { formatCurrency, formatNumber, currencySymbol } = useCurrency()
  const [searchQuery, setSearchQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [monthFilter, setMonthFilter] = useState<string>(new Date().getMonth().toString())
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    type: "INCOME",
    category: "SELLING",
    amount: "",
    description: "",
    reference: "",
    date: new Date().toISOString().split("T")[0],
  })

  const { data: transactions, loading, refetch } = useFetch<Transaction[]>("/api/transactions")
  const { data: costCategories } = useFetch<CostCategory[]>("/api/cost-categories?all=true")

  const getCategoryLabel = (code: string) => {
    const found = costCategories?.find(c => c.code === code)
    if (found) return `${found.code} - ${found.name}`
    return INCOME_CATEGORY_LABELS[code] || LEGACY_CATEGORY_LABELS[code] || code
  }

  const expenseCategories = costCategories || []
  const incomeCategories = Object.entries(INCOME_CATEGORY_LABELS).map(([code, name]) => ({ code, name, type: "INCOME" as const }))

  const filteredTransactions = (transactions || []).filter((t) => {
    const matchesSearch =
      (t.description?.toLowerCase().includes(searchQuery.toLowerCase()) || "") ||
      (t.reference?.toLowerCase().includes(searchQuery.toLowerCase()) || "") ||
      (t.category?.toLowerCase().includes(searchQuery.toLowerCase()) || "")
    const matchesType = typeFilter === "all" || t.type === typeFilter
    const txDate = new Date(t.date)
    const matchesMonth = monthFilter === "all" || txDate.getMonth().toString() === monthFilter
    const matchesYear = yearFilter === "all" || txDate.getFullYear().toString() === yearFilter
    return matchesSearch && matchesType && matchesMonth && matchesYear
  })

  const getSuggestions = () => {
    if (!searchQuery || searchQuery.length < 2) return []
    
    const suggestions: { type: string; value: string; label: string }[] = []
    const seen = new Set<string>()
    
    ;(transactions || []).forEach((t) => {
      const reference = t.reference
      if (reference && reference.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(reference)) {
        seen.add(reference)
        suggestions.push({ type: "reference", value: reference, label: reference })
      }
      const description = t.description
      if (description && description.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(description)) {
        seen.add(description)
        suggestions.push({ type: "description", value: description, label: description })
      }
      const category = t.category
      if (category && category.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(category)) {
        seen.add(category)
        suggestions.push({ type: "category", value: category, label: getCategoryLabel(category) })
      }
    })
    
    return suggestions.slice(0, 10)
  }

  const suggestions = getSuggestions()

  const selectSuggestion = (value: string) => {
    setSearchQuery(value)
    setShowSuggestions(false)
  }

  const totalIncome = (transactions || [])
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + t.amount, 0)
  const totalExpense = (transactions || [])
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amount, 0)
  const netBalance = totalIncome - totalExpense

  const handleCreate = async () => {
    if (!formData.amount || !formData.description) return

    setSubmitting(true)
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formData.type,
          category: formData.category,
          amount: parseInt(formData.amount),
          description: formData.description,
          reference: formData.reference || null,
          date: formData.date,
        }),
      })

      if (response.ok) {
        toast.success("Transaksi berhasil ditambahkan")
        setDialogOpen(false)
        setFormData({
          type: "INCOME",
          category: "SELLING",
          amount: "",
          description: "",
          reference: "",
          date: new Date().toISOString().split("T")[0],
        })
        refetch()
      } else {
        toast.error("Gagal menambahkan transaksi")
      }
    } catch (error) {
      console.error("Error creating transaction:", error)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Transaksi"
        description="Kelola semua transaksi keuangan"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/overview/finance">
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Kembali
              </Link>
            </Button>
            <Button variant="outline" onClick={() => refetch()}>
              Refresh
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
              {loading ? "-" : formatCurrency(netBalance)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pemasukan</CardTitle>
            <ArrowTrendingUpIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loading ? "-" : formatCurrency(totalIncome)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pengeluaran</CardTitle>
            <ArrowTrendingDownIcon className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {loading ? "-" : formatCurrency(totalExpense)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "-" : transactions?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Riwayat Transaksi</CardTitle>
              <CardDescription>Semua transaksi keuangan</CardDescription>
            </div>
            <div className="flex gap-2">
              <ExportPrint
                title="Daftar Transaksi"
                filename="transaksi"
                columns={[
                  { key: "date", label: "Tanggal" },
                  { key: "type", label: "Tipe" },
                  { key: "category", label: "Kategori" },
                  { key: "description", label: "Deskripsi" },
                  { key: "reference", label: "Ref" },
                  { key: "amount", label: "Jumlah" },
                ]}
                data={filteredTransactions.map((t) => ({
                  date: formatDate(t.date),
                  type: TYPE_LABELS[t.type] || t.type,
                  category: getCategoryLabel(t.category),
                  description: t.description || "-",
                  reference: t.reference || "-",
                  amount: `${t.type === "INCOME" ? "+" : "-"} ${formatCurrency(t.amount)}`,
                }))}
              />
              <Button onClick={() => setDialogOpen(true)} className="dark:bg-[var(--brand-primary)] dark:hover:bg-[var(--brand-primary)]/80">
                <PlusIcon className="mr-2 h-4 w-4" />
                Tambah Transaksi
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari transaksi..."
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
                        s.type === "reference" ? "bg-blue-100 text-blue-700" :
                        s.type === "description" ? "bg-purple-100 text-purple-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {s.type === "reference" ? "Ref" : s.type === "description" ? "Deskripsi" : "Kategori"}
                      </span>
                      <span className="font-medium">{s.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="INCOME">Masuk</SelectItem>
                <SelectItem value="EXPENSE">Keluar</SelectItem>
              </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Bulan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Bulan</SelectItem>
                <SelectItem value="0">Januari</SelectItem>
                <SelectItem value="1">Februari</SelectItem>
                <SelectItem value="2">Maret</SelectItem>
                <SelectItem value="3">April</SelectItem>
                <SelectItem value="4">Mei</SelectItem>
                <SelectItem value="5">Juni</SelectItem>
                <SelectItem value="6">Juli</SelectItem>
                <SelectItem value="7">Agustus</SelectItem>
                <SelectItem value="8">September</SelectItem>
                <SelectItem value="9">Oktober</SelectItem>
                <SelectItem value="10">November</SelectItem>
                <SelectItem value="11">Desember</SelectItem>
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Tahun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Belum ada transaksi</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jam</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {formatDate(transaction.date)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {(() => {
                        const dateTime = new Date(transaction.createdAt || transaction.date)
                        return dateTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{transaction.description || "-"}</div>
                      {transaction.reference && (
                        <div className="text-xs text-muted-foreground">
                          {transaction.reference}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={transaction.type === "EXPENSE" ? (costCategories?.find(c=>c.code===transaction.category)?.type==="DIRECT" ? "border-green-300 bg-green-50 text-green-800" : "border-orange-300 bg-orange-50 text-orange-800") : ""}>
                        {getCategoryLabel(transaction.category)}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        transaction.type === "INCOME" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {transaction.type === "INCOME" ? "+" : "-"} {formatCurrency(transaction.amount)}
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
            <DialogTitle>Tambah Transaksi</DialogTitle>
            <DialogDescription>Tambahkan transaksi baru</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Jenis</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => {
                  // auto switch kategori default sesuai jenis
                  if (v === "INCOME") {
                    setFormData({ ...formData, type: v, category: "SELLING" })
                  } else {
                    const firstExpense = expenseCategories[0]?.code || "BBL"
                    setFormData({ ...formData, type: v, category: firstExpense })
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">Pemasukan</SelectItem>
                  <SelectItem value="EXPENSE">Pengeluaran</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kategori {formData.type === "EXPENSE" ? "(Terhubung Master Kategori Biaya)" : ""}</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {formData.type === "INCOME" ? (
                    incomeCategories.map(cat => (
                      <SelectItem key={cat.code} value={cat.code}>{cat.code} - {cat.name}</SelectItem>
                    ))
                  ) : (
                    expenseCategories.length > 0 ? (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-green-700 bg-green-50">Langsung (HPP) - 6</div>
                        {expenseCategories.filter(c=>c.type==="DIRECT").map(cat => (
                          <SelectItem key={cat.code} value={cat.code}>{cat.code} - {cat.name}</SelectItem>
                        ))}
                        <div className="px-2 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 mt-1">Tidak Langsung (BOP) - 8</div>
                        {expenseCategories.filter(c=>c.type==="INDIRECT").map(cat => (
                          <SelectItem key={cat.code} value={cat.code}>{cat.code} - {cat.name}</SelectItem>
                        ))}
                      </>
                    ) : (
                      <SelectItem value="BBL" disabled>Memuat kategori...</SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              {formData.type === "EXPENSE" && (
                <p className="text-xs text-muted-foreground">
                  Sumber: <code>/dashboard/settings/master</code> → 14 kategori biaya (DB). Edit di master untuk update dropdown ini.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Jumlah ({currencySymbol})</Label>
              <Input
                type="text"
                placeholder="0"
                value={formData.amount ? formatNumber(parseInt(formData.amount)) : ""}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d]/g, "")
                  setFormData({ ...formData, amount: value })
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Input
                placeholder="Deskripsi transaksi"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Referensi (opsional)</Label>
              <Input
                placeholder="No. Invoice, Faktur, dll"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tanggal</Label>
              <DatePicker
                value={formData.date}
                onChange={(date) => setFormData({ ...formData, date })}
                placeholder="Pilih tanggal"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.amount || !formData.description || submitting}
            >
              {submitting && <Spinner data-icon="inline-start" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
