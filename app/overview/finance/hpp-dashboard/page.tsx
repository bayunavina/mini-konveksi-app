"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader } from "@/components/shared"
import { ArrowLeftIcon, ArrowTrendingDownIcon, CubeIcon, CalculatorIcon } from "@heroicons/react/24/outline"
import { useFetch } from "@/hooks/useFetch"
import { useCurrency } from "@/hooks/useCurrency"

interface HppPerSku {
  sku: string
  productName: string
  totalHpp: number
  joCount: number
  hppPerJo: number
}

interface HppDashboardData {
  period: string
  data: HppPerSku[]
  summary: {
    totalHpp: number
    totalJo: number
    avgHppPerJo: number
  }
}

export default function HppDashboardPage() {
  const { formatCurrency } = useCurrency()
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const { data, loading } = useFetch<HppDashboardData>(`/api/hpp-dashboard?period=${period}`)

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    return d.toISOString().slice(0, 7)
  })

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-")
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Dashboard HPP per SKU"
        description="HPP (Harga Pokok Produksi) per SKU per periode"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/overview/finance">
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Kembali
              </Link>
            </Button>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Pilih periode" />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total HPP</CardTitle>
            <ArrowTrendingDownIcon className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold text-amber-600">{formatCurrency(data?.summary?.totalHpp || 0)}</div>
                <p className="text-xs text-muted-foreground">{data?.summary?.totalJo || 0} JO dengan expense DIRECT</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rata-rata HPP per JO</CardTitle>
            <CalculatorIcon className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold text-blue-600">{formatCurrency(data?.summary?.avgHppPerJo || 0)}</div>
                <p className="text-xs text-muted-foreground">per JO ({data?.summary?.totalJo || 0} JO)</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SKU Aktif</CardTitle>
            <CubeIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">{data?.data?.length || 0}</div>
                <p className="text-xs text-muted-foreground">SKU dengan HPP bulan ini</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>HPP per SKU — {formatMonth(period)}</CardTitle>
          <CardDescription>Rincian HPP berdasarkan SKU produk</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data?.data || data.data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CubeIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Belum ada data HPP per SKU untuk periode ini</p>
              <p className="text-xs mt-1">Pastikan sudah ada transaksi EXPENSE DIRECT yang terhubung ke Job Order</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Nama Produk</TableHead>
                    <TableHead className="text-right">Jumlah JO</TableHead>
                    <TableHead className="text-right">Total HPP</TableHead>
                    <TableHead className="text-right">HPP / JO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((item) => (
                    <TableRow key={item.sku}>
                      <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell className="text-right">{item.joCount}</TableCell>
                      <TableCell className="text-right font-medium text-amber-600">{formatCurrency(item.totalHpp)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatCurrency(item.hppPerJo)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell colSpan={2}>TOTAL</TableCell>
                    <TableCell className="text-right">{data.summary.totalJo}</TableCell>
                    <TableCell className="text-right text-amber-600">{formatCurrency(data.summary.totalHpp)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.summary.avgHppPerJo)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}