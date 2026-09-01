"use client"

import React, { useState, useEffect } from "react"
import { TrendingUp, TrendingDown } from "lucide-react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis, Cell, Pie, PieChart, Bar, BarChart, RadialBarChart, PolarGrid, PolarRadiusAxis, RadialBar, Label } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart"
import { useCurrency } from "@/hooks/useCurrency"

interface ChartDataItem {
  [key: string]: string | number
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

interface Transaction {
  id: string
  date: string | Date
  type: string
  amount: number
}

interface LineChartProps {
  data: ChartDataItem[]
  lines: { dataKey: string; color: string; name: string }[]
  xAxisKey: string
  year: number
  onYearChange: (year: number) => void
}

const financeChartConfig = {
  saldo: {
    label: "Saldo",
    color: "#304ffe",
  },
  pemasukan: {
    label: "Pemasukan",
    color: "#22c55e",
  },
  pengeluaran: {
    label: "Pengeluaran",
    color: "#ef4444",
  },
} satisfies ChartConfig

export function FinanceLineChart({ data, lines, xAxisKey, year, onYearChange }: LineChartProps) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const { formatCurrency, formatNumber } = useCurrency()

  const totalPemasukan = data.reduce((sum, item) => sum + (Number(item.pemasukan) || 0), 0)
  const totalPengeluaran = data.reduce((sum, item) => sum + (Number(item.pengeluaran) || 0), 0)
  
  const trend = totalPemasukan > totalPengeluaran ? "up" : "down"
  const trendPercentage = (totalPemasukan === 0 && totalPengeluaran === 0) 
    ? "0,00"
    : Math.min(
        Math.abs(((totalPemasukan - totalPengeluaran) / (totalPengeluaran || totalPemasukan || 1)) * 100),
        100
      ).toFixed(2).replace(".", ",")

