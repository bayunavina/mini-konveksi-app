"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BuildingLibraryIcon,
  TruckIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowRightIcon,
  CubeIcon,
  ArchiveBoxIcon,
  WalletIcon,
  ReceiptPercentIcon,
  ClipboardDocumentCheckIcon,
  UsersIcon,
  ListBulletIcon,
  ExclamationTriangleIcon,
  BeakerIcon,
  BellIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  WrenchIcon,
} from "@heroicons/react/24/outline"
import Link from "next/link"
import { useFetch } from "@/hooks/useFetch"
import { useCurrency } from "@/hooks/useCurrency"
import { 
  FinanceLineChart, 
  InventoryBarChart,
  ProduksiProgressChart,
  RawMaterialBarChart,
  useFinanceChartData,
  useInventoryChartData,
  useRawMaterialChartData
} from "./admin-dashboard-charts"

interface JobOrder {
  id: string
  joNumber: string
  targetQty: number
  completedQty: number
  status: string
  product?: { name: string }
  createdAt?: string
}

interface TransferItem {
  id: string
  quantity: number
  skuCode?: string
  skuName?: string
}

interface Transfer {
  id: string
  transferNumber: string
  status: string
  type: string
  items?: TransferItem[]
  createdAt: string
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
}

interface Transaction {
  id: string
  type: string
  amount: number
  date?: string
}

interface Employee {
  id: string
  name: string
  email?: string
  role: string
}

interface QCReport {
  id: string
  status: string
  result: string
  successQty: number
  rejectQty: number
  createdAt?: string
}

interface Maintenance {
  id: string
  status: string
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-muted/50 text-muted-foreground border border-muted-foreground/20 backdrop-blur-sm",
  APPROVED: "bg-[var(--chart-blue)]/10 text-[var(--chart-blue)] border border-[var(--chart-blue)]/30 backdrop-blur-sm shadow-[0_0_10px_var(--chart-blue)] dark:shadow-[0_0_15px_var(--chart-blue)]",
  IN_PROGRESS: "bg-warning-light text-warning-foreground border border-warning/30 backdrop-blur-sm shadow-[0_0_10px_var(--warning)] dark:shadow-[0_0_15px_var(--warning)]",
  QC_PENDING: "bg-warning-light text-warning-foreground border border-warning/30 backdrop-blur-sm shadow-[0_0_10px_var(--warning)] dark:shadow-[0_0_15px_var(--warning)]",
  COMPLETED: "bg-success-light text-success-foreground border border-success/30 backdrop-blur-sm shadow-[0_0_10px_var(--success)] dark:shadow-[0_0_15px_var(--success)]",
  PENDING: "bg-warning-light text-warning-foreground border border-warning/30 backdrop-blur-sm shadow-[0_0_10px_var(--warning)] dark:shadow-[0_0_15px_var(--warning)]",
  SHIPPED: "bg-[var(--chart-blue)]/10 text-[var(--chart-blue)] border border-[var(--chart-blue)]/30 backdrop-blur-sm shadow-[0_0_10px_var(--chart-blue)] dark:shadow-[0_0_15px_var(--chart-blue)]",
  RECEIVED: "bg-success-light text-success-foreground border border-success/30 backdrop-blur-sm shadow-[0_0_10px_var(--success)] dark:shadow-[0_0_15px_var(--success)]",
}

const statusLabels: Record<string, string> = {
  IN_PROGRESS: "Dalam Produksi",
  QC_PENDING: "Menunggu QC",
  COMPLETED: "Selesai",
  PENDING: "Menunggu",
  SHIPPED: "Dikirim",
  RECEIVED: "Diterima",
  DRAFT: "Draft",
}

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ElementType
  iconColor?: string
  href?: string
  delay?: number
}

