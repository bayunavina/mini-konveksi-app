"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/shared"
import { useFetch } from "@/hooks/useFetch"
import { useSessionWithRole } from "@/lib/use-session-with-role"
import { useRouter } from "next/navigation"
import { BanknotesIcon } from "@heroicons/react/24/outline"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart"

interface SalaryClaim {
  id: string
  totalSalary: number
  status: string
  createdAt: string
}

const salaryChartConfig: ChartConfig = {
  amount: {
    label: "Total Gaji",
    color: "#304ffe",
  },
}

const MONTHS = [
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
]

export default function KaryawanChartGajiPage() {
  const router = useRouter()
  const { user, isLoading: sessionLoading } = useSessionWithRole()
  
  const currentDate = new Date()
  const [selectedYear, setSelectedYear] = useState<string>(currentDate.getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState<string>((currentDate.getMonth() + 1).toString())

  const { data: salaryClaims, loading, refetch } = useFetch<SalaryClaim[]>(user?.employeeId ? `/api/admin/salary-claims?employeeId=${user.employeeId}` : null)

  const filteredSalaryClaims = useMemo(() => {
    if (!salaryClaims) return []
    
    return (salaryClaims as SalaryClaim[]).filter((claim) => {
      const claimDate = new Date(claim.createdAt)
      const matchesYear = claimDate.getFullYear().toString() === selectedYear
      const matchesMonth = (claimDate.getMonth() + 1).toString() === selectedMonth
      
      return matchesYear && matchesMonth
    })
  }, [salaryClaims, selectedYear, selectedMonth])

  const chartData = useMemo(() => {
    const groupedByWeek: Record<string, number> = {
      "Minggu 1": 0,
      "Minggu 2": 0,
      "Minggu 3": 0,
      "Minggu 4": 0,
    }
    
    filteredSalaryClaims.forEach((claim) => {
      const date = new Date(claim.createdAt)
      const day = date.getDate()
      let weekKey = "Minggu 1"
      
      if (day >= 1 && day <= 7) {
        weekKey = "Minggu 1"
      } else if (day >= 8 && day <= 14) {
        weekKey = "Minggu 2"
      } else if (day >= 15 && day <= 21) {
        weekKey = "Minggu 3"
      } else {
        weekKey = "Minggu 4"
      }
      
      const salaryValue = typeof claim.totalSalary === 'string' 
        ? parseFloat(claim.totalSalary) || 0 
        : claim.totalSalary || 0
      
      groupedByWeek[weekKey] += salaryValue
    })

    return Object.entries(groupedByWeek).map(([week, amount]) => ({
      week,
      amount,
    }))
  }, [filteredSalaryClaims])

  const totalMonthlySalary = useMemo(() => {
    return filteredSalaryClaims.reduce((sum, claim) => {
      const salaryValue = typeof claim.totalSalary === 'string' 
        ? parseFloat(claim.totalSalary) || 0 
        : claim.totalSalary || 0
      return sum + salaryValue
    }, 0)
  }, [filteredSalaryClaims])

  const formatCurrency = (amount: number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount || 0
    return `Rp ${Math.round(num).toLocaleString("id-ID")}`
  }

  const currentMonthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || "Semua"

  if (sessionLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (user?.role !== "KARYAWAN") {
    router.push("/dashboard")
    return null
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Chart Gaji"
        description={`Riwayat klaim gaji ${user?.name || "Karyawan"}`}
      />

      {/* Total Gaji Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Gaji</CardTitle>
          <BanknotesIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? "-" : formatCurrency(totalMonthlySalary)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {filteredSalaryClaims.length} klaim • {currentMonthLabel} {selectedYear}
          </p>
        </CardContent>
      </Card>

      {/* Chart Card */}
      <Card className="h-auto">
        <CardHeader className="pb-2 px-4 pt-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm sm:text-base">Grafik Gaji per Minggu</CardTitle>
              <CardDescription className="text-[10px] sm:text-xs hidden sm:block">
                Distribusi klaim gaji dalam {currentMonthLabel} {selectedYear}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs border rounded px-2 py-1 bg-background"
              >
                {MONTHS.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="text-xs border rounded px-2 py-1 bg-background"
              >
                {[2025, 2026, 2027].map((year) => (
                  <option key={year} value={year.toString()}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 py-2">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-[200px] w-full" />
            </div>
          ) : filteredSalaryClaims.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <BanknotesIcon className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm font-medium">Belum ada data gaji</p>
              <p className="text-xs">Tidak ada klaim gaji untuk periode ini</p>
            </div>
          ) : (
            <ChartContainer config={salaryChartConfig} className="h-[160px] sm:h-[200px] lg:h-[240px] w-full">
              <BarChart
                data={chartData}
                margin={{ top: 5, left: 20, right: 10, bottom: 5 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="week" 
                  tickLine={false} 
                  tickMargin={6}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  tickLine={false}
                  tickMargin={6}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => `${(value / 1000).toLocaleString("id-ID")}rb`}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dashed" />}
                />
                <Bar 
                  dataKey="amount" 
                  fill="#304ffe" 
                  radius={3}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
        {filteredSalaryClaims.length > 0 && (
          <CardFooter className="flex-col items-start gap-2 px-4 py-3 border-t text-xs sm:text-sm">
            <div className="flex items-center gap-4 w-full">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm shadow-[0_0_6px_rgba(48,79,254,0.5)]" style={{ backgroundColor: "#304ffe" }} />
                <span className="text-muted-foreground">Total Gaji:</span>
                <span className="font-semibold text-foreground">{formatCurrency(totalMonthlySalary)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Klaim:</span>
                <span className="font-semibold text-foreground">{filteredSalaryClaims.length}</span>
              </div>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