  return (
    <Card className="h-auto">
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm sm:text-base">Keuangan</CardTitle>
            <CardDescription className="text-[10px] sm:text-xs hidden sm:block">Saldo, Pemasukan, Pengeluaran</CardDescription>
          </div>
          <Select value={year.toString()} onValueChange={(v) => onYearChange(parseInt(v))}>
            <SelectTrigger className="w-[90px] h-8 text-xs font-medium">
              <SelectValue placeholder="Tahun" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()} className="text-xs">
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-4 py-2">
        <ChartContainer config={financeChartConfig} className="h-[200px] sm:h-[250px] lg:h-[300px] w-full pt-2 pb-2">
          <LineChart
            accessibilityLayer
            data={data}
            margin={{
              top: 20,
              left: 20,
              right: 20,
              bottom: 10,
            }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey={xAxisKey}
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => value}
              interval={0}
            />
            <YAxis 
              domain={[0, "auto"]}
              tick={{ fontSize: 10 }}
              tickFormatter={(value: number) => formatNumber(value)}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              padding={{ top: 15, bottom: 15 }}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            {lines.map((line) => (
              <Line
                key={line.dataKey}
                type="natural"
                dataKey={line.dataKey}
                stroke={`var(--color-${line.dataKey})`}
                strokeWidth={2.5}
                dot={{
                  fill: `var(--color-${line.dataKey})`,
                  r: 3,
                }}
                activeDot={{
                  r: 5,
                }}
                isAnimationActive={true}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 px-4 py-3 border-t">
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-wrap gap-4 text-xs sm:text-sm">
            {lines.map((line) => {
              const value = data.reduce((sum, item) => sum + (Number(item[line.dataKey]) || 0), 0)
              return (
                <div key={line.dataKey} className="flex items-center gap-2">
                  <span 
                    className="w-3 h-3 rounded-full flex-shrink-0 border-2 border-background shadow-sm" 
                    style={{ backgroundColor: line.color }} 
                  />
                  <span className="text-muted-foreground hidden sm:inline">{line.name}:</span>
                  <span className="font-semibold tabular-nums" style={{ color: line.color }}>
                    {formatCurrency(value)}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {trend === "up" ? (
              <span className="text-orange-500 flex items-center gap-0.5">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="text-xs sm:text-sm font-medium">+{trendPercentage}%</span>
              </span>
            ) : (
              <span className="text-orange-500 flex items-center gap-0.5">
                <TrendingDown className="h-3.5 w-3.5" />
                <span className="text-xs sm:text-sm font-medium">{trendPercentage}%</span>
              </span>
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}

interface PieChartProps {
  data: ChartDataItem[]
  dataKey: string
  nameKey: string
}

export function SKUPieChart({ data, dataKey, nameKey }: PieChartProps) {
  const total = data.reduce((sum, item) => sum + (Number(item[dataKey]) || 0), 0)

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="items-center pb-0 px-4 pt-4">
        <CardTitle className="text-sm sm:text-base">SKU Diproduksi</CardTitle>
        <CardDescription className="text-[10px] sm:text-xs hidden sm:block">Distribusi JO</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col items-center justify-center py-4 px-4 gap-3">
        <div className="relative w-full max-w-[120px] sm:max-w-[140px] aspect-square">
          <PieChart width={120} height={120}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={25}
              outerRadius={55}
              paddingAngle={2}
              dataKey={dataKey}
            >
              <Cell fill="var(--chart-1)" />
              <Cell fill="var(--chart-2)" />
              <Cell fill="var(--chart-3)" />
              <Cell fill="var(--chart-4)" />
              <Cell fill="var(--chart-5)" />
            </Pie>
          </PieChart>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-foreground">{total}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 px-2">
          {data.slice(0, 5).map((entry, index) => (
            <div key={index} className="flex items-center gap-1.5 text-[10px] sm:text-xs">
              <div 
                className="w-2 h-2 rounded-full flex-shrink-0" 
                style={{ backgroundColor: `var(--chart-${index + 1})` }} 
              />
              <span className="truncate max-w-[60px] sm:max-w-[70px]">{String(entry[nameKey])}</span>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="pt-0 pb-4">
      </CardFooter>
    </Card>
  )
}

interface RadialChartProps {
  value: number
  maxValue: number
  label: string
  subtitle: string
}

const radialChartConfig = {
  produksi: {
    label: "Produksi",
  },
  target: {
    label: "Target",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

interface ProduksiData {
  completed: number
  target: number
  successRate: number
  rejected: number
}

export function useProduksiData(): ProduksiData {
  const [data, setData] = React.useState<ProduksiData>({
    completed: 0,
    target: 0,
    successRate: 0,
    rejected: 0,
  })

  React.useEffect(() => {
    const mockData: ProduksiData = {
      completed: 85,
      target: 100,
      successRate: 85,
      rejected: 12,
    }
    setData(mockData)
  }, [])

  return data
}

export function ProduksiRadialChart({ 
  value, 
  maxValue, 
  label, 
  subtitle,
  useMockData = false 
}: RadialChartProps & { useMockData?: boolean }) {
  const [mockValue, setMockValue] = React.useState(value)
  const [mockMaxValue, setMockMaxValue] = React.useState(maxValue)
  
  React.useEffect(() => {
    if (useMockData) {
      setMockValue(85)
      setMockMaxValue(100)
    }
  }, [useMockData])

  const displayValue = useMockData ? mockValue : value
  const displayMaxValue = useMockData ? mockMaxValue : maxValue
  const percentage = Math.min((displayValue / displayMaxValue) * 100, 100)
  const trend = percentage >= 50 ? "up" : "down"

  const chartData = [
    { produksi: displayValue, fill: "var(--color-target)" },
  ]

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="items-center pb-0 px-4 pt-4">
        <CardTitle className="text-sm sm:text-base">Target Produksi</CardTitle>
        <CardDescription className="text-[10px] sm:text-xs hidden sm:block">Pencapaian target</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex items-center justify-center py-3 px-3">
        <ChartContainer
          config={radialChartConfig}
          className="w-full aspect-square h-[140px] sm:h-[180px]"
        >
          <RadialBarChart
            data={chartData}
            startAngle={0}
            endAngle={250}
            innerRadius={35}
            outerRadius={70}
          >
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              className="first:fill-muted last:fill-background"
              polarRadius={[65, 35]}
            />
            <RadialBar dataKey="produksi" background cornerRadius={6} />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cx}
                          className="fill-foreground text-2xl sm:text-3xl font-bold"
                        >
                          {displayValue.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 18}
                          className="fill-muted-foreground text-xs sm:text-sm"
                        >
                          {label}
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-1 text-xs sm:text-sm pt-0 px-4 pb-3">
        <div className="flex items-center justify-center gap-2 leading-none font-bold">
          {trend === "up" ? (
            <>
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
              <span className="text-xl sm:text-2xl text-emerald-600 font-bold">{percentage.toFixed(1)}%</span>
            </>
          ) : (
            <>
              <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
              <span className="text-xl sm:text-2xl text-amber-600 font-bold">{percentage.toFixed(1)}%</span>
            </>
          )}
        </div>
        <div className="leading-none text-muted-foreground text-[10px] sm:text-xs truncate w-full text-center">
          {subtitle} dari {displayMaxValue} target
        </div>
        {useMockData && (
          <div className="text-[9px] text-muted-foreground/50 w-full text-center">
            (Mock Data)
          </div>
        )}
      </CardFooter>
    </Card>
  )
}

interface InventoryBarChartProps {
  data: ChartDataItem[]
  xAxisKey: string
  year?: number
  onYearChange?: (year: number) => void
  currentStock?: number
}

const chartConfig = {
  barangMasuk: {
    label: "Barang Masuk",
    color: "#304ffe",
  },
  barangKeluar: {
    label: "Barang Keluar",
    color: "#dd2c00",
  },
} satisfies ChartConfig

export function InventoryBarChart({ 
  data, 
  xAxisKey, 
  year,
  onYearChange,
}: InventoryBarChartProps) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  
  const totalMasuk = data.reduce((sum, item) => sum + (Number(item.barangMasuk) || 0), 0)
  const totalKeluar = data.reduce((sum, item) => sum + (Number(item.barangKeluar) || 0), 0)

  return (
    <Card className="h-auto">
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm sm:text-base">Transfer</CardTitle>
            <CardDescription className="text-[10px] sm:text-xs hidden sm:block">Barang masuk vs keluar per bulan</CardDescription>
          </div>
          {onYearChange && (
            <Select value={year?.toString() || currentYear.toString()} onValueChange={(v) => onYearChange(parseInt(v))}>
              <SelectTrigger className="w-[90px] h-8 text-xs font-medium">
                <SelectValue placeholder="Tahun" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()} className="text-xs">
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 py-2">
        <ChartContainer config={chartConfig} className="h-[160px] sm:h-[200px] lg:h-[240px] w-full">
          <BarChart data={data} accessibilityLayer margin={{ top: 5, left: 20, right: 10, bottom: 5 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey={xAxisKey} 
              tickLine={false} 
              tickMargin={6}
              axisLine={false}
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => value}
              interval={0}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dashed" />}
            />
            <Bar dataKey="barangMasuk" fill="#304ffe" radius={3} />
            <Bar dataKey="barangKeluar" fill="#dd2c00" radius={3} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 px-4 py-3 border-t text-xs sm:text-sm">
        <div className="flex items-center gap-4 w-full">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm shadow-[0_0_6px_rgba(48,79,254,0.5)]" style={{ backgroundColor: "#304ffe" }} />
            <span className="text-muted-foreground">Masuk:</span>
            <span className="font-semibold text-foreground">{totalMasuk.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm shadow-[0_0_6px_rgba(221,44,0,0.5)]" style={{ backgroundColor: "#dd2c00" }} />
            <span className="text-muted-foreground">Keluar:</span>
            <span className="font-semibold text-foreground">{totalKeluar.toLocaleString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 w-full text-[10px] sm:text-xs">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground font-medium">Legend:</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span style={{ color: "#304ffe" }}>●</span>
              <span className="text-muted-foreground">Masuk = Transfer barang masuk gudang</span>
            </span>
            <span className="flex items-center gap-1">
              <span style={{ color: "#dd2c00" }}>●</span>
              <span className="text-muted-foreground">Keluar = Transfer barang keluar gudang</span>
            </span>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}

interface FinanceData {
  month: string
  saldo: number
  pemasukan: number
  pengeluaran: number
  [key: string]: string | number
}

export function useFinanceChartData(year: number): FinanceData[] {
  const [data, setData] = useState<FinanceData[]>([])
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const startDate = `${year}-01-01`
        const endDate = `${year}-12-31`
        
        const response = await fetch(`/api/transactions?startDate=${startDate}&endDate=${endDate}`)
        if (!response.ok) throw new Error("Failed to fetch")
        
        const transactions: Transaction[] = await response.json()
        
        const monthlyData: FinanceData[] = MONTHS.map((month, index) => {
          const monthTransactions = transactions.filter(t => {
            const date = new Date(t.date)
            return date.getMonth() === index
          })
          
          const monthPemasukan = monthTransactions
            .filter(t => t.type === "INCOME")
            .reduce((sum, t) => sum + t.amount, 0)
          
          const monthPengeluaran = monthTransactions
            .filter(t => t.type === "EXPENSE")
            .reduce((sum, t) => sum + t.amount, 0)
          
          const prevMonthSaldo = index === 0 
            ? 0 
            : data[index - 1]?.saldo || 0
          
          return {
            month,
            saldo: prevMonthSaldo + monthPemasukan - monthPengeluaran,
            pemasukan: monthPemasukan,
            pengeluaran: monthPengeluaran,
          }
        })
        
        let runningSaldo = 0
        const cumulativeData = monthlyData.map((item) => {
          runningSaldo = runningSaldo + item.pemasukan - item.pengeluaran
          return { ...item, saldo: runningSaldo }
        })
        
        setData(cumulativeData)
      } catch (error) {
        console.error("Error fetching finance data:", error)
        const mockData: FinanceData[] = MONTHS.map((month, index) => ({
          month,
          saldo: 10000000 + (index * 500000),
          pemasukan: 2000000 + (index * 200000),
          pengeluaran: 1500000 + (index * 150000),
        }))
        setData(mockData)
      }
    }
    
    fetchData()
  }, [year])
  
  return data
}

interface TransferChartItem {
  id: string
  quantity: number
  skuCode?: string
  skuName?: string
}

interface TransferData {
  id: string
  transferNumber: string
  status: string
  type: string
  items?: TransferChartItem[]
  createdAt: string
}

interface InventoryChartData {
  month: string
  monthNum: number
  barangMasuk: number
  barangKeluar: number
  [key: string]: string | number
}

interface InventorySummary {
  year: number
  monthlyData: InventoryChartData[]
  summary: {
    totalBarangMasuk: number
    totalBarangKeluar: number
    currentStock: number
  }
  availableYears: number[]
}

export function useInventoryChartData(year: number): {
  data: InventoryChartData[]
  summary: InventorySummary["summary"]
  loading: boolean
} {
  const [data, setData] = useState<InventoryChartData[]>([])
  const [summary, setSummary] = useState<InventorySummary["summary"]>({
    totalBarangMasuk: 0,
    totalBarangKeluar: 0,
    currentStock: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/transfers")
        if (!response.ok) throw new Error("Failed to fetch")
        
        const transfers: TransferData[] = await response.json()
        
        const monthlyData: InventoryChartData[] = MONTHS.map((month, index) => {
          const monthTransfers = transfers.filter(t => {
            const date = new Date(t.createdAt)
            return date.getFullYear() === year && date.getMonth() === index
          })
          
          const barangMasuk = monthTransfers
            .filter(t => t.type === "INCOMING")
            .reduce((sum, t) => sum + (t.items?.reduce((itemSum, item) => itemSum + item.quantity, 0) || 0), 0)
          
          const barangKeluar = monthTransfers
            .filter(t => t.type === "OUTGOING")
            .reduce((sum, t) => sum + (t.items?.reduce((itemSum, item) => itemSum + item.quantity, 0) || 0), 0)
          
          return {
            month,
            monthNum: index + 1,
            barangMasuk,
            barangKeluar,
          }
        })
        
        const totalBarangMasuk = monthlyData.reduce((sum, d) => sum + d.barangMasuk, 0)
        const totalBarangKeluar = monthlyData.reduce((sum, d) => sum + d.barangKeluar, 0)
        
        setData(monthlyData)
        setSummary({
          totalBarangMasuk,
          totalBarangKeluar,
          currentStock: totalBarangMasuk - totalBarangKeluar,
        })
      } catch (error) {
        console.error("Error fetching transfer data:", error)
        const mockData: InventoryChartData[] = MONTHS.map((month, index) => ({
          month,
          monthNum: index + 1,
          barangMasuk: 0,
          barangKeluar: 0,
        }))
        setData(mockData)
        setSummary({
          totalBarangMasuk: 0,
          totalBarangKeluar: 0,
          currentStock: 0,
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [year])
  
  return { data, summary, loading }
}

interface ProduksiProgressChartProps {
  produksiMasuk: number
  barangJadi: number
  sisaStok: number
  year: number
  month: number
  onYearChange: (year: number) => void
  onMonthChange: (month: number) => void
}

const MONTHS_FULL: Record<number, string> = {
  0: "Semua",
  1: "Januari",
  2: "Februari",
  3: "Maret",
  4: "April",
  5: "Mei",
  6: "Juni",
  7: "Juli",
  8: "Agustus",
  9: "September",
  10: "Oktober",
  11: "November",
  12: "Desember",
}

export function ProduksiProgressChart({ produksiMasuk, barangJadi, sisaStok, year, month, onYearChange, onMonthChange }: ProduksiProgressChartProps) {
  const [mounted, setMounted] = React.useState(false)
  const total = produksiMasuk || 1

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const BLUE_COLOR = "#304ffe"
  const GREEN_COLOR = "#22c55e"
  const RED_COLOR = "#dd2c00"

  const chartData = [
    { name: "Masuk Produksi", value: produksiMasuk, fill: BLUE_COLOR },
    { name: "Lolos QC", value: barangJadi, fill: GREEN_COLOR },
    { name: "Stok Produksi", value: sisaStok, fill: RED_COLOR },
  ]

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <Card className="flex h-full w-full flex-col overflow-hidden">
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm sm:text-base">Progres Produksi</CardTitle>
            <CardDescription className="text-[10px] sm:text-xs hidden sm:block">Status produksi per periode</CardDescription>
          </div>
          <div className="flex gap-2">
            <select
              value={month}
              onChange={(e) => onMonthChange(parseInt(e.target.value))}
              className="text-xs border rounded px-2 py-1 bg-background"
            >
              {Object.entries(MONTHS_FULL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => onYearChange(parseInt(e.target.value))}
              className="text-xs border rounded px-2 py-1 bg-background"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col items-center justify-center px-4 py-2">
        <div className="flex flex-col items-center w-full">
          <div className="relative w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] group">
            {!mounted ? (
              <div className="w-full h-full rounded-full bg-muted animate-pulse" />
            ) : (
              <>
                <PieChart width={140} height={140}>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                    isAnimationActive={true}
                    animationBegin={0}
                    animationDuration={1000}
                    animationEasing="ease-out"
                  >
                    <Cell fill={BLUE_COLOR} strokeWidth={0} />
                    <Cell fill={GREEN_COLOR} strokeWidth={0} />
                    <Cell fill={RED_COLOR} strokeWidth={0} />
                  </Pie>
                </PieChart>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-lg sm:text-xl font-bold text-foreground">{total.toLocaleString()}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </>
            )}
          </div>
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: BLUE_COLOR }} />
                <span className="text-xs text-muted-foreground">Masuk Produksi:</span>
                <span className="text-xs sm:text-sm font-medium">{produksiMasuk.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: GREEN_COLOR }} />
                <span className="text-xs text-muted-foreground">Lolos QC:</span>
                <span className="text-xs sm:text-sm font-medium">{barangJadi.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: RED_COLOR }} />
                <span className="text-xs text-muted-foreground">Stok Produksi:</span>
                <span className="text-xs sm:text-sm font-medium">{sisaStok.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      <CardFooter className="flex-col items-start gap-1 px-4 py-2 border-t text-xs sm:text-sm">
        <div className="flex items-center justify-between w-full">
          <span className="text-muted-foreground">Persentase Lolos QC:</span>
          <span className="font-medium" style={{ color: GREEN_COLOR }}>
            {total > 0 ? ((barangJadi / total) * 100).toFixed(1) : 0}%
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{ 
              width: `${total > 0 ? (barangJadi / total) * 100 : 0}%`,
              backgroundColor: GREEN_COLOR
            }}
          />
        </div>
      </CardFooter>
    </Card>
  )
}

interface MaterialLot {
  id: string
  lotNumber: string
  quantity: number
  initialQty: number
  product?: {
    id: string
    name: string
    code: string
  } | null
  createdAt?: string
}

interface RawMaterialChartData {
  month: string
  monthNum: number
  stokAwal: number
  masuk: number
  terpakai: number
  sisa: number
  [key: string]: string | number
}

interface RawMaterialSummary {
  totalStok: number
  totalMasuk: number
  totalTerpakai: number
  totalSisa: number
}

const rawMaterialChartConfig = {
  stokAwal: {
    label: "Stok Awal",
    color: "var(--chart-1)",
  },
  masuk: {
    label: "Masuk",
    color: "#304ffe",
  },
  terpakai: {
    label: "Terpakai",
    color: "#ff6d00",
  },
  sisa: {
    label: "Sisa",
    color: "#dd2c00",
  },
} satisfies ChartConfig

export function useRawMaterialChartData(year: number): {
  data: RawMaterialChartData[]
  summary: RawMaterialSummary
  loading: boolean
} {
  const [data, setData] = useState<RawMaterialChartData[]>([])
  const [summary, setSummary] = useState<RawMaterialSummary>({
    totalStok: 0,
    totalMasuk: 0,
    totalTerpakai: 0,
    totalSisa: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/material-lots")
        if (!response.ok) throw new Error("Failed to fetch")
        
        const lots: MaterialLot[] = await response.json()
        
        const monthlyData: RawMaterialChartData[] = MONTHS.map((monthName, index) => {
          const monthLots = lots.filter(l => {
            const date = new Date(l.createdAt || "")
            return date.getFullYear() === year && date.getMonth() === index
          })
          
          const stokAwal = monthLots.reduce((sum, l) => sum + (l.initialQty || 0), 0)
          const masuk = monthLots.reduce((sum, l) => sum + (l.initialQty || 0), 0)
          const terpakai = monthLots.reduce((sum, l) => sum + Math.max((l.initialQty || 0) - (l.quantity || 0), 0), 0)
          const sisa = monthLots.reduce((sum, l) => sum + (l.quantity || 0), 0)
          
          return {
            month: monthName,
            monthNum: index + 1,
            stokAwal,
            masuk,
            terpakai,
            sisa,
          }
        })
        
        const totalMasuk = lots.reduce((sum, l) => sum + (l.initialQty || 0), 0)
        const totalTerpakai = lots.reduce((sum, l) => sum + Math.max((l.initialQty || 0) - (l.quantity || 0), 0), 0)
        const totalSisa = lots.reduce((sum, l) => sum + (l.quantity || 0), 0)
        
        setData(monthlyData)
        setSummary({
          totalStok: totalMasuk,
          totalMasuk,
          totalTerpakai,
          totalSisa,
        })
      } catch (error) {
        console.error("Error fetching raw material data:", error)
        const mockData: RawMaterialChartData[] = MONTHS.map((month, index) => ({
          month,
          monthNum: index + 1,
          stokAwal: 0,
          masuk: 0,
          terpakai: 0,
          sisa: 0,
        }))
        setData(mockData)
        setSummary({
          totalStok: 0,
          totalMasuk: 0,
          totalTerpakai: 0,
          totalSisa: 0,
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [year])
  
  return { data, summary, loading }
}

interface RawMaterialBarChartProps {
  data: RawMaterialChartData[]
  xAxisKey: string
  year: number
  onYearChange: (year: number) => void
  summary: RawMaterialSummary
}

export function RawMaterialBarChart({ 
  data, 
  xAxisKey, 
  year,
  onYearChange,
  summary,
}: RawMaterialBarChartProps) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  
  return (
    <Card className="h-auto">
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm sm:text-base">Raw Material</CardTitle>
            <CardDescription className="text-[10px] sm:text-xs hidden sm:block">Data Rekap Material Masuk, Terpakai dan Sisa</CardDescription>
          </div>
          <select
            value={year}
            onChange={(e) => onYearChange(parseInt(e.target.value))}
            className="text-xs border rounded px-2 py-1 bg-background"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent className="px-4 py-2">
        <ChartContainer config={rawMaterialChartConfig} className="h-[160px] sm:h-[200px] lg:h-[240px] w-full">
          <BarChart data={data} accessibilityLayer margin={{ top: 5, left: 20, right: 10, bottom: 5 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey={xAxisKey} 
              tickLine={false} 
              tickMargin={6}
              axisLine={false}
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => value}
              interval={0}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dashed" />}
            />
            <Bar dataKey="masuk" fill="#304ffe" radius={3} />
            <Bar dataKey="terpakai" fill="#ff6d00" radius={3} />
            <Bar dataKey="sisa" fill="#dd2c00" radius={3} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 px-4 py-3 border-t text-xs sm:text-sm">
        <div className="flex items-center gap-4 w-full">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm shadow-[0_0_6px_rgba(48,79,254,0.5)]" style={{ backgroundColor: "#304ffe" }} />
            <span className="text-muted-foreground">Masuk:</span>
            <span className="font-semibold text-foreground">{summary.totalMasuk.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm shadow-[0_0_6px_rgba(255,109,0,0.5)]" style={{ backgroundColor: "#ff6d00" }} />
            <span className="text-muted-foreground">Terpakai:</span>
            <span className="font-semibold text-foreground">{summary.totalTerpakai.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm shadow-[0_0_6px_rgba(221,44,0,0.5)]" style={{ backgroundColor: "#dd2c00" }} />
            <span className="text-muted-foreground">Sisa:</span>
            <span className="font-semibold text-foreground">{summary.totalSisa.toLocaleString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 w-full text-[10px] sm:text-xs">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground font-medium">Legend:</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span style={{ color: "#304ffe" }}>●</span>
              <span className="text-muted-foreground">Masuk = Material yang masuk gudang</span>
            </span>
            <span className="flex items-center gap-1">
              <span style={{ color: "#ff6d00" }}>●</span>
              <span className="text-muted-foreground">Terpakai = Material yang digunakan</span>
            </span>
            <span className="flex items-center gap-1">
              <span style={{ color: "#dd2c00" }}>●</span>
              <span className="text-muted-foreground">Sisa = Stok material tersedia</span>
            </span>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