function StatCard({ title, value, icon: Icon, iconColor = "text-muted-foreground", href, delay = 0 }: StatCardProps) {
  const content = (
    <Card className="hover:shadow-lg hover:border-primary/30 group transition-all duration-300 hover:-translate-y-1">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 px-3 sm:px-4">
        <CardTitle className="text-xs sm:text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconColor} transition-transform duration-300 group-hover:scale-110`} />
      </CardHeader>
      <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
        <div className="text-xl sm:text-2xl font-bold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  )

  if (href) {
    return (
      <Link href={href} className="block animate-slide-up" style={{ animationDelay: `${delay}ms` }}>
        {content}
      </Link>
    )
  }
  return <div className="animate-slide-up" style={{ animationDelay: `${delay}ms` }}>{content}</div>
}

interface CompactStatProps {
  title: string
  value: string | number
  icon: React.ElementType
  iconColor?: string
  href?: string
  delay?: number
}

function CompactStat({ title, value, icon: Icon, iconColor = "text-muted-foreground", href, delay = 0 }: CompactStatProps) {
  const content = (
    <Card className="hover:shadow-lg hover:border-primary/30 group transition-all duration-300 hover:-translate-y-1">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-2 sm:px-3">
        <CardTitle className="text-xs sm:text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconColor} transition-transform duration-300 group-hover:scale-110`} />
      </CardHeader>
      <CardContent className="px-2 sm:px-3 pb-2 sm:pb-3">
        <div className="text-lg sm:text-xl font-bold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  )

  if (href) {
    return (
      <Link href={href} className="block animate-slide-up" style={{ animationDelay: `${delay}ms` }}>
        {content}
      </Link>
    )
  }
  return <div className="animate-slide-up" style={{ animationDelay: `${delay}ms` }}>{content}</div>
}

export function AdminDashboard() {
  const { formatCurrency } = useCurrency()
  const { data: jobOrdersResponse } = useFetch<{ data: JobOrder[]; pagination: { limit: number; offset: number; hasMore: boolean } }>("/api/job-orders?limit=10")
  const jobOrders = jobOrdersResponse?.data
  const { data: transfers, loading: trLoading } = useFetch<Transfer[]>("/api/transfers")
  const { data: lots } = useFetch<MaterialLot[]>("/api/material-lots")
  const { data: transactions } = useFetch<Transaction[]>("/api/transactions")
  const { data: employees } = useFetch<Employee[]>("/api/employees")
  const { data: qcReports } = useFetch<QCReport[]>("/api/qc-reports")
  const { data: maintenance } = useFetch<Maintenance[]>("/api/assets/maintenance")

  const [financeYear, setFinanceYear] = useState(new Date().getFullYear())
  const financeData = useFinanceChartData(financeYear)
  const [inventoryYear, setInventoryYear] = useState(new Date().getFullYear())
  const { data: inventoryData, summary: inventorySummary } = useInventoryChartData(inventoryYear)
  const [productionYear, setProductionYear] = useState(new Date().getFullYear())
  const [productionMonth, setProductionMonth] = useState(0)
  const [rawMaterialYear, setRawMaterialYear] = useState(new Date().getFullYear())
  const { data: rawMaterialData, summary: rawMaterialSummary } = useRawMaterialChartData(rawMaterialYear)

  const [stats, setStats] = useState({
    activeJobs: 0,
    transferIn: 0,
    transferOut: 0,
    totalProducts: 0,
    totalStock: 0,
    totalSaldo: 0,
    totalPengeluaran: 0,
    totalJO: 0,
    produksiMasuk: 0,
    finishedGoods: 0,
    qcSukses: 0,
    qcReject: 0,
    qcRequest: 0,
    totalKaryawan: 0,
    bahanBakuStok: 0,
    bahanBakuTerpakai: 0,
    persetujuanGaji: 0,
    persetujuanKasbon: 0,
    maintenancePending: 0,
  })

  const filterByMonth = useCallback((dateStr?: string) => {
    if (!dateStr) return true
    const date = new Date(dateStr)
    const matchYear = date.getFullYear() === productionYear
    const matchMonth = productionMonth === 0 || (date.getMonth() + 1) === productionMonth
    return matchYear && matchMonth
  }, [productionYear, productionMonth])

  useEffect(() => {
    const fetchProductionSummary = async () => {
      try {
        const params = new URLSearchParams({ year: productionYear.toString() })
        if (productionMonth > 0) {
          params.append("month", productionMonth.toString())
        }
        const res = await fetch(`/api/production/summary?${params}`)
        if (res.ok) {
          const data = await res.json()
          setStats(prev => ({ 
            ...prev, 
            produksiMasuk: data.masukProduksi || 0,
            finishedGoods: data.lolosQC || 0,
          }))
        }
      } catch (error) {
        console.error("Error fetching production summary:", error)
      }
    }
    fetchProductionSummary()
  }, [productionYear, productionMonth])

  useEffect(() => {
    if (jobOrders) {
      const filtered = jobOrders.filter(jo => filterByMonth(jo.createdAt))
      const active = filtered.filter(jo => jo.status === "IN_PROGRESS" || jo.status === "QC_PENDING").length
      const qcRequest = filtered.filter(jo => jo.status === "QC_PENDING").length
      const totalJO = filtered.length
      setStats(prev => ({ ...prev, activeJobs: active, qcRequest, totalJO }))
    }
  }, [jobOrders, filterByMonth])

  useEffect(() => {
    if (transfers) {
      const incomingTransfers = transfers.filter(t => t.type === "INCOMING")
      const transferIn = incomingTransfers.reduce((sum, t) => {
        return sum + (t.items?.reduce((itemSum, item) => itemSum + item.quantity, 0) || 0)
      }, 0)
      const outgoing = transfers.filter(t => t.type === "OUTGOING" && t.status === "PENDING").length
      setStats(prev => ({ 
        ...prev, 
        transferIn,
        transferOut: outgoing 
      }))
    }
  }, [transfers])

  useEffect(() => {
    if (lots) {
      const uniqueProducts = new Set(lots.map(lot => lot.product?.id).filter(Boolean))
      const bahanBakuStok = lots.reduce((sum, lot) => sum + (lot.quantity || 0), 0)
      const bahanBakuTerpakai = lots.reduce((sum, lot) => sum + ((lot.initialQty || 0) - (lot.quantity || 0)), 0)
      setStats(prev => ({ 
        ...prev, 
        totalProducts: uniqueProducts.size,
        bahanBakuStok,
        bahanBakuTerpakai,
      }))
    }
  }, [lots])

  useEffect(() => {
    if (qcReports) {
      const finishedGoodsTotal = qcReports.reduce((sum, r) => sum + (r.successQty || 0), 0)
      setStats(prev => ({ 
        ...prev, 
        totalStock: finishedGoodsTotal
      }))
    }
  }, [qcReports])

  useEffect(() => {
    const fetchSalaryClaims = async () => {
      try {
        const res = await fetch("/api/admin/salary-claims?status=CLAIMED")
        if (res.ok) {
          const data = await res.json()
          setStats(prev => ({ ...prev, persetujuanGaji: Array.isArray(data) ? data.length : 0 }))
        }
      } catch (error) {
        console.error("Error fetching salary claims:", error)
      }
    }
    fetchSalaryClaims()
  }, [])

  useEffect(() => {
    const fetchAdvances = async () => {
      try {
        const res = await fetch("/api/advances?status=PENDING")
        if (res.ok) {
          const data = await res.json()
          setStats(prev => ({ ...prev, persetujuanKasbon: Array.isArray(data) ? data.length : 0 }))
        }
      } catch (error) {
        console.error("Error fetching advances:", error)
      }
    }
    fetchAdvances()
  }, [])

  useEffect(() => {
    if (transactions) {
      // Calculate saldo = INCOME - EXPENSE
      const totalIncome = transactions
        .filter(t => t.type === "INCOME")
        .reduce((sum, t) => sum + (t.amount || 0), 0)
      const totalExpense = transactions
        .filter(t => t.type === "EXPENSE")
        .reduce((sum, t) => sum + (t.amount || 0), 0)
      const saldo = totalIncome - totalExpense
      
      setStats(prev => ({ 
        ...prev, 
        totalSaldo: saldo,
        totalPengeluaran: totalExpense 
      }))
    }
  }, [transactions])



  useEffect(() => {
    if (qcReports) {
      const sukses = qcReports.filter(r => r.successQty > 0).length
      const reject = qcReports.filter(r => r.rejectQty > 0).length
      setStats(prev => ({ 
        ...prev, 
        qcSukses: sukses,
        qcReject: reject 
      }))
    }
  }, [qcReports])

  useEffect(() => {
    if (employees) {
      const filteredEmployees = employees.filter(e => e.email !== "erpkonveksi@gmail.com")
      const karyawans = filteredEmployees.filter(e => e.role === "KARYAWAN").length
      setStats(prev => ({ 
        ...prev, 
        totalKaryawan: karyawans 
      }))
    }
  }, [employees])

  useEffect(() => {
    if (maintenance) {
      const pending = maintenance.filter(m => m.status === "PENDING").length
      setStats(prev => ({ 
        ...prev, 
        maintenancePending: pending 
      }))
    }
  }, [maintenance])

  const recentJobOrders = (jobOrders || []).slice(0, 4)
  const recentTransfers = (transfers || []).slice(0, 4)

  return (
    <div className="page-container p-3 md:p-6 pt-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-5">
        <div>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Overview sistem ERP Konveksi
          </p>
        </div>
        <div className="text-xs sm:text-sm text-muted-foreground">
          {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

      {/* Cards Row 1 - Main Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
        <StatCard
          title="Saldo"
          value={formatCurrency(stats.totalSaldo)}
          icon={WalletIcon}
          iconColor="text-emerald-600"
          href="/overview/finance"
          delay={0}
        />
        <StatCard
          title="Pengeluaran"
          value={formatCurrency(stats.totalPengeluaran)}
          icon={ReceiptPercentIcon}
          iconColor="text-red-600"
          href="/overview/finance"
          delay={50}
        />
        <StatCard
          title="Total SKU"
          value={stats.totalProducts}
          icon={ArchiveBoxIcon}
          iconColor="text-[var(--chart-blue)]"
          delay={100}
          href="/dashboard/inventory/products"
        />
        <StatCard
          title="Finished Goods"
          value={stats.totalStock.toLocaleString()}
          icon={CubeIcon}
          iconColor="text-[var(--chart-blue)]"
          href="/dashboard/inventory/finished"
          delay={150}
        />
        <StatCard
          title="Barang Masuk"
          value={stats.transferIn}
          icon={ArrowDownIcon}
          iconColor="text-amber-600"
          href="/dashboard/transfer/incoming"
          delay={200}
        />
        <StatCard
          title="Barang Keluar"
          value={stats.transferOut}
          icon={ArrowUpIcon}
          iconColor="text-cyan-600"
          href="/dashboard/transfer/outgoing"
          delay={250}
        />
      </div>

      {/* Cards Row 2 - Compact Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
        <CompactStat title="Total JO" value={stats.totalJO} icon={ListBulletIcon} iconColor="text-slate-600" href="/dashboard/produksi" delay={100} />
        <CompactStat title="QC Request" value={stats.qcRequest} icon={BellIcon} iconColor="text-amber-600" href="/dashboard/qc-reports" delay={120} />
        <CompactStat title="QC Reject" value={stats.qcReject} icon={ExclamationTriangleIcon} iconColor="text-red-600" href="/dashboard/inventory/rejects" delay={150} />
        <CompactStat title="QC OK" value={stats.qcSukses} icon={ClipboardDocumentCheckIcon} iconColor="text-emerald-600" href="/dashboard/qc-reports" delay={200} />
        <CompactStat title="Karyawan" value={stats.totalKaryawan} icon={UsersIcon} iconColor="text-purple-600" href="/dashboard/employees" delay={250} />
      </div>

      {/* Cards Row 3 - Compact Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
        <CompactStat title="Pers. Gaji" value={stats.persetujuanGaji} icon={CurrencyDollarIcon} iconColor="text-amber-600" href="/dashboard/employees/salary-claims" delay={260} />
        <CompactStat title="Pers. Kasbon" value={stats.persetujuanKasbon} icon={BanknotesIcon} iconColor="text-teal-600" href="/dashboard/employees/advances" delay={270} />
        <CompactStat title="Maintenance" value={stats.maintenancePending} icon={WrenchIcon} iconColor="text-orange-600" href="/dashboard/assets/maintenance" delay={280} />
        <CompactStat title="Bahan Baku Stok" value={stats.bahanBakuStok.toLocaleString()} icon={BeakerIcon} iconColor="text-[var(--chart-blue)]" href="/dashboard/inventory/materials" delay={300} />
        <CompactStat title="Bahan Baku Terpakai" value={stats.bahanBakuTerpakai.toLocaleString()} icon={BeakerIcon} iconColor="text-orange-600" href="/dashboard/inventory/materials" delay={350} />
      </div>

      {/* Charts Row 1 - Keuangan */}
      <FinanceLineChart
        data={financeData}
        lines={[
          { dataKey: "saldo", color: "var(--brand-primary)", name: "Saldo" },
          { dataKey: "pemasukan", color: "var(--success)", name: "Pemasukan" },
          { dataKey: "pengeluaran", color: "var(--destructive)", name: "Pengeluaran" },
        ]}
        xAxisKey="month"
        year={financeYear}
        onYearChange={setFinanceYear}
      />

      {/* Charts Row 2 - Transfer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
        <div className="lg:col-span-2">
          <InventoryBarChart
            data={inventoryData}
            xAxisKey="month"
            year={inventoryYear}
            onYearChange={setInventoryYear}
            currentStock={inventorySummary.currentStock}
          />
        </div>
        <div>
          <ProduksiProgressChart
            produksiMasuk={stats.produksiMasuk}
            barangJadi={stats.finishedGoods}
            sisaStok={Math.max(stats.produksiMasuk - stats.finishedGoods, 0)}
            year={productionYear}
            month={productionMonth}
            onYearChange={setProductionYear}
            onMonthChange={setProductionMonth}
          />
        </div>
      </div>

      {/* Charts Row 3 - Raw Material */}
      <RawMaterialBarChart
        data={rawMaterialData}
        xAxisKey="month"
        year={rawMaterialYear}
        onYearChange={setRawMaterialYear}
        summary={rawMaterialSummary}
      />

      {/* Tables Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
        {/* Job Order Table */}
        <Card className="overflow-hidden animate-slide-up" style={{ animationDelay: '300ms' }}>
          <CardHeader className="pb-2 px-3 sm:px-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
                  <BuildingLibraryIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  Job Order Terbaru
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-xs">Daftar job order produksi</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-7 text-[10px] sm:text-xs hover:bg-primary/10 hover:text-primary">
                <Link href="/dashboard/produksi">
                  Lihat
                  <ArrowRightIcon className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
            {recentJobOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BuildingLibraryIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-xs sm:text-sm">Belum ada job order</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {recentJobOrders.map((jo, idx) => (
                  <div 
                    key={jo.id} 
                    className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl border border-border/50 hover:bg-accent/50 hover:border-primary/30 hover:shadow-md transition-all duration-200 group cursor-pointer"
                    style={{ animationDelay: `${350 + idx * 50}ms` }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-xs sm:text-sm truncate">{jo.joNumber}</span>
                        <Badge className={`${statusColors[jo.status] || "bg-muted"} backdrop-blur-sm`}>
                          {statusLabels[jo.status] || jo.status}
                        </Badge>
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{jo.product?.name || "-"}</p>
                    </div>
                    <div className="text-right flex-shrink-0 w-20 sm:w-24">
                      <p className="text-[10px] sm:text-xs font-medium">{jo.completedQty}/{jo.targetQty}</p>
                      <div className="w-full h-1.5 bg-muted/50 rounded-full mt-1 overflow-hidden backdrop-blur-sm">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-[var(--chart-blue)] rounded-full transition-all duration-500 shadow-[0_0_8px_var(--chart-blue)] dark:shadow-[0_0_12px_var(--chart-blue)]"
                          style={{ width: `${Math.min((jo.completedQty / jo.targetQty) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transfer Table */}
        <Card className="overflow-hidden animate-slide-up" style={{ animationDelay: '350ms' }}>
          <CardHeader className="pb-2 px-3 sm:px-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
                  <TruckIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  Transfer Terbaru
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-xs">Transfer antar gudang</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-7 text-[10px] sm:text-xs">
                <Link href="/dashboard/transfer">
                  Lihat
                  <ArrowRightIcon className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
            {trLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentTransfers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TruckIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-xs sm:text-sm">Belum ada transfer</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {recentTransfers.map((transfer) => (
                  <div key={transfer.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                    <div className={`p-1.5 rounded-lg flex-shrink-0 ${transfer.type === "INCOMING" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30" : "bg-[var(--chart-blue)]/20 text-[var(--chart-blue)] dark:bg-[var(--chart-blue)]/20"}`}>
                      {transfer.type === "INCOMING" ? (
                        <ArrowDownIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <ArrowUpIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-xs sm:text-sm truncate">{transfer.transferNumber}</span>
                        <Badge className={`${statusColors[transfer.status] || "bg-muted"} backdrop-blur-sm`}>
                          {statusLabels[transfer.status] || transfer.status}
                        </Badge>
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {transfer.type === "INCOMING" ? "Barang Masuk" : "Barang Keluar"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
