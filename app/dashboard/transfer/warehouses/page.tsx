"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { RefreshButton } from "@/components/ui/refresh-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
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
import { PlusIcon, BuildingOfficeIcon, EyeIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline"
import { useFetch } from "@/hooks/useFetch"
import { useSessionWithRole } from "@/lib/use-session-with-role"
import { toast } from "sonner"
import { formatDateLong } from "@/lib/utils"

interface Warehouse {
  id: string
  code: string
  name: string
  address?: string
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

interface WarehouseAPI {
  id: string
  code: string
  name: string
  address?: string
  is_active: boolean
  created_at: string
  updated_at?: string
}

function transformWarehouse(warehouse: WarehouseAPI): Warehouse {
  return {
    id: warehouse.id,
    code: warehouse.code,
    name: warehouse.name,
    address: warehouse.address,
    isActive: warehouse.is_active,
    createdAt: warehouse.created_at,
    updatedAt: warehouse.updated_at,
  }
}

export default function WarehousesPage() {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({ code: "", name: "", address: "" })
  const [editFormData, setEditFormData] = useState({ code: "", name: "", address: "", isActive: true })

  const { user } = useSessionWithRole()
  const userRole = user?.role || "GUEST"
  const isAdmin = userRole === "ADMIN" || userRole === "SUPERADMIN"

  const { data: rawWarehouses, loading, refetch } = useFetch<WarehouseAPI[]>("/api/warehouses")
  const warehouses = (rawWarehouses || []).map(transformWarehouse)

  // P3-1: ADMIN-only restriction for warehouse management
  if (!isAdmin && !loading) {
    return (
      <div className="flex-1 p-6">
        <div className="text-center py-12">
          <BuildingOfficeIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Akses Terbatas</h2>
          <p className="text-muted-foreground mb-4">Halaman pengaturan gudang hanya dapat diakses oleh Admin.</p>
          <Button onClick={() => router.push("/dashboard/transfer")} variant="outline">
            Kembali ke Transfer
          </Button>
        </div>
      </div>
    )
  }

  const handleCreateWarehouse = async () => {
    if (!formData.code || !formData.name) return

    setSubmitting(true)
    try {
      const response = await fetch("/api/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (response.ok) {
        toast.success("Gudang berhasil ditambahkan")
        setDialogOpen(false)
        setFormData({ code: "", name: "", address: "" })
        refetch()
      } else {
        const data = await response.json().catch(() => null)
        toast.error(data?.error || "Gagal menambahkan gudang")
      }
    } catch (error) {
      console.error("Error creating warehouse:", error)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  const openViewDialog = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse)
    setViewDialogOpen(true)
  }

  const openEditDialog = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse)
    setEditFormData({
      code: warehouse.code,
      name: warehouse.name,
      address: warehouse.address || "",
      isActive: warehouse.isActive,
    })
    setEditDialogOpen(true)
  }

  const openDeleteDialog = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse)
    setDeleteDialogOpen(true)
  }

  const handleUpdateWarehouse = async () => {
    if (!selectedWarehouse || !editFormData.code || !editFormData.name) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/warehouses/${selectedWarehouse.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      })
      if (response.ok) {
        toast.success("Gudang berhasil diperbarui")
        setEditDialogOpen(false)
        setSelectedWarehouse(null)
        refetch()
      } else {
        const data = await response.json().catch(() => null)
        toast.error(data?.error || "Gagal memperbarui gudang")
      }
    } catch (error) {
      console.error("Error updating warehouse:", error)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteWarehouse = async () => {
    if (!selectedWarehouse) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/warehouses/${selectedWarehouse.id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        toast.success("Gudang berhasil dihapus")
        setDeleteDialogOpen(false)
        setSelectedWarehouse(null)
        refetch()
      } else {
        toast.error("Gagal menghapus gudang")
      }
    } catch (error) {
      console.error("Error deleting warehouse:", error)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Master Gudang"
        description="Kelola gudang dan kapasitas penyimpanan"
        actions={
<div className="flex gap-2">
            <RefreshButton size="default" variant="outline" onClick={() => refetch()} />
            <Button onClick={() => setDialogOpen(true)} className="dark:bg-[var(--brand-primary)] dark:hover:bg-[var(--brand-primary)]/80">
              <PlusIcon className="mr-2 h-4 w-4" />
              Tambah Gudang
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gudang</CardTitle>
            <BuildingOfficeIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "-" : warehouses?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Gudang</CardTitle>
          <CardDescription>Semua gudang penyimpanan</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !warehouses || warehouses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Belum ada gudang</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Alamat</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouses.map((warehouse) => (
                  <TableRow key={warehouse.id}>
                    <TableCell className="font-mono font-medium">{warehouse.code}</TableCell>
                    <TableCell className="font-medium">{warehouse.name}</TableCell>
                    <TableCell>{warehouse.address || "-"}</TableCell>
                    <TableCell>
                      <Badge className={`${warehouse.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                        {warehouse.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-center">
                        <Button
                          variant="ghost"
                          size="icon-lg"
                          
                          onClick={() => openViewDialog(warehouse)}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-lg"
                          
                          onClick={() => openEditDialog(warehouse)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-lg"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => openDeleteDialog(warehouse)}
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

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Gudang Baru</DialogTitle>
            <DialogDescription>Buat gudang baru</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Kode</Label>
              <Input 
                placeholder="Contoh: GUD-001" 
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nama Gudang</Label>
              <Input 
                placeholder="Contoh: Gudang Utama" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Alamat</Label>
              <Input 
                placeholder="Alamat gudang" 
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleCreateWarehouse} disabled={!formData.code || !formData.name || submitting}>
              {submitting && <Spinner data-icon="inline-start" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={(open) => {
        setViewDialogOpen(open)
        if (!open) setSelectedWarehouse(null)
      }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Detail Gudang</DialogTitle>
            <DialogDescription>
              {selectedWarehouse ? `Gudang ${selectedWarehouse.name}` : ""}
            </DialogDescription>
          </DialogHeader>
          {selectedWarehouse && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Kode</p>
                  <p className="font-medium font-mono">{selectedWarehouse.code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={`${selectedWarehouse.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                    {selectedWarehouse.isActive ? "Aktif" : "Nonaktif"}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nama Gudang</p>
                <p className="font-medium">{selectedWarehouse.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Alamat</p>
                <p className="font-medium">{selectedWarehouse.address || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dibuat</p>
                <p className="font-medium">
                  {formatDateLong(selectedWarehouse.createdAt)}
                </p>
              </div>
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
        if (!open) setSelectedWarehouse(null)
      }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Edit Gudang</DialogTitle>
            <DialogDescription>
              Perbarui data gudang {selectedWarehouse?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Kode</Label>
              <Input 
                placeholder="Contoh: GUD-001" 
                value={editFormData.code}
                onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nama Gudang</Label>
              <Input 
                placeholder="Contoh: Gudang Utama" 
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Alamat</Label>
              <Input 
                placeholder="Alamat gudang" 
                value={editFormData.address}
                onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base">Status Gudang</Label>
                <p className="text-sm text-muted-foreground">
                  {editFormData.isActive ? "Gudang aktif dapat digunakan" : "Gudang nonaktif tidak dapat digunakan"}
                </p>
              </div>
              <Switch 
                checked={editFormData.isActive}
                onCheckedChange={(checked) => setEditFormData({ ...editFormData, isActive: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleUpdateWarehouse} disabled={!editFormData.code || !editFormData.name || submitting}>
              {submitting && <Spinner data-icon="inline-start" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open)
        if (!open) setSelectedWarehouse(null)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Gudang</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus gudang {selectedWarehouse?.name}? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeleteWarehouse} disabled={submitting}>
              {submitting && <Spinner data-icon="inline-start" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
