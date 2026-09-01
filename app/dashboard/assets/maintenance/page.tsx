"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { ArrowLeftIcon, PlusIcon, EyeIcon, PencilIcon, TrashIcon, ArrowPathIcon, WrenchScrewdriverIcon } from "@heroicons/react/24/outline"
import { useFetch } from "@/hooks/useFetch"
import { toast } from "sonner"
import { formatDate, formatDateLong } from "@/lib/utils"
import { useCurrency } from "@/hooks/useCurrency"

interface Asset {
  id: string
  code: string
  name: string
}

interface MaintenanceRecord {
  id: string
  assetId: string
  type: string
  status: string
  scheduledDate: string
  completedDate?: string
  technician?: string
  cost?: number
  notes?: string
  createdAt: string
  asset?: Asset | null
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu",
  IN_PROGRESS: "Dalam Proses",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
}

const TYPE_LABELS: Record<string, string> = {
  PREVENTIVE: "Preventive",
  CORRECTIVE: "Corrective",
}

export default function MaintenancePage() {
  const { formatCurrency } = useCurrency()
  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    assetId: "",
    type: "PREVENTIVE",
    scheduledDate: "",
    technician: "",
    notes: "",
  })
  
  const [editFormData, setEditFormData] = useState({
    type: "",
    scheduledDate: "",
    completedDate: "",
    technician: "",
    cost: "",
    notes: "",
    status: "",
  })

  const { data: maintenance, loading, refetch } = useFetch<MaintenanceRecord[]>("/api/assets/maintenance")
  const { data: assets } = useFetch<Asset[]>("/api/assets")

  const pendingCount = (maintenance || []).filter(m => m.status === "PENDING").length
  const inProgressCount = (maintenance || []).filter(m => m.status === "IN_PROGRESS").length
  const completedCount = (maintenance || []).filter(m => m.status === "COMPLETED").length

  const handleCreateSchedule = async () => {
    if (!formData.assetId || !formData.scheduledDate) return

    setSubmitting(true)
    try {
      const response = await fetch("/api/assets/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      
      if (response.ok) {
        toast.success("Jadwal maintenance berhasil dibuat")
        setNewDialogOpen(false)
        setFormData({ assetId: "", type: "PREVENTIVE", scheduledDate: "", technician: "", notes: "" })
        refetch()
      } else {
        toast.error("Gagal membuat jadwal maintenance")
      }
    } catch (error) {
      console.error("Error creating maintenance:", error)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  const openViewDialog = (record: MaintenanceRecord) => {
    setSelectedMaintenance(record)
    setViewDialogOpen(true)
  }

  const openEditDialog = (record: MaintenanceRecord) => {
    setSelectedMaintenance(record)
    setEditFormData({
      type: record.type,
      scheduledDate: record.scheduledDate ? new Date(record.scheduledDate).toISOString().split("T")[0] : "",
      completedDate: record.completedDate ? new Date(record.completedDate).toISOString().split("T")[0] : "",
      technician: record.technician || "",
      cost: record.cost?.toString() || "",
      notes: record.notes || "",
      status: record.status,
    })
    setEditDialogOpen(true)
  }

  const openDeleteDialog = (record: MaintenanceRecord) => {
    setSelectedMaintenance(record)
    setDeleteDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (!selectedMaintenance) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/assets/maintenance/${selectedMaintenance.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      })
      
      if (response.ok) {
        toast.success("Maintenance berhasil diperbarui")
        setEditDialogOpen(false)
        setSelectedMaintenance(null)
        refetch()
      } else {
        toast.error("Gagal memperbarui maintenance")
      }
    } catch (error) {
      console.error("Error updating maintenance:", error)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedMaintenance) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/assets/maintenance/${selectedMaintenance.id}`, {
        method: "DELETE",
      })
      
      if (response.ok) {
        toast.success("Maintenance berhasil dihapus")
        setDeleteDialogOpen(false)
        setSelectedMaintenance(null)
        refetch()
      } else {
        toast.error("Gagal menghapus maintenance")
      }
    } catch (error) {
      console.error("Error deleting maintenance:", error)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Jadwal Maintenance"
        description="Kelola jadwal perawatan dan perbaikan aset"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/assets">
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Kembali
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Refresh
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jadwal</CardTitle>
            <Badge className="bg-blue-100 text-blue-800">{maintenance?.length || 0}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "-" : maintenance?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Bulan ini</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menunggu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{loading ? "-" : pendingCount}</div>
            <p className="text-xs text-muted-foreground">Belum diproses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dalam Proses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--chart-blue)]">{loading ? "-" : inProgressCount}</div>
            <p className="text-xs text-muted-foreground">Sedang dikerjakan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selesai</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{loading ? "-" : completedCount}</div>
            <p className="text-xs text-muted-foreground">Telah selesai</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Daftar Maintenance</CardTitle>
              <CardDescription>Jadwal perawatan dan perbaikan aset</CardDescription>
            </div>
            <div className="flex gap-2">
              <ExportPrint
                columns={[
                  { key: "assetCode", label: "Kode Aset" },
                  { key: "assetName", label: "Nama Aset" },
                  { key: "type", label: "Jenis" },
                  { key: "date", label: "Tanggal" },
                  { key: "status", label: "Status" },
                  { key: "technician", label: "Teknisi" },
                ]}
                data={(maintenance || []).map(record => ({
                  assetCode: record.asset?.code || "-",
                  assetName: record.asset?.name || "-",
                  type: TYPE_LABELS[record.type] || record.type,
                  date: formatDate(record.completedDate || record.scheduledDate),
                  status: STATUS_LABELS[record.status] || record.status,
                  technician: record.technician || "-",
                }))}
                title="Daftar Jadwal Maintenance"
                filename="maintenance"
              />
              <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="dark:bg-[#304ffe] dark:hover:bg-[#304ffe]/80">
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Jadwal Baru
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Buat Jadwal Maintenance</DialogTitle>
                  <DialogDescription>
                    Atur jadwal perawatan atau perbaikan aset
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Aset</Label>
                    <Select value={formData.assetId} onValueChange={(v) => setFormData({ ...formData, assetId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih aset" />
                      </SelectTrigger>
                      <SelectContent>
                        {assets?.map((asset) => (
                          <SelectItem key={asset.id} value={asset.id}>
                            {asset.code} - {asset.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Jenis Maintenance</Label>
                    <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PREVENTIVE">Preventive (Rutin)</SelectItem>
                        <SelectItem value="CORRECTIVE">Corrective (Perbaikan)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tanggal Terjadwal</Label>
                    <Input
                      type="date"
                      lang="id"
                      value={formData.scheduledDate}
                      onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Teknisi</Label>
                    <Input
                      placeholder="Nama teknisi..."
                      value={formData.technician}
                      onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Catatan</Label>
                    <Input
                      placeholder="Tambahkan catatan..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setNewDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button onClick={handleCreateSchedule} disabled={!formData.assetId || !formData.scheduledDate || submitting}>
                    {submitting && <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />}
                    <WrenchScrewdriverIcon className="mr-2 h-4 w-4" />
                    Simpan Jadwal
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
          ) : !maintenance || maintenance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Belum ada jadwal maintenance</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode Aset</TableHead>
                  <TableHead>Nama Aset</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Teknisi</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maintenance.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-mono">{record.asset?.code || "-"}</TableCell>
                    <TableCell className="font-medium">{record.asset?.name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={record.type === "PREVENTIVE" ? "secondary" : "default"}>
                        {TYPE_LABELS[record.type] || record.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDate(record.completedDate || record.scheduledDate)}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[record.status] || "bg-gray-100"}>
                        {STATUS_LABELS[record.status] || record.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{record.technician || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openViewDialog(record)}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(record)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={() => openDeleteDialog(record)}
                        >
                          <TrashIcon className="h-4 w-4" />
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

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={(open) => {
        setViewDialogOpen(open)
        if (!open) setSelectedMaintenance(null)
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Detail Maintenance</DialogTitle>
            <DialogDescription>
              {selectedMaintenance?.asset?.name || "Detail jadwal maintenance"}
            </DialogDescription>
          </DialogHeader>
          {selectedMaintenance && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Kode Aset</p>
                  <p className="font-medium font-mono">{selectedMaintenance.asset?.code || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nama Aset</p>
                  <p className="font-medium">{selectedMaintenance.asset?.name || "-"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Jenis</p>
                  <Badge variant={selectedMaintenance.type === "PREVENTIVE" ? "secondary" : "default"}>
                    {TYPE_LABELS[selectedMaintenance.type] || selectedMaintenance.type}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={STATUS_COLORS[selectedMaintenance.status] || "bg-gray-100"}>
                    {STATUS_LABELS[selectedMaintenance.status] || selectedMaintenance.status}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal Terjadwal</p>
                  <p className="font-medium">
                    {formatDateLong(selectedMaintenance.scheduledDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal Selesai</p>
                  <p className="font-medium">
                    {formatDateLong(selectedMaintenance.completedDate)}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Teknisi</p>
                <p className="font-medium">{selectedMaintenance.technician || "-"}</p>
              </div>
              {selectedMaintenance.cost && (
                <div>
                  <p className="text-sm text-muted-foreground">Biaya</p>
                  <p className="font-medium">{formatCurrency(selectedMaintenance.cost)}</p>
                </div>
              )}
              {selectedMaintenance.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Catatan</p>
                  <p className="font-medium">{selectedMaintenance.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open)
        if (!open) setSelectedMaintenance(null)
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Maintenance</DialogTitle>
            <DialogDescription>
              Perbarui jadwal maintenance {selectedMaintenance?.asset?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jenis</Label>
                <Select value={editFormData.type} onValueChange={(v) => setEditFormData({ ...editFormData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PREVENTIVE">Preventive (Rutin)</SelectItem>
                    <SelectItem value="CORRECTIVE">Corrective (Perbaikan)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editFormData.status} onValueChange={(v) => setEditFormData({ ...editFormData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Menunggu</SelectItem>
                    <SelectItem value="IN_PROGRESS">Dalam Proses</SelectItem>
                    <SelectItem value="COMPLETED">Selesai</SelectItem>
                    <SelectItem value="CANCELLED">Dibatalkan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tanggal Terjadwal</Label>
                <Input
                  type="date"
                  lang="id"
                  value={editFormData.scheduledDate}
                  onChange={(e) => setEditFormData({ ...editFormData, scheduledDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Selesai</Label>
                <Input
                  type="date"
                  lang="id"
                  value={editFormData.completedDate}
                  onChange={(e) => setEditFormData({ ...editFormData, completedDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Teknisi</Label>
              <Input
                placeholder="Nama teknisi..."
                value={editFormData.technician}
                onChange={(e) => setEditFormData({ ...editFormData, technician: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Biaya</Label>
              <Input
                type="number"
                placeholder="0"
                value={editFormData.cost}
                onChange={(e) => setEditFormData({ ...editFormData, cost: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Input
                placeholder="Tambahkan catatan..."
                value={editFormData.notes}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleUpdate} disabled={submitting}>
              {submitting && <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open)
        if (!open) setSelectedMaintenance(null)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Maintenance</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus jadwal maintenance ini? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting && <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
