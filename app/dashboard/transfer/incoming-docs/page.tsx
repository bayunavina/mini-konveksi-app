"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/shared"
import { RefreshButton } from "@/components/ui/refresh-button"
import { CameraIcon, ArrowDownIcon } from "@heroicons/react/24/outline"
import { useFetch } from "@/hooks/useFetch"
import { formatDateLong } from "@/lib/utils"

interface Transfer {
  id: string
  transferNumber: string
  type: string
  status: string
  createdAt: string
  items?: { id: string; skuCode?: string; skuName?: string; quantity: number }[]
}

interface Photo {
  id: string
  photoData: string
  label: string
  timestamp: string
  createdAt: string
}

export default function IncomingDocsPage() {
  const [photosDialogOpen, setPhotosDialogOpen] = useState(false)
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loadingPhotos, setLoadingPhotos] = useState(false)

  const { data: allTransfers, loading, refetch } = useFetch<Transfer[]>("/api/transfers")
  const incomingTransfers = (allTransfers || []).filter(t => t.type === "INCOMING")

  const handleViewPhotos = async (transfer: Transfer) => {
    setSelectedTransfer(transfer)
    setPhotosDialogOpen(true)
    setLoadingPhotos(true)
    setPhotos([])

    try {
      const res = await fetch(`/api/transfers/${transfer.id}/photos`)
      const data = await res.json()
      setPhotos(data.photos || [])
    } catch (err) {
      console.error("Error fetching photos:", err)
      setPhotos([])
    } finally {
      setLoadingPhotos(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Dokumentasi Barang Masuk"
        description="Lihat foto dokumentasi barang masuk"
        actions={
          <RefreshButton size="default" variant="outline" onClick={() => refetch()} />
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-start gap-2.5">
            <ArrowDownIcon className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
            <div className="min-w-0">
              <CardTitle>Daftar Barang Masuk</CardTitle>
              <CardDescription>Transfer yang telah diterima</CardDescription>
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
          ) : incomingTransfers.length === 0 ? (
            <div className="flex min-h-[9rem] sm:min-h-[12rem] flex-col items-center justify-center gap-1.5 px-2 py-6 text-center text-muted-foreground">
              <p className="font-medium text-foreground/80">Belum ada transfer masuk</p>
              <p className="text-xs text-muted-foreground/80">Transfer yang diterima akan tampil di sini</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Transfer</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomingTransfers.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell className="font-mono font-medium">{transfer.transferNumber}</TableCell>
                    <TableCell>{formatDateLong(transfer.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant={transfer.status === "COMPLETED" ? "default" : "secondary"}>
                        {transfer.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {transfer.items?.map((item) => (
                        <div key={item.id}>{item.skuName || item.skuCode || "-"}</div>
                      )) || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewPhotos(transfer)}
                        >
                          <CameraIcon className="mr-1 h-4 w-4" />
                          Lihat Foto
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={photosDialogOpen} onOpenChange={(open) => {
        setPhotosDialogOpen(open)
        if (!open) {
          setSelectedTransfer(null)
          setPhotos([])
        }
      }}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Foto Dokumentasi</DialogTitle>
            <DialogDescription>
              {selectedTransfer ? `Foto dokumentasi untuk transfer ${selectedTransfer.transferNumber}` : ""}
            </DialogDescription>
          </DialogHeader>
          {loadingPhotos ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : photos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                <CameraIcon className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="font-medium">Belum ada foto dokumentasi</p>
              <p className="text-sm mt-1">Foto akan muncul setelah upload saat menerima transfer</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((photo) => (
                <Card key={photo.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="aspect-square">
                      <img
                        src={photo.photoData}
                        alt={photo.label}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-2 space-y-1">
                      <p className="text-xs font-mono font-medium truncate">{photo.label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDateLong(photo.timestamp || photo.createdAt)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhotosDialogOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
