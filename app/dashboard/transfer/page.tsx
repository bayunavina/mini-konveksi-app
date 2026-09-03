"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
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
import { PageHeader } from "@/components/shared"
import { ExportPrint } from "@/components/shared/export-print"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TruckIcon, ArrowRightIcon, EyeIcon } from "@heroicons/react/24/outline"
import { useFetch } from "@/hooks/useFetch"
import { formatDate, formatDateLong } from "@/lib/utils"

interface Transfer {
  id: string
  transferNumber: string
  type: string
  fromWarehouseId?: string
  toWarehouseId?: string
  status: string
  notes?: string
  createdAt: string
  items?: TransferItem[]
}

interface TransferItem {
  id: string
  productId: string
  quantity: number
  unit: string
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu",
  SHIPPED: "Dikirim",
  RECEIVED: "Diterima",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  SHIPPED: "bg-blue-100 text-blue-800",
  RECEIVED: "bg-green-100 text-green-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
}

export default function TransferPage() {
  const router = useRouter()
  const { data: transfers, loading, error, refetch } = useFetch<Transfer[]>("/api/transfers")
  const [stats, setStats] = useState({ incoming: 0, outgoing: 0, finished: 0, total: 0 })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null)

  useEffect(() => {
    if (transfers) {
      const incoming = transfers.filter(t => t.type === "INCOMING").length
      const outgoing = transfers.filter(t => t.type === "OUTGOING").length
      const finished = transfers.filter(t => t.type === "FINISHED").length
      setStats({ incoming, outgoing, finished, total: transfers.length })
    }
  }, [transfers])

  const handleView = (transfer: Transfer) => {
    setSelectedTransfer(transfer)
    setDialogOpen(true)
  }

  const handleClose = () => {
    setDialogOpen(false)
    setSelectedTransfer(null)
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Transfer"
        description="Kelola transfer barang antar gudang"
        actions={
          <Button onClick={() => router.push("/dashboard/transfer/new")} className="dark:bg-[var(--brand-primary)] dark:hover:bg-[var(--brand-primary)]/80">
            <TruckIcon className="mr-2 h-4 w-4" />
            Transfer Baru
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transfer</CardTitle>
            <Badge className="bg-indigo-100 text-indigo-800">{stats.total}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total} Transfer</div>
            <p className="text-xs text-muted-foreground">Semua transfer</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Barang Masuk</CardTitle>
            <Badge className="bg-green-100 text-green-800">{stats.incoming}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.incoming} Transfer</div>
            <p className="text-xs text-muted-foreground">INCOMING</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Barang Keluar</CardTitle>
            <Badge className="bg-blue-100 text-blue-800">{stats.outgoing}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.outgoing} Transfer</div>
            <p className="text-xs text-muted-foreground">OUTGOING</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Barang Jadi</CardTitle>
            <Badge className="bg-purple-100 text-purple-800">{stats.finished}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.finished} Transfer</div>
            <p className="text-xs text-muted-foreground">FINISHED</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Menu Transfer</CardTitle>
              <CardDescription>Pilih kategori transfer</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <Link href="/dashboard/transfer/outgoing">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Barang Keluar
                  <ArrowRightIcon className="h-4 w-4" />
                </CardTitle>
                <CardDescription>Daftar transfer dari Gudang B</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/dashboard/transfer/incoming">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Barang Masuk
                  <ArrowRightIcon className="h-4 w-4" />
                </CardTitle>
                <CardDescription>Terima barang di Gudang A</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/dashboard/transfer/finished">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Barang Jadi
                  <ArrowRightIcon className="h-4 w-4" />
                </CardTitle>
                <CardDescription>Transfer barang jadi ke gudang</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/dashboard/transfer/warehouses">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Setup Gudang
                  <ArrowRightIcon className="h-4 w-4" />
                </CardTitle>
                <CardDescription>Kelola data gudang</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Daftar Transfer</CardTitle>
              <CardDescription>Riwayat transfer terbaru</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Refresh
              </Button>
              <ExportPrint
                title="Daftar Transfer"
                filename="transfer"
                columns={[
                  { key: "transferNumber", label: "No. TO" },
                  { key: "type", label: "Tipe" },
                  { key: "createdAt", label: "Tanggal" },
                  { key: "jumlahMasuk", label: "Jumlah Masuk" },
                  { key: "jumlahKeluar", label: "Jumlah Keluar" },
                  { key: "jumlahJadi", label: "Barang Jadi" },
                  { key: "status", label: "Status" },
                  { key: "notes", label: "Catatan" },
                ]}
                data={(transfers || []).map(t => {
                  const totalQty = t.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
                  return {
                    transferNumber: t.transferNumber,
                    type: t.type === "OUTGOING" ? "Keluar" : t.type === "INCOMING" ? "Masuk" : "Jadi",
                    createdAt: formatDate(t.createdAt),
                    jumlahMasuk: t.type === "INCOMING" ? totalQty : "-",
                    jumlahKeluar: t.type === "OUTGOING" ? totalQty : "-",
                    jumlahJadi: t.type === "FINISHED" ? totalQty : "-",
                    status: STATUS_LABELS[t.status] || t.status,
                    notes: t.notes || "-",
                  }
                })}
                summaryTitle="Ringkasan Transfer"
                summary={[
                  { label: "Total Transfer", value: stats.total },
                  { label: "Barang Masuk (INCOMING)", value: stats.incoming },
                  { label: "Barang Keluar (OUTGOING)", value: stats.outgoing },
                  { label: "Barang Jadi (FINISHED)", value: stats.finished },
                ]}
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
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <p>Gagal memuat data: {error.message}</p>
              <Button variant="outline" className="mt-2" onClick={() => refetch()}>
                Coba Lagi
              </Button>
            </div>
          ) : !transfers || transfers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Belum ada data transfer</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. TO</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-center">Masuk</TableHead>
                  <TableHead className="text-center">Keluar</TableHead>
                  <TableHead className="text-center">Jadi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((transfer) => {
                  const totalQty = transfer.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
                  return (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-mono">{transfer.transferNumber}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {transfer.type === "OUTGOING" ? "Keluar" : 
                           transfer.type === "INCOMING" ? "Masuk" : "Jadi"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(transfer.createdAt)}</TableCell>
                      <TableCell className="text-center font-medium">
                        {transfer.type === "INCOMING" ? totalQty : "-"}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {transfer.type === "OUTGOING" ? totalQty : "-"}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {transfer.type === "FINISHED" ? totalQty : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${STATUS_COLORS[transfer.status] || "bg-gray-100 text-gray-800"}`}>
                          {STATUS_LABELS[transfer.status] || transfer.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex justify-center">
                        <Button size="sm" variant="outline" onClick={() => handleView(transfer)}>
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
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
                  <p className="font-medium">{formatDateLong(selectedTransfer.createdAt)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tipe</p>
                  <Badge variant="outline">
                    {selectedTransfer.type === "OUTGOING" ? "Barang Keluar" : 
                     selectedTransfer.type === "INCOMING" ? "Barang Masuk" : "Barang Jadi"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={`${STATUS_COLORS[selectedTransfer.status] || "bg-gray-100"}`}>
                    {STATUS_LABELS[selectedTransfer.status] || selectedTransfer.status}
                  </Badge>
                </div>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
