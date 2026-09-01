"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader } from "@/components/shared"
import { ExportPrint } from "@/components/shared/export-print"
import { WrenchScrewdriverIcon, Cog6ToothIcon, EyeIcon, PencilIcon, TrashIcon, ArrowPathIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline"
import { useFetch } from "@/hooks/useFetch"
import { toast } from "sonner"
import { formatDate, formatDateLong } from "@/lib/utils"

interface Asset {
  id: string
  code: string
  name: string
  category: string
  status: string
  location?: string
  purchaseDate?: string
  purchaseValue?: number
  createdAt?: string
}

const CATEGORIES = [
  { value: "MACHINE", label: "Mesin" },
  { value: "VEHICLE", label: "Kendaraan" },
  { value: "FURNITURE", label: "Furniture" },
  { value: "ELECTRONICS", label: "Elektronik" },
  { value: "TOOLS", label: "Peralatan" },
  { value: "OTHER", label: "Lainnya" },
]

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Aktif",
  MAINTENANCE: "Maintenance",
  INACTIVE: "Nonaktif",
  DISPOSED: "Dibuang",
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  MAINTENANCE: "bg-yellow-100 text-yellow-800",
  INACTIVE: "bg-gray-100 text-gray-800",
  DISPOSED: "bg-red-100 text-red-800",
}

