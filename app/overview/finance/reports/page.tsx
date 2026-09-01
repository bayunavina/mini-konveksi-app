"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader } from "@/components/shared"
import { ExportPrint } from "@/components/shared/export-print"
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, BanknotesIcon, ArrowLeftIcon } from "@heroicons/react/24/outline"
import { useFetch } from "@/hooks/useFetch"

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

interface MonthlyReport {
  month: string
  income: number
  expense: number
  profit: number
  transactions: number
}

export default function ReportsPage() {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([])

  const { data: transactions, loading } = useFetch<Transaction[]>("/api/transactions")

  useEffect(() => {
    if (transactions) {
      const grouped: Record<string, { income: number; expense: number; count: number }> = {}

      transactions.forEach((t) => {
        const month = t.date ? new Date(t.date).toISOString().slice(0, 7) : "unknown"
        if (!grouped[month]) {
          grouped[month] = { income: 0, expense: 0, count: 0 }
        }
        if (t.type === "INCOME") {
          grouped[month].income += t.amount
        } else {
          grouped[month].expense += t.amount
        }
        grouped[month].count++
      })

      const reports: MonthlyReport[] = Object.entries(grouped)
        .map(([month, data]) => ({
          month,
          income: data.income,
          expense: data.expense,
          profit: data.income - data.expense,
          transactions: data.count,
        }))
        .sort((a, b) => b.month.localeCompare(a.month))

      setMonthlyReports(reports)
    }
  }, [transactions])

  const currentMonthData = monthlyReports.find((r) => r.month === period)
  const totalIncome = currentMonthData?.income || 0
  const totalExpense = currentMonthData?.expense || 0
  const profit = currentMonthData?.profit || 0

  const categoryExpense = (transactions || [])
    .filter((t) => t.type === "EXPENSE")
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount
      return acc
    }, {} as Record<string, number>)

  const totalExpenseAll = Object.values(categoryExpense).reduce((a, b) => a + b, 0)

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-")
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
  }

  const periodOptions = monthlyReports.map((r) => r.month)

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Laporan Keuangan"
        description="Laporan dan analisis keuangan"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/overview/finance">
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Kembali
              </Link>
            </Button>
            <ExportPrint
              title="Laporan Keuangan"
              filename="laporan-keuangan"
              columns={[
                { key: "month", label: "Bulan" },
                { key: "income", label: "Pendapatan" },
                { key: "expense", label: "Pengeluaran" },
                { key: "profit", label: "Keuntungan" },
                { key: "transactions", label: "Transaksi" },
              ]}
              data={monthlyReports.map((r) => ({
                month: formatMonth(r.month),
                income: `Rp ${r.income.toLocaleString("id-ID")}`,
                expense: `Rp ${r.expense.toLocaleString("id-ID")}`,
                profit: `Rp ${r.profit.toLocaleString("id-ID")}`,
                transactions: r.transactions,
              }))}
            />
          </div>
        }
      />

      <div className="flex items-center gap-4">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Pilih periode" />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.length > 0 ? (
              periodOptions.map((p) => (
                <SelectItem key={p} value={p}>
                  {formatMonth(p)}
                </SelectItem>
              ))
            ) : (
              <SelectItem value={period}>{formatMonth(period)}</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
            <ArrowTrendingUpIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  Rp {totalIncome.toLocaleString("id-ID")}
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentMonthData?.transactions || 0} transaksi
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
            <ArrowTrendingDownIcon className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">
                  Rp {totalExpense.toLocaleString("id-ID")}
                </div>
                <p className="text-xs text-muted-foreground">
                  {Object.keys(categoryExpense).length} kategori
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Keuntungan</CardTitle>
            <BanknotesIcon className="h-4 w-4 text-[var(--chart-blue)]" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className={`text-2xl font-bold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  Rp {profit.toLocaleString("id-ID")}
                </div>
                <p className="text-xs text-muted-foreground">
                  Margin: {totalIncome > 0 ? Math.round((profit / totalIncome) * 100) : 0}%
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{currentMonthData?.transactions || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">Transaksi bulan ini</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Per Bulan</CardTitle>
            <CardDescription>Tren keuangan</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : monthlyReports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Belum ada data laporan</p>
              </div>
            ) : (
              <div className="space-y-4">
                {monthlyReports.slice(0, 6).map((report) => (
                  <div
                    key={report.month}
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      report.month === period ? "border-primary bg-muted/50" : ""
                    }`}
                    onClick={() => setPeriod(report.month)}
                    style={{ cursor: "pointer" }}
                  >
                    <div>
                      <div className="font-medium">{formatMonth(report.month)}</div>
                      <div className="text-sm text-muted-foreground">
                        {report.transactions} transaksi
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-green-600">
                        + Rp {report.income.toLocaleString("id-ID")}
                      </div>
                      <div className="text-sm text-red-600">
                        - Rp {report.expense.toLocaleString("id-ID")}
                      </div>
                      <div className={`text-sm font-medium ${report.profit >= 0 ? "text-[var(--chart-blue)]" : "text-red-600"}`}>
                        Laba: Rp {report.profit.toLocaleString("id-ID")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Perbandingan</CardTitle>
            <CardDescription>Pencapaian bulan ini</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-6">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Pendapatan vs Pengeluaran</span>
                    <span>
                      {totalIncome > 0 && totalExpense > 0
                        ? `${Math.round((totalIncome / totalExpense) * 100)}%`
                        : totalIncome > 0
                        ? "100%"
                        : "0%"}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{
                        width: `${
                          totalIncome + totalExpense > 0
                            ? Math.min((totalIncome / (totalIncome + totalExpense)) * 100, 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Transaksi Masuk vs Keluar</span>
                    <span>
                      {(() => {
                        const incomeCount = (transactions || []).filter((t) => t.type === "INCOME").length
                        const expenseCount = (transactions || []).filter((t) => t.type === "EXPENSE").length
                        return `${incomeCount} vs ${expenseCount}`
                      })()}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${
                          (() => {
                            const incomeCount = (transactions || []).filter((t) => t.type === "INCOME").length
                            const total = (transactions || []).length
                            return total > 0 ? (incomeCount / total) * 100 : 50
                          })()
                        }%`,
                        backgroundColor: "#304ffe"
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Distribusi Pengeluaran</CardTitle>
          <CardDescription>Alokasi biaya bulan ini</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : Object.keys(categoryExpense).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Belum ada data pengeluaran</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(categoryExpense)
                .sort(([, a], [, b]) => b - a)
                .map(([category, amount]) => {
                  const percentage = totalExpenseAll > 0 ? Math.round((amount / totalExpenseAll) * 100) : 0
                  return (
                    <div key={category} className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{percentage}%</div>
                      <div className="text-sm text-muted-foreground">
                        {category === "SELLING"
                          ? "Penjualan"
                          : category === "SERVICE"
                          ? "Jasa"
                          : category === "CAPITAL"
                          ? "Modal"
                          : category === "SALARY"
                          ? "Gaji"
                          : category === "MATERIAL"
                          ? "Bahan Baku"
                          : category === "UTILITY"
                          ? "Utilitas"
                          : category === "RENT"
                          ? "Sewa"
                          : "Lainnya"}
                      </div>
                      <div className="text-sm font-medium">
                        Rp {amount.toLocaleString("id-ID")}
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
