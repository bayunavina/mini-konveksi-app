"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { PageHeader } from "@/components/shared"
import { ExportPrint } from "@/components/shared/export-print"
import { ArrowLeftIcon, CubeIcon, CheckIcon, EyeIcon } from "@heroicons/react/24/outline"
import { useFetch } from "@/hooks/useFetch"
import { formatDate } from "@/lib/utils"

interface Transfer {
  id: string
  transferNumber: string
  type: string
  fromWarehouseId?: string
  toWarehouseId?: string
  status: string
  notes?: string
  createdAt: string
}

interface Warehouse {
  id: string
  code: string
  name: string
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu",
  IN_PROGRESS: "Dalam Proses",
  COMPLETED: "Selesai",
}

export default function FinishedTransferPage() {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null)

  const { data: allTransfers, loading, refetch } = useFetch<Transfer[]>("/api/transfers")
  const { data: warehouses } = useFetch<Warehouse[]>("/api/warehouses")

  const finishedTransfers = (allTransfers || []).filter(t => t.type === "OUTGOING" || t.type === "INCOMING")

  const handleView = (transfer: Transfer) => {
    setSelectedTransfer(transfer)
    setDialogOpen(true)
  }

  const handleClose = () => {
    setDialogOpen(false)
    setSelectedTransfer(null)
  }

  const pendingCount = finishedTransfers.filter(t => t.status === "PENDING").length
  const inProgressCount = finishedTransfers.filter(t => t.status === "IN_PROGRESS").length
  const completedCount = finishedTransfers.filter(t => t.status === "COMPLETED").length

  const getWarehouseName = (id?: string) => {
    if (!id || !warehouses) return "-"
    const wh = warehouses.find(w => w.id === id)
    return wh?.name || "-"
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Barang Jadi"
        description="Transfer barang jadi dari produksi ke gudang"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/dashboard/transfer")}>
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Kembali
            </Button>
            <Button asChild>
              <Link href="/dashboard/transfer/finished/new">
                <CubeIcon className="mr-2 h-4 w-4" />
                Transfer Baru
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transfer</CardTitle>
            <CubeIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "-" : finishedTransfers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menunggu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{loading ? "-" : pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dalam Proses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--chart-blue)]">{loading ? "-" : inProgressCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selesai</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{loading ? "-" : completedCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Daftar Transfer Barang Jadi</CardTitle>
              <CardDescription>Riwayat transfer barang jadi</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Refresh
              </Button>
              <ExportPrint
                title="Daftar Transfer Barang Jadi"
                filename="transfer-barang-jadi"
                columns={[
                  { key: "transferNumber", label: "No. Transfer" },
                  { key: "from", label: "Dari" },
                  { key: "to", label: "Ke" },
                  { key: "createdAt", label: "Tanggal" },
                  { key: "status", label: "Status" },
                ]}
                data={finishedTransfers.map(t => ({
                  transferNumber: t.transferNumber,
                  from: getWarehouseName(t.fromWarehouseId),
                  to: getWarehouseName(t.toWarehouseId),
                  createdAt: formatDate(t.createdAt),
                  status: STATUS_LABELS[t.status] || t.status,
                }))}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : finishedTransfers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Belum ada transfer</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Transfer</TableHead>
                  <TableHead>Dari</TableHead>
                  <TableHead>Ke</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {finishedTransfers.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell className="font-mono font-medium">{transfer.transferNumber}</TableCell>
                    <TableCell>{getWarehouseName(transfer.fromWarehouseId)}</TableCell>
                    <TableCell>{getWarehouseName(transfer.toWarehouseId)}</TableCell>
                    <TableCell>{formatDate(transfer.createdAt)}</TableCell>
                    <TableCell>
                      <Badge className={`${STATUS_COLORS[transfer.status] || "bg-gray-100"}`}>
                        {STATUS_LABELS[transfer.status] || transfer.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex justify-center">
                      <Button size="sm" variant="outline" onClick={() => handleView(transfer)}>
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open)
        if (!open) setSelectedTransfer(null)
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Detail Transfer</DialogTitle>
            <DialogDescription>
              {selectedTransfer ? `Transfer ${selectedTransfer.transferNumber}` : ""}
            </DialogDescription>
          </DialogHeader>
          {selectedTransfer ? (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">No. Transfer</p>
                  <p className="font-medium font-mono">{selectedTransfer.transferNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal</p>
                  <p className="font-medium">{new Date(selectedTransfer.createdAt).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                  })}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Dari Gudang</p>
                  <p className="font-medium">{getWarehouseName(selectedTransfer.fromWarehouseId)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ke Gudang</p>
                  <p className="font-medium">{getWarehouseName(selectedTransfer.toWarehouseId)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={`${STATUS_COLORS[selectedTransfer.status] || "bg-gray-100"}`}>
                    {STATUS_LABELS[selectedTransfer.status] || selectedTransfer.status}
                  </Badge>
              </div>
              {selectedTransfer.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Catatan</p>
                  <p className="font-medium">{selectedTransfer.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-4 text-center text-muted-foreground">
              Memuat data...
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Tutup
            </Button>
            {selectedTransfer?.status === "PENDING" && (
              <Button>
                <CheckIcon className="mr-2 h-4 w-4" />
                Proses Transfer
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