export default function AssetsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    category: "MACHINE",
    location: "",
    purchaseDate: "",
    purchaseValue: "",
  })
  
  const [editFormData, setEditFormData] = useState({
    code: "",
    name: "",
    category: "",
    location: "",
    purchaseDate: "",
    purchaseValue: "",
    status: "",
  })

  const { data: assets, loading, refetch } = useFetch<Asset[]>("/api/assets")

  const filtered = (assets || []).filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getSuggestions = () => {
    if (!searchQuery || searchQuery.length < 2) return []
    
    const suggestions: { type: string; value: string; label: string }[] = []
    const seen = new Set<string>()
    
    ;(assets || []).forEach((a) => {
      const code = a.code
      if (code && code.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(code)) {
        seen.add(code)
        suggestions.push({ type: "code", value: code, label: code })
      }
      const name = a.name
      if (name && name.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(name)) {
        seen.add(name)
        suggestions.push({ type: "name", value: name, label: name })
      }
    })
    
    return suggestions.slice(0, 10)
  }

  const suggestions = getSuggestions()

  const selectSuggestion = (value: string) => {
    setSearchQuery(value)
    setShowSuggestions(false)
  }

  const totalValue = (assets || []).reduce((acc, a) => acc + (a.purchaseValue || 0), 0)
  const activeAssets = (assets || []).filter((a) => a.status === "ACTIVE").length
  const maintenanceAssets = (assets || []).filter((a) => a.status === "MAINTENANCE").length

  const handleCreate = async () => {
    if (!formData.code || !formData.name) return

    setSubmitting(true)
    try {
      const response = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formData.code,
          name: formData.name,
          category: formData.category,
          location: formData.location || null,
          purchaseDate: formData.purchaseDate || null,
          purchaseValue: parseInt(formData.purchaseValue) || 0,
        }),
      })

      if (response.ok) {
        toast.success("Asset berhasil ditambahkan")
        setCreateDialogOpen(false)
        setFormData({ code: "", name: "", category: "MACHINE", location: "", purchaseDate: "", purchaseValue: "" })
        refetch()
      } else {
        toast.error("Gagal menambahkan asset")
      }
    } catch (error) {
      console.error("Error creating asset:", error)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  const openViewDialog = (asset: Asset) => {
    setSelectedAsset(asset)
    setViewDialogOpen(true)
  }

  const openEditDialog = (asset: Asset) => {
    setSelectedAsset(asset)
    setEditFormData({
      code: asset.code,
      name: asset.name,
      category: asset.category,
      location: asset.location || "",
      purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().split("T")[0] : "",
      purchaseValue: asset.purchaseValue?.toString() || "",
      status: asset.status,
    })
    setEditDialogOpen(true)
  }

  const openDeleteDialog = (asset: Asset) => {
    setSelectedAsset(asset)
    setDeleteDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (!selectedAsset) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/assets/${selectedAsset.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: editFormData.code,
          name: editFormData.name,
          category: editFormData.category,
          location: editFormData.location || null,
          purchaseDate: editFormData.purchaseDate || null,
          purchaseValue: parseInt(editFormData.purchaseValue) || 0,
          status: editFormData.status,
        }),
      })

      if (response.ok) {
        toast.success("Asset berhasil diperbarui")
        setEditDialogOpen(false)
        setSelectedAsset(null)
        refetch()
      } else {
        toast.error("Gagal memperbarui asset")
      }
    } catch (error) {
      console.error("Error updating asset:", error)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedAsset) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/assets/${selectedAsset.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Asset berhasil dihapus")
        setDeleteDialogOpen(false)
        setSelectedAsset(null)
        refetch()
      } else {
        toast.error("Gagal menghapus asset")
      }
    } catch (error) {
      console.error("Error deleting asset:", error)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Assets"
        description="Kelola aset dan inventaris"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Refresh
            </Button>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="dark:bg-[#304ffe] dark:hover:bg-[#304ffe]/80">
                    <WrenchScrewdriverIcon className="mr-2 h-4 w-4" />
                    Tambah Asset
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Tambah Asset Baru</DialogTitle>
                  <DialogDescription>Tambahkan aset baru ke inventaris</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Kode Asset</Label>
                      <Input
                        placeholder="Contoh: AST-001"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Kategori</Label>
                      <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Nama Asset</Label>
                    <Input
                      placeholder="Contoh: Mesin Jahit Brother"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Lokasi</Label>
                    <Input
                      placeholder="Contoh: Gudang Utama"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tanggal Pembelian</Label>
                      <Input
                        type="date"
                        lang="id"
                        value={formData.purchaseDate}
                        onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nilai (Rp)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={formData.purchaseValue}
                        onChange={(e) => setFormData({ ...formData, purchaseValue: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button onClick={handleCreate} disabled={!formData.code || !formData.name || submitting}>
                    {submitting && <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />}
                    Simpan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <WrenchScrewdriverIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "-" : (assets || []).length}</div>
            <p className="text-xs text-muted-foreground">
              Rp {(totalValue || 0).toLocaleString("id-ID")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif</CardTitle>
            <Badge className="bg-green-100 text-green-800">{loading ? "-" : activeAssets}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "-" : activeAssets}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
            <Badge className="bg-yellow-100 text-yellow-800">{loading ? "-" : maintenanceAssets}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "-" : maintenanceAssets}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Menu</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/assets/maintenance">
                <Cog6ToothIcon className="mr-2 h-4 w-4" />
                Jadwal Maintenance
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Daftar Assets</CardTitle>
            <ExportPrint
              title="Daftar Assets"
              filename="assets"
              columns={[
                { key: "code", label: "Kode" },
                { key: "name", label: "Nama" },
                { key: "category", label: "Kategori" },
                { key: "location", label: "Lokasi" },
                { key: "purchaseDate", label: "Tanggal Beli" },
                { key: "purchaseValue", label: "Nilai" },
                { key: "status", label: "Status" },
              ]}
              data={filtered.map(a => ({
                code: a.code,
                name: a.name,
                category: CATEGORIES.find(c => c.value === a.category)?.label || a.category,
                location: a.location || "-",
                purchaseDate: formatDate(a.purchaseDate),
                purchaseValue: a.purchaseValue ? `Rp ${a.purchaseValue.toLocaleString("id-ID")}` : "-",
                status: STATUS_LABELS[a.status] || a.status,
              }))}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari asset..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="pl-9"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg overflow-hidden">
                {suggestions.map((s, i) => (
                  <button
                    key={`${s.type}-${s.value}-${i}`}
                    className="w-full px-4 py-2 text-left hover:bg-muted flex items-center gap-2 text-sm"
                    onClick={() => selectSuggestion(s.value)}
                  >
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      s.type === "code" ? "bg-blue-100 text-blue-700" :
                      "bg-green-100 text-green-700"
                    }`}>
                      {s.type === "code" ? "Kode" : "Nama"}
                    </span>
                    <span className="font-medium">{s.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Belum ada data asset</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead>Tanggal Beli</TableHead>
                  <TableHead>Nilai</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-mono">{asset.code}</TableCell>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell>{CATEGORIES.find(c => c.value === asset.category)?.label || asset.category}</TableCell>
                    <TableCell>{asset.location || "-"}</TableCell>
                    <TableCell>
                      {formatDate(asset.purchaseDate)}
                    </TableCell>
                    <TableCell>
                      {asset.purchaseValue 
                        ? `Rp ${asset.purchaseValue.toLocaleString("id-ID")}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[asset.status] || "bg-gray-100"}>
                        {STATUS_LABELS[asset.status] || asset.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openViewDialog(asset)}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(asset)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={() => openDeleteDialog(asset)}
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
        if (!open) setSelectedAsset(null)
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Detail Asset</DialogTitle>
            <DialogDescription>
              {selectedAsset?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedAsset && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Kode</p>
                  <p className="font-medium font-mono">{selectedAsset.code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kategori</p>
                  <p className="font-medium">{CATEGORIES.find(c => c.value === selectedAsset.category)?.label || selectedAsset.category}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nama</p>
                <p className="font-medium">{selectedAsset.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Lokasi</p>
                  <p className="font-medium">{selectedAsset.location || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={STATUS_COLORS[selectedAsset.status] || "bg-gray-100"}>
                    {STATUS_LABELS[selectedAsset.status] || selectedAsset.status}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal Beli</p>
                  <p className="font-medium">
                    {formatDateLong(selectedAsset.purchaseDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nilai</p>
                  <p className="font-medium">
                    {selectedAsset.purchaseValue 
                      ? `Rp ${selectedAsset.purchaseValue.toLocaleString("id-ID")}`
                      : "-"}
                  </p>
                </div>
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
        if (!open) setSelectedAsset(null)
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>Perbarui data asset</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kode Asset</Label>
                <Input
                  value={editFormData.code}
                  onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={editFormData.category} onValueChange={(v) => setEditFormData({ ...editFormData, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nama Asset</Label>
              <Input
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Lokasi</Label>
              <Input
                value={editFormData.location}
                onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editFormData.status} onValueChange={(v) => setEditFormData({ ...editFormData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Aktif</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="INACTIVE">Nonaktif</SelectItem>
                  <SelectItem value="DISPOSED">Dibuang</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tanggal Pembelian</Label>
                <Input
                  type="date"
                  lang="id"
                  value={editFormData.purchaseDate}
                  onChange={(e) => setEditFormData({ ...editFormData, purchaseDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Nilai (Rp)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={editFormData.purchaseValue}
                  onChange={(e) => setEditFormData({ ...editFormData, purchaseValue: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleUpdate} disabled={!editFormData.code || !editFormData.name || submitting}>
              {submitting && <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open)
        if (!open) setSelectedAsset(null)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Asset</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus asset {selectedAsset?.name}? Tindakan ini tidak dapat dibatalkan.
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
