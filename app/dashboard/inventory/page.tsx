"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/shared"
import { CubeIcon, ArrowRightIcon, ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/outline"
import { useFetch } from "@/hooks/useFetch"

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

interface QCReport {
  id: string
  successQty: number
  rejectQty: number
}

interface TransferItem {
  id: string
  quantity: number
}

interface Transfer {
  id: string
  transferNumber: string
  status: string
  type: string
  items?: TransferItem[]
  createdAt: string
}

interface Movement {
  id: string
  type: string
  quantity: number
  reference?: string
  notes?: string
  createdAt: string
  product?: {
    name: string
    sku: string
  }
  warehouse?: {
    name: string
  }
}

export default function InventoryPage() {
  const { data: lots, loading: lotsLoading } = useFetch<MaterialLot[]>("/api/material-lots")
  const { data: qcReports, loading: qcLoading } = useFetch<QCReport[]>("/api/qc-reports")
  const { data: transfers, loading: transfersLoading } = useFetch<Transfer[]>("/api/transfers")
  const { data: movementsData } = useFetch<{movements: Movement[], summary: { totalIn: number; totalOut: number }}>("/api/inventory/movements?limit=10")

  const loading = lotsLoading || qcLoading || transfersLoading

  const uniqueProducts = lots ? new Set(lots.map(lot => lot.product?.id).filter(Boolean)).size : 0
  const finishedGoods = qcReports ? qcReports.reduce((sum, r) => sum + (r.successQty || 0), 0) : 0
  const totalStock = lots ? lots.reduce((sum, lot) => sum + (lot.quantity || 0), 0) : 0
  
  const totalIncoming = transfers 
    ? transfers.filter(t => t.type === "INCOMING").reduce((sum, t) => sum + (t.items?.reduce((s, i) => s + i.quantity, 0) || 0), 0)
    : 0
  const totalOutgoing = transfers 
    ? transfers.filter(t => t.type === "OUTGOING").reduce((sum, t) => sum + (t.items?.reduce((s, i) => s + i.quantity, 0) || 0), 0)
    : 0
  
  const recentMovements = movementsData?.movements || []

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Stok"
        description="Kelola stok bahan baku dan barang jadi"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bahan Baku</CardTitle>
            <CubeIcon className="h-4 w-4 text-[var(--chart-blue)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : uniqueProducts}
            </div>
            <p className="text-xs text-muted-foreground">Jenis bahan terdaftar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Barang Jadi</CardTitle>
            <CubeIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : finishedGoods.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Produk tersedia</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stok</CardTitle>
            <CubeIcon className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : totalStock.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Unit tersimpan</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Menu Stok</CardTitle>
              <CardDescription>Pilih kategori untuk melihat detail</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Link href="/dashboard/inventory/materials">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Bahan Baku
                  <ArrowRightIcon className="h-4 w-4" />
                </CardTitle>
                <CardDescription>Stok kain, benang, kancing</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/dashboard/inventory/finished">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Barang Jadi
                  <ArrowRightIcon className="h-4 w-4" />
                </CardTitle>
                <CardDescription>Produk siap jual</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/dashboard/inventory/rejects">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Reject
                  <ArrowRightIcon className="h-4 w-4" />
                </CardTitle>
                <CardDescription>Barang gagal QC</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpIcon className="h-4 w-4 text-green-600" />
              Total Masuk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{totalIncoming.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Pcs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownIcon className="h-4 w-4 text-red-600" />
              Total Keluar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{totalOutgoing.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Pcs</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Movement Terakhir</CardTitle>
          <CardDescription>Riwayat pergerakan stok terbaru</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : recentMovements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Belum ada pergerakan stok</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentMovements.map((movement) => (
                <div key={movement.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Badge variant={movement.type === "IN" || movement.type === "QC_COMPLETE" ? "default" : "secondary"}>
                      {movement.type === "IN" || movement.type === "QC_COMPLETE" ? (
                        <ArrowUpIcon className="h-3 w-3 mr-1" />
                      ) : (
                        <ArrowDownIcon className="h-3 w-3 mr-1" />
                      )}
                    </Badge>
                    <div>
                      <p className="font-medium">{movement.product?.name || movement.reference || "Movement"}</p>
                      <p className="text-xs text-muted-foreground">
                        {movement.warehouse?.name || "-"} - {movement.notes || "-"}
                      </p>
                    </div>
                  </div>
                  <p className={`font-medium ${movement.quantity >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {movement.quantity >= 0 ? "+" : ""}{movement.quantity} Pcs
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
