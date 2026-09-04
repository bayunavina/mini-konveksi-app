"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/shared"
import { ExportPrint } from "@/components/shared/export-print"
import { useFetch } from "@/hooks/useFetch"
import {
  ScaleIcon,
  CubeIcon,
  ClipboardDocumentListIcon,
  BuildingStorefrontIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline"
import { RefreshButton } from "@/components/ui/refresh-button"

interface MaterialBalanceRow {
  id: string
  lotNumber: string
  qrCode: string
  skuCode: string | null
  skuName: string | null
  initialQty: number
  quantity: number
  usedQty: number
  producedQty: number
  qcSuccess: number
  qcReject: number
  qcTotal: number
  lotDeviation: number
  qcDeviation: number
  totalDeviation: number
  status: string
  lotStatus: string
  createdAt: string
}

interface ProductionBalanceRow {
  id: string
  joNumber: string
  lotNumber: string
  employeeName: string
  targetQty: number
  completedQty: number
  rejectedQty: number
  acceptedQty: number
  pendingQty: number
  progressTotal: number
  progressCount: number
  status: string
  assignmentDeviation: number
  totalDeviation: number
  balanceStatus: string
  hasProgressMismatch: boolean
}

interface StockBalanceRow {
  id: string
  productId: string | null
  productSku: string
  productName: string
  warehouseId: string | null
  warehouseName: string
  warehouseCode: string
  systemQty: number
  computedQty: number
  deviation: number
  absDeviation: number
  status: string
}

interface BalanceSummary {
  material: { initial: number; remaining: number; used: number; produced: number; deviation: number; status: string; lotsCount: number }
  production: { target: number; completed: number; rejected: number; accepted: number; pending: number; progress: number; deviation: number; status: string; assignmentsCount: number }
  qc: { success: number; reject: number; total: number; deviation: number; status: string; reportsCount: number }
  stock: { system: number; computed: number; deviation: number; status: string; stockRows: number; movementsCount: number }
  transfer: { totalQty: number; pending: number; completed: number; total: number; itemsCount: number }
  overall: { totalDeviation: number; isBalanced: boolean; deviatedModules: string[] }
}

export default function BalancePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("material")
  const [searchMaterial, setSearchMaterial] = useState("")
  const [searchProduction, setSearchProduction] = useState("")
  const [searchStock, setSearchStock] = useState("")

  const { data: materialData, loading: loadingMaterial, refetch: refetchMaterial } = useFetch<{ data: MaterialBalanceRow[]; summary: { total: number; balanced: number; deviated: number; totalDeviation: number } }>("/api/balance/material-lots")
  const { data: productionData, loading: loadingProduction, refetch: refetchProduction } = useFetch<{ data: ProductionBalanceRow[]; summary: { total: number; balanced: number; deviated: number; totalDeviation: number } }>("/api/balance/production")
  const { data: stockData, loading: loadingStock, refetch: refetchStock } = useFetch<{ data: StockBalanceRow[]; summary: { total: number; balanced: number; deviated: number; orphan: number; totalDeviation: number } }>("/api/balance/stock")
  const { data: summaryData, loading: loadingSummary, refetch: refetchSummary } = useFetch<BalanceSummary>("/api/balance/summary")

  const refetchAll = () => {
    refetchMaterial()
    refetchProduction()
    refetchStock()
    refetchSummary()
  }

  const filteredMaterial = (materialData?.data || []).filter(r => {
    if (!searchMaterial) return true
    const s = searchMaterial.toLowerCase()
    return r.lotNumber.toLowerCase().includes(s) || r.qrCode.toLowerCase().includes(s) || (r.skuCode || "").toLowerCase().includes(s) || (r.skuName || "").toLowerCase().includes(s)
  })

  const filteredProduction = (productionData?.data || []).filter(r => {
    if (!searchProduction) return true
    const s = searchProduction.toLowerCase()
    return r.joNumber.toLowerCase().includes(s) || r.lotNumber.toLowerCase().includes(s) || r.employeeName.toLowerCase().includes(s)
  })

  const filteredStock = (stockData?.data || []).filter(r => {
    if (!searchStock) return true
    const s = searchStock.toLowerCase()
    return r.productSku.toLowerCase().includes(s) || r.productName.toLowerCase().includes(s) || r.warehouseName.toLowerCase().includes(s)
  })

  const s = summaryData

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Balance Report"
        description="Rekapan keseimbangan qty: masuk, proses, keluar — deteksi deviasi"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            <RefreshButton size="default" onClick={refetchAll} variant="outline" />
          </div>
        }
      />

      {/* Summary Stats */}
      {loadingSummary ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : s ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card className={s.material.status === "DEVIATED" ? "border-red-300 bg-red-50/50 dark:bg-red-950/10" : "border-green-200 bg-green-50/50 dark:bg-green-950/10"}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bahan Baku</CardTitle>
                <CubeIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.material.used} <span className="text-sm font-normal text-muted-foreground">/ {s.material.initial}</span></div>
                <p className="text-xs text-muted-foreground">Produksi: {s.material.produced} | Sisa: {s.material.remaining}</p>
                <div className="mt-2 flex items-center gap-2">
                  {s.material.status === "DEVIATED" ? <Badge className="bg-red-100 text-red-700">Deviasi {s.material.deviation}</Badge> : <Badge className="bg-green-100 text-green-700">Balance</Badge>}
                  <span className="text-xs text-muted-foreground">{s.material.lotsCount} lot</span>
                </div>
              </CardContent>
            </Card>

            <Card className={s.production.status === "DEVIATED" ? "border-red-300 bg-red-50/50 dark:bg-red-950/10" : "border-green-200 bg-green-50/50 dark:bg-green-950/10"}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Produksi</CardTitle>
                <ClipboardDocumentListIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.production.completed} <span className="text-sm font-normal text-muted-foreground">/ {s.production.target}</span></div>
                <p className="text-xs text-muted-foreground">Pending: {s.production.pending} | Reject: {s.production.rejected}</p>
                <div className="mt-2 flex items-center gap-2">
                  {s.production.status === "DEVIATED" ? <Badge className="bg-red-100 text-red-700">Deviasi {s.production.deviation}</Badge> : <Badge className="bg-green-100 text-green-700">Balance</Badge>}
                  <span className="text-xs text-muted-foreground">{s.production.assignmentsCount} assign</span>
                </div>
              </CardContent>
            </Card>

            <Card className={s.stock.status === "DEVIATED" ? "border-red-300 bg-red-50/50 dark:bg-red-950/10" : "border-green-200 bg-green-50/50 dark:bg-green-950/10"}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stok Gudang</CardTitle>
                <BuildingStorefrontIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.stock.system} <span className="text-sm font-normal text-muted-foreground">vs {s.stock.computed}</span></div>
                <p className="text-xs text-muted-foreground">System vs Recomputed</p>
                <div className="mt-2 flex items-center gap-2">
                  {s.stock.status === "DEVIATED" ? <Badge className="bg-red-100 text-red-700">Deviasi {s.stock.deviation}</Badge> : <Badge className="bg-green-100 text-green-700">Balance</Badge>}
                  <span className="text-xs text-muted-foreground">{s.stock.stockRows} rows</span>
                </div>
              </CardContent>
            </Card>

            <Card className={s.overall.isBalanced ? "border-green-200 bg-green-50/50 dark:bg-green-950/10" : "border-orange-200 bg-orange-50/50 dark:bg-orange-950/10"}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Deviasi Total</CardTitle>
                {s.overall.isBalanced ? <CheckCircleIcon className="h-4 w-4 text-green-600" /> : <ExclamationTriangleIcon className="h-4 w-4 text-orange-500" />}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${s.overall.isBalanced ? "text-green-600" : "text-orange-600"}`}>{s.overall.totalDeviation}</div>
                <p className="text-xs text-muted-foreground">{s.overall.isBalanced ? "Semua balance" : `Deviasi di: ${s.overall.deviatedModules.join(", ")}`}</p>
                <div className="mt-2 flex items-center gap-2">
                  {s.overall.isBalanced ? <Badge className="bg-green-100 text-green-700">OK</Badge> : <Badge className="bg-orange-100 text-orange-700">Perlu Perhatian</Badge>}
                  <span className="text-xs text-muted-foreground">QC: {s.qc.success} OK / {s.qc.reject} reject</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary row */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Transfer</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm">
                  <span><b>{s.transfer.completed}</b> selesai</span>
                  <span className="text-orange-600"><b>{s.transfer.pending}</b> pending</span>
                  <span className="text-muted-foreground">{s.transfer.total} total ({s.transfer.itemsCount} items)</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">QC Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600"><b>{s.qc.success}</b> lolos</span>
                  <span className="text-red-600"><b>{s.qc.reject}</b> reject</span>
                  <span className="text-muted-foreground">{s.qc.reportsCount} laporan</span>
                  {s.qc.status === "DEVIATED" && <Badge className="bg-red-100 text-red-700">Deviasi {s.qc.deviation}</Badge>}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Produksi Detail</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm">
                  <span><b>{s.production.accepted}</b> accepted</span>
                  <span className="text-orange-600"><b>{s.production.pending}</b> pending</span>
                  <span className="text-muted-foreground">progress {s.production.progress}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="material" className="flex items-center gap-2"><CubeIcon className="h-4 w-4" /> Bahan Baku</TabsTrigger>
          <TabsTrigger value="production" className="flex items-center gap-2"><ClipboardDocumentListIcon className="h-4 w-4" /> Produksi</TabsTrigger>
          <TabsTrigger value="stock" className="flex items-center gap-2"><BuildingStorefrontIcon className="h-4 w-4" /> Stok</TabsTrigger>
          <TabsTrigger value="deviasi" className="flex items-center gap-2"><ScaleIcon className="h-4 w-4" /> Deviasi</TabsTrigger>
        </TabsList>

        {/* Material Tab */}
        <TabsContent value="material" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Balance Bahan Baku</CardTitle>
                  <CardDescription>Awal vs Sisa vs Terpakai vs Produksi vs QC — per lot</CardDescription>
                </div>
                <ExportPrint
                  columns={[
                    { key: "lotNumber", label: "Lot" },
                    { key: "skuCode", label: "Kode" },
                    { key: "initialQty", label: "Awal" },
                    { key: "quantity", label: "Sisa" },
                    { key: "usedQty", label: "Terpakai" },
                    { key: "producedQty", label: "Produksi" },
                    { key: "qcSuccess", label: "QC OK" },
                    { key: "qcReject", label: "QC Reject" },
                    { key: "totalDeviation", label: "Selisih" },
                    { key: "status", label: "Status" },
                  ]}
                  data={filteredMaterial as unknown as Record<string, unknown>[]}
                  title="Balance Bahan Baku"
                  filename={`balance-bahan-${new Date().toISOString().split("T")[0]}`}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Cari lot, QR, kode..." value={searchMaterial} onChange={e => setSearchMaterial(e.target.value)} className="pl-9" />
                </div>
              </div>

              {loadingMaterial ? (
                <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : filteredMaterial.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Tidak ada data</div>
              ) : (
                <div className="overflow-x-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-8 text-center">No</TableHead>
                        <TableHead>Lot</TableHead>
                        <TableHead>Kode</TableHead>
                        <TableHead className="text-center">Awal</TableHead>
                        <TableHead className="text-center">Sisa</TableHead>
                        <TableHead className="text-center">Terpakai</TableHead>
                        <TableHead className="text-center">Produksi</TableHead>
                        <TableHead className="text-center">QC OK</TableHead>
                        <TableHead className="text-center">QC Reject</TableHead>
                        <TableHead className="text-center">Selisih</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMaterial.map((r, idx) => (
                        <TableRow key={r.id} className={r.status === "DEVIATED" ? "bg-red-50/50 dark:bg-red-950/10" : ""}>
                          <TableCell className="text-center text-xs">{idx + 1}</TableCell>
                          <TableCell className="font-mono text-xs">{r.lotNumber}</TableCell>
                          <TableCell className="text-xs">{r.skuCode || "-"}<br /><span className="text-muted-foreground">{r.skuName || ""}</span></TableCell>
                          <TableCell className="text-center">{r.initialQty}</TableCell>
                          <TableCell className="text-center font-medium">{r.quantity}</TableCell>
                          <TableCell className="text-center text-orange-600">{r.usedQty}</TableCell>
                          <TableCell className="text-center">{r.producedQty}</TableCell>
                          <TableCell className="text-center text-green-600">{r.qcSuccess || "-"}</TableCell>
                          <TableCell className="text-center text-red-600">{r.qcReject || "-"}</TableCell>
                          <TableCell className={`text-center font-bold ${r.totalDeviation !== 0 ? "text-red-600" : "text-green-600"}`}>{r.totalDeviation}</TableCell>
                          <TableCell className="text-center">{r.status === "BALANCED" ? <Badge className="bg-green-100 text-green-700">OK</Badge> : <Badge className="bg-red-100 text-red-700">Deviasi</Badge>}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {filteredMaterial.length > 0 && (
                <div className="mt-4 p-3 bg-muted/30 rounded-lg border flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Menampilkan <b>{filteredMaterial.length}</b> lot — <span className="text-green-600">{materialData?.summary.balanced} OK</span> / <span className="text-red-600">{materialData?.summary.deviated} deviasi</span></span>
                  <span>Total selisih: <b className={materialData?.summary.totalDeviation ? "text-red-600" : "text-green-600"}>{materialData?.summary.totalDeviation}</b></span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Production Tab */}
        <TabsContent value="production" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Balance Produksi</CardTitle>
                  <CardDescription>Target vs selesai vs reject vs pending — per assignment/karyawan</CardDescription>
                </div>
                <ExportPrint
                  columns={[
                    { key: "joNumber", label: "JO" },
                    { key: "employeeName", label: "Karyawan" },
                    { key: "targetQty", label: "Target" },
                    { key: "completedQty", label: "Selesai" },
                    { key: "rejectedQty", label: "Reject" },
                    { key: "acceptedQty", label: "Accepted" },
                    { key: "pendingQty", label: "Pending" },
                    { key: "progressTotal", label: "Progress" },
                    { key: "totalDeviation", label: "Selisih" },
                    { key: "balanceStatus", label: "Status" },
                  ]}
                  data={filteredProduction as unknown as Record<string, unknown>[]}
                  title="Balance Produksi"
                  filename={`balance-produksi-${new Date().toISOString().split("T")[0]}`}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Cari JO, lot, karyawan..." value={searchProduction} onChange={e => setSearchProduction(e.target.value)} className="pl-9" />
                </div>
              </div>

              {loadingProduction ? (
                <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : filteredProduction.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Tidak ada data</div>
              ) : (
                <div className="overflow-x-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-8 text-center">No</TableHead>
                        <TableHead>JO</TableHead>
                        <TableHead>Karyawan</TableHead>
                        <TableHead>Lot</TableHead>
                        <TableHead className="text-center">Target</TableHead>
                        <TableHead className="text-center">Selesai</TableHead>
                        <TableHead className="text-center">Reject</TableHead>
                        <TableHead className="text-center">Accepted</TableHead>
                        <TableHead className="text-center">Pending</TableHead>
                        <TableHead className="text-center">Progress</TableHead>
                        <TableHead className="text-center">Selisih</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProduction.map((r, idx) => (
                        <TableRow key={r.id} className={r.balanceStatus === "DEVIATED" ? "bg-red-50/50 dark:bg-red-950/10" : ""}>
                          <TableCell className="text-center text-xs">{idx + 1}</TableCell>
                          <TableCell className="font-mono text-xs">{r.joNumber}</TableCell>
                          <TableCell className="text-xs">{r.employeeName}</TableCell>
                          <TableCell className="font-mono text-xs">{r.lotNumber}</TableCell>
                          <TableCell className="text-center font-medium">{r.targetQty}</TableCell>
                          <TableCell className="text-center text-green-600">{r.completedQty}</TableCell>
                          <TableCell className="text-center text-red-600">{r.rejectedQty}</TableCell>
                          <TableCell className="text-center">{r.acceptedQty}</TableCell>
                          <TableCell className="text-center text-orange-600">{r.pendingQty}</TableCell>
                          <TableCell className="text-center">{r.progressTotal} <span className="text-xs text-muted-foreground">({r.progressCount}x)</span></TableCell>
                          <TableCell className={`text-center font-bold ${r.totalDeviation !== 0 ? "text-red-600" : "text-green-600"}`}>{r.totalDeviation}</TableCell>
                          <TableCell className="text-center">
                            {r.balanceStatus === "BALANCED" ? <Badge className="bg-green-100 text-green-700">OK</Badge> : <Badge className="bg-red-100 text-red-700">Deviasi</Badge>}
                            {r.hasProgressMismatch && <Badge variant="outline" className="ml-1 text-orange-600 border-orange-300">Mismatch</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {filteredProduction.length > 0 && (
                <div className="mt-4 p-3 bg-muted/30 rounded-lg border flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Menampilkan <b>{filteredProduction.length}</b> assignment — <span className="text-green-600">{productionData?.summary.balanced} OK</span> / <span className="text-red-600">{productionData?.summary.deviated} deviasi</span></span>
                  <span>Total selisih: <b className={productionData?.summary.totalDeviation ? "text-red-600" : "text-green-600"}>{productionData?.summary.totalDeviation}</b></span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Tab */}
        <TabsContent value="stock" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Balance Stok Gudang</CardTitle>
                  <CardDescription>System qty vs recomputed dari inventory movements — per produk per gudang</CardDescription>
                </div>
                <ExportPrint
                  columns={[
                    { key: "productSku", label: "Kode" },
                    { key: "productName", label: "Produk" },
                    { key: "warehouseName", label: "Gudang" },
                    { key: "systemQty", label: "System" },
                    { key: "computedQty", label: "Computed" },
                    { key: "deviation", label: "Selisih" },
                    { key: "status", label: "Status" },
                  ]}
                  data={filteredStock as unknown as Record<string, unknown>[]}
                  title="Balance Stok"
                  filename={`balance-stok-${new Date().toISOString().split("T")[0]}`}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Cari kode, produk, gudang..." value={searchStock} onChange={e => setSearchStock(e.target.value)} className="pl-9" />
                </div>
              </div>

              {loadingStock ? (
                <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : filteredStock.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Tidak ada data stok</div>
              ) : (
                <div className="overflow-x-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-8 text-center">No</TableHead>
                        <TableHead>Kode</TableHead>
                        <TableHead>Produk</TableHead>
                        <TableHead>Gudang</TableHead>
                        <TableHead className="text-center">System</TableHead>
                        <TableHead className="text-center">Computed</TableHead>
                        <TableHead className="text-center">Selisih</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStock.map((r, idx) => (
                        <TableRow key={r.id} className={r.status === "DEVIATED" || r.status === "ORPHAN" ? "bg-red-50/50 dark:bg-red-950/10" : ""}>
                          <TableCell className="text-center text-xs">{idx + 1}</TableCell>
                          <TableCell className="font-mono text-xs">{r.productSku}</TableCell>
                          <TableCell className="text-xs">{r.productName}</TableCell>
                          <TableCell className="text-xs">{r.warehouseName} <span className="text-muted-foreground">({r.warehouseCode})</span></TableCell>
                          <TableCell className="text-center font-medium">{r.systemQty}</TableCell>
                          <TableCell className="text-center">{r.computedQty}</TableCell>
                          <TableCell className={`text-center font-bold ${r.deviation !== 0 ? "text-red-600" : "text-green-600"}`}>{r.deviation}</TableCell>
                          <TableCell className="text-center">
                            {r.status === "BALANCED" && <Badge className="bg-green-100 text-green-700">OK</Badge>}
                            {r.status === "DEVIATED" && <Badge className="bg-red-100 text-red-700">Deviasi</Badge>}
                            {r.status === "ORPHAN" && <Badge className="bg-orange-100 text-orange-700">Orphan</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {filteredStock.length > 0 && (
                <div className="mt-4 p-3 bg-muted/30 rounded-lg border flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Menampilkan <b>{filteredStock.length}</b> — <span className="text-green-600">{stockData?.summary.balanced} OK</span> / <span className="text-red-600">{stockData?.summary.deviated} deviasi</span> {stockData?.summary.orphan ? <span className="text-orange-600">/ {stockData?.summary.orphan} orphan</span> : null}</span>
                  <span>Total selisih: <b className={stockData?.summary.totalDeviation ? "text-red-600" : "text-green-600"}>{stockData?.summary.totalDeviation}</b></span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deviasi Summary Tab */}
        <TabsContent value="deviasi" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ExclamationTriangleIcon className="h-5 w-5 text-orange-500" /> Ringkasan Deviasi</CardTitle>
              <CardDescription>Gabungan semua deviasi dari semua modul — untuk laporan</CardDescription>
            </CardHeader>
            <CardContent>
              {!s ? (
                <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : s.overall.isBalanced ? (
                <div className="text-center py-12">
                  <CheckCircleIcon className="h-16 w-16 mx-auto text-green-500 mb-4" />
                  <p className="text-lg font-medium text-green-700">Semua Balance!</p>
                  <p className="text-sm text-muted-foreground">Tidak ada deviasi terdeteksi di semua modul</p>
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Modul</TableHead>
                        <TableHead>Deskripsi</TableHead>
                        <TableHead className="text-center">Expected</TableHead>
                        <TableHead className="text-center">Actual</TableHead>
                        <TableHead className="text-center">Selisih</TableHead>
                        <TableHead className="text-center">Severity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {s.material.status === "DEVIATED" && (
                        <TableRow className="bg-red-50/50">
                          <TableCell><Badge variant="outline" className="bg-orange-50">Bahan Baku</Badge></TableCell>
                          <TableCell className="text-sm">Bahan terpakai ({s.material.used}) vs produksi ({s.material.produced})</TableCell>
                          <TableCell className="text-center">{s.material.used}</TableCell>
                          <TableCell className="text-center">{s.material.produced}</TableCell>
                          <TableCell className="text-center font-bold text-red-600">{s.material.deviation}</TableCell>
                          <TableCell className="text-center"><Badge className="bg-red-100 text-red-700">HIGH</Badge></TableCell>
                        </TableRow>
                      )}
                      {s.production.status === "DEVIATED" && (
                        <TableRow className="bg-red-50/50">
                          <TableCell><Badge variant="outline" className="bg-blue-50">Produksi</Badge></TableCell>
                          <TableCell className="text-sm">Target vs completed+rejected (assignments COMPLETED)</TableCell>
                          <TableCell className="text-center">{s.production.target}</TableCell>
                          <TableCell className="text-center">{s.production.completed + s.production.rejected}</TableCell>
                          <TableCell className="text-center font-bold text-red-600">{s.production.deviation}</TableCell>
                          <TableCell className="text-center"><Badge className="bg-orange-100 text-orange-700">MEDIUM</Badge></TableCell>
                        </TableRow>
                      )}
                      {s.qc.status === "DEVIATED" && (
                        <TableRow className="bg-red-50/50">
                          <TableCell><Badge variant="outline" className="bg-purple-50">QC</Badge></TableCell>
                          <TableCell className="text-sm">Produksi ({s.material.produced}) vs QC total ({s.qc.total})</TableCell>
                          <TableCell className="text-center">{s.material.produced}</TableCell>
                          <TableCell className="text-center">{s.qc.total}</TableCell>
                          <TableCell className="text-center font-bold text-red-600">{s.qc.deviation}</TableCell>
                          <TableCell className="text-center"><Badge className="bg-yellow-100 text-yellow-700">LOW</Badge></TableCell>
                        </TableRow>
                      )}
                      {s.stock.status === "DEVIATED" && (
                        <TableRow className="bg-red-50/50">
                          <TableCell><Badge variant="outline" className="bg-green-50">Stok</Badge></TableCell>
                          <TableCell className="text-sm">System stock vs computed dari movements</TableCell>
                          <TableCell className="text-center">{s.stock.computed}</TableCell>
                          <TableCell className="text-center">{s.stock.system}</TableCell>
                          <TableCell className="text-center font-bold text-red-600">{s.stock.deviation}</TableCell>
                          <TableCell className="text-center"><Badge className="bg-red-100 text-red-700">CRITICAL</Badge></TableCell>
                        </TableRow>
                      )}
                      {s.overall.deviatedModules.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Tidak ada deviasi</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detailed per-module breakdown for report */}
          {s && !s.overall.isBalanced && (
            <Card>
              <CardHeader>
                <CardTitle>Detail Deviasi per Modul</CardTitle>
                <CardDescription>Gunakan untuk laporan harian/mingguan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between p-3 bg-muted/30 rounded-lg border">
                    <span>Bahan: {s.material.used} terpakai → {s.material.produced} produksi</span>
                    <span className={s.material.deviation ? "text-red-600 font-bold" : "text-green-600"}>Selisih: {s.material.deviation}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-muted/30 rounded-lg border">
                    <span>Produksi: {s.production.target} target → {s.production.completed + s.production.rejected} realisasi</span>
                    <span className={s.production.deviation ? "text-red-600 font-bold" : "text-green-600"}>Selisih: {s.production.deviation}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-muted/30 rounded-lg border">
                    <span>QC: {s.qc.success} lolos + {s.qc.reject} reject = {s.qc.total} total</span>
                    <span className={s.qc.deviation ? "text-red-600 font-bold" : "text-green-600"}>Selisih vs produksi: {s.qc.deviation}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-muted/30 rounded-lg border">
                    <span>Stok: system {s.stock.system} vs computed {s.stock.computed}</span>
                    <span className={s.stock.deviation ? "text-red-600 font-bold" : "text-green-600"}>Selisih: {s.stock.deviation}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <span className="font-medium">TOTAL DEVIASI KESELURUHAN</span>
                    <span className="font-bold text-orange-600">{s.overall.totalDeviation}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Tip: Export tiap tab ke CSV/Print untuk lampiran laporan. Tab ini merangkum semua selisih lintas modul.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
