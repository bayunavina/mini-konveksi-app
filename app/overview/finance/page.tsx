"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/shared"
import { ExportPrint } from "@/components/shared/export-print"
import {
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  TrashIcon,
} from "@heroicons/react/24/outline"
import { useFetch } from "@/hooks/useFetch"
import { useSessionWithRole } from "@/lib/use-session-with-role"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"
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
}

const TYPE_LABELS: Record<string, string> = {
  INCOME: "Pemasukan",
  EXPENSE: "Pengeluaran",
}

const TYPE_COLORS: Record<string, string> = {
  INCOME: "bg-green-100 text-green-800",
  EXPENSE: "bg-red-100 text-red-800",
}

const CATEGORY_LABELS: Record<string, string> = {
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

const SUPERADMIN_EMAIL = "erpkonveksi@gmail.com"

export default function FinancePage() {
  const { formatCurrency } = useCurrency()
  const [searchQuery, setSearchQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [summary, setSummary] = useState({ income: 0, expense: 0, hpp: 0, bop: 0, grossProfit: 0, netProfit: 0, balance: 0 })
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [resetting, setResetting] = useState(false)

  const { user } = useSessionWithRole()
  const { data: transactions, loading, refetch } = useFetch<Transaction[]>("/api/transactions")
  const { data: costCategories } = useFetch<CostCategory[]>("/api/cost-categories?all=true")

  const isSuperadmin = user?.email === SUPERADMIN_EMAIL

  const directSet = useMemo(
    () => new Set((costCategories || []).filter(c => c.type === "DIRECT").map(c => c.code)),
    [costCategories]
  )
  const getCategoryLabel = (code: string) => {
    const found = costCategories?.find(c => c.code === code)
    if (found) return `${found.code} - ${found.name}`
    return CATEGORY_LABELS[code] || code
  }

  useEffect(() => {
    if (transactions) {
      const income = transactions.filter((t) => t.type === "INCOME").reduce((acc, t) => acc + t.amount, 0)
      const expense = transactions.filter((t) => t.type === "EXPENSE").reduce((acc, t) => acc + t.amount, 0)
      // HPP: hanya kategori DIRECT dari cost_categories API (source of truth)
      const hpp = transactions.filter((t) => t.type === "EXPENSE" && directSet.has(t.category)).reduce((acc, t) => acc + t.amount, 0)
      const bop = expense - hpp
      const grossProfit = income - hpp
      const netProfit = income - expense
      setSummary({ income, expense, hpp, bop, grossProfit, netProfit, balance: netProfit })
    }
  }, [transactions, costCategories])

  const filtered = (transactions || []).filter(
    (t) =>
      (t.description?.toLowerCase().includes(searchQuery.toLowerCase()) || "") ||
      (t.category?.toLowerCase().includes(searchQuery.toLowerCase()) || "") ||
      (t.reference?.toLowerCase().includes(searchQuery.toLowerCase()) || "")
  )

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
        suggestions.push({ type: "category", value: category, label: CATEGORY_LABELS[category] || category })
      }
    })
    
    return suggestions.slice(0, 10)
  }

  const suggestions = getSuggestions()

  const selectSuggestion = (value: string) => {
    setSearchQuery(value)
    setShowSuggestions(false)
  }

  const handleResetTransactions = async () => {
    setResetting(true)
    try {
      const response = await fetch("/api/transactions", {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Semua transaksi berhasil di-reset")
        setShowResetDialog(false)
        refetch()
      } else {
        const data = await response.json()
        toast.error(data.error || "Gagal reset transaksi")
      }
    } catch {
      toast.error("Terjadi kesalahan saat reset")
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Keuangan"
        description="Kelola keuangan dan transaksi"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              Refresh
            </Button>
            {isSuperadmin && (
              <Button 
                variant="destructive"
                className="text-white"
                onClick={() => setShowResetDialog(true)}
              >
                <TrashIcon className="mr-2 h-4 w-4" />
                Reset Data
              </Button>
            )}
            <Button asChild className="dark:bg-[var(--brand-primary)] dark:hover:bg-[var(--brand-primary)]/80">
              <Link href="/overview/finance/transactions">
                <BanknotesIcon className="mr-2 h-4 w-4" />
                Transaksi Baru
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pemasukan</CardTitle>
            <ArrowTrendingUpIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loading ? "-" : formatCurrency(summary.income)}
            </div>
            <p className="text-xs text-muted-foreground">
              {loading ? "-" : transactions?.filter((t) => t.type === "INCOME").length} transaksi
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Laba Kotor</CardTitle>
            <BanknotesIcon className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.grossProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {loading ? "-" : formatCurrency(summary.grossProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              Pendapatan - HPP ({loading ? "-" : formatCurrency(summary.hpp)}) • {summary.income>0 ? Math.round((summary.grossProfit/summary.income)*100) : 0}% margin
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Laba Bersih</CardTitle>
            <BanknotesIcon className="h-4 w-4 text-[var(--chart-blue)]" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {loading ? "-" : formatCurrency(summary.netProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              Kotor - BOP ({loading ? "-" : formatCurrency(summary.bop)}) • {summary.income>0 ? Math.round((summary.netProfit/summary.income)*100) : 0}% margin
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">HPP</CardTitle>
            <ArrowTrendingDownIcon className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {loading ? "-" : formatCurrency(summary.hpp)}
            </div>
            <p className="text-xs text-muted-foreground">
              {(costCategories || []).filter(c => c.type === "DIRECT").length} kategori DIRECT
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">BOP</CardTitle>
            <ArrowTrendingDownIcon className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {loading ? "-" : formatCurrency(summary.bop)}
            </div>
            <p className="text-xs text-muted-foreground">
              {(costCategories || []).filter(c => c.type === "INDIRECT").length} kategori INDIRECT
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
            <ArrowTrendingDownIcon className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {loading ? "-" : formatCurrency(summary.expense)}
            </div>
            <p className="text-xs text-muted-foreground">
              HPP + BOP • {loading ? "-" : transactions?.filter((t) => t.type === "EXPENSE").length} transaksi
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Menu Finance</CardTitle>
              <CardDescription>Akses fitur keuangan</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Link href="/overview/finance/transactions">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Transaksi
                  <ArrowRightIcon className="h-4 w-4" />
                </CardTitle>
                <CardDescription>Catat pemasukan dan pengeluaran</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/overview/finance/reports">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Laporan
                  <ArrowRightIcon className="h-4 w-4" />
                </CardTitle>
                <CardDescription>Laporan arus kas dan laba rugi</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transaksi Terbaru</CardTitle>
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
data={filtered.map((t) => ({
                  date: formatDate(t.date),
                  type: TYPE_LABELS[t.type] || t.type,
                category: getCategoryLabel(t.category),
                description: t.description || "-",
                reference: t.reference || "-",
                amount: `${t.type === "INCOME" ? "+" : "-"} ${formatCurrency(t.amount)}`,
              }))}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Belum ada transaksi</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>Ref</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {formatDate(transaction.date)}
                    </TableCell>
                    <TableCell>
                      <Badge className={TYPE_COLORS[transaction.type]}>
                        {TYPE_LABELS[transaction.type] || transaction.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={transaction.type==="EXPENSE" ? (directSet.has(transaction.category) ? "border-amber-300 bg-amber-50 text-amber-800" : "border-orange-300 bg-orange-50 text-orange-800") : ""}>
                        {getCategoryLabel(transaction.category)}
                      </Badge>
                    </TableCell>
                    <TableCell>{transaction.description || "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{transaction.reference || "-"}</TableCell>
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

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Semua Transaksi?</AlertDialogTitle>
            <AlertDialogDescription>
              Peringatan: Semua data transaksi akan dihapus permanen. 
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetTransactions}
              disabled={resetting}
              className="bg-red-600 hover:bg-red-700"
            >
              {resetting ? "Menghapus..." : "Ya, Reset Semua"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
