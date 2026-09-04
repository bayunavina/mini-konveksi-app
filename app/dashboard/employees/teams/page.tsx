"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader } from "@/components/shared"
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  Building2,
  Crown,
  Activity,
  UserCheck,
  Layers,
  ArrowLeft,
  UsersRound,
} from "lucide-react"
import { useFetch } from "@/hooks/useFetch"
import { toast } from "sonner"

interface Team {
  id: string
  name: string
  leaderName?: string | null
  isActive: boolean
  createdAt: string
  memberCount?: number
}

interface TeamDetail extends Team {
  members: {
    id: string
    name: string
    role: string
    email?: string | null
    isActive: boolean
  }[]
}

export default function TeamsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<Team | null>(null)
  const [detail, setDetail] = useState<TeamDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ name: "", leaderName: "", isActive: true })

  const { data: teams, loading, refetch } = useFetch<Team[]>("/api/teams")

  const stats = useMemo(() => {
    if (!teams) return { total: 0, active: 0, members: 0, avg: 0 }
    const total = teams.length
    const active = teams.filter((t) => t.isActive).length
    const members = teams.reduce((s, t) => s + (t.memberCount || 0), 0)
    const avg = total ? Math.round(members / total) : 0
    return { total, active, members, avg }
  }, [teams])

  const filtered = useMemo(() => {
    if (!teams) return []
    return teams.filter((t) => {
      const matchSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.leaderName || "").toLowerCase().includes(searchQuery.toLowerCase())
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && t.isActive) ||
        (statusFilter === "inactive" && !t.isActive)
      return matchSearch && matchStatus
    })
  }, [teams, searchQuery, statusFilter])

  const resetForm = () => setForm({ name: "", leaderName: "", isActive: true })

  const openAdd = () => {
    resetForm()
    setAddOpen(true)
  }

  const openEdit = (team: Team) => {
    setSelected(team)
    setForm({ name: team.name, leaderName: team.leaderName || "", isActive: team.isActive })
    setEditOpen(true)
  }

  const openView = async (team: Team) => {
    setSelected(team)
    setViewOpen(true)
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/teams/${team.id}`)
      if (res.ok) {
        const data = await res.json()
        setDetail(data)
      } else {
        setDetail(null)
      }
    } catch {
      setDetail(null)
    } finally {
      setLoadingDetail(false)
    }
  }

  const openDelete = (team: Team) => {
    setSelected(team)
    setDeleteOpen(true)
  }

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("Nama tim wajib diisi")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast.success("Tim berhasil dibuat")
        setAddOpen(false)
        resetForm()
        refetch()
      } else {
        const err = await res.json()
        toast.error(err.error || "Gagal membuat tim")
      }
    } catch {
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async () => {
    if (!selected) return
    if (!form.name.trim()) {
      toast.error("Nama tim wajib diisi")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/teams/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast.success("Tim berhasil diperbarui")
        setEditOpen(false)
        refetch()
      } else {
        const err = await res.json()
        toast.error(err.error || "Gagal update")
      }
    } catch {
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/teams/${selected.id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Tim berhasil dihapus")
        setDeleteOpen(false)
        refetch()
      } else {
        const err = await res.json()
        toast.error(err.error || "Gagal menghapus")
      }
    } catch {
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-8 pt-6">
      <PageHeader
        title="Tim Produksi"
        description="Kelola tim produksi, ketua tim, dan pembagian anggota"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push("/dashboard/employees")}>
                <ArrowLeft data-icon="inline-start" />
                Kembali
            </Button>
            <Button onClick={openAdd}>
              <Plus data-icon="inline-start" />
              Tambah Tim
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tim</CardTitle>
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="size-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "-" : stats.total}</div>
            <p className="text-xs text-muted-foreground">Tim terdaftar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tim Aktif</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Activity className="size-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{loading ? "-" : stats.active}</div>
            <p className="text-xs text-muted-foreground">Sedang berjalan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Anggota</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="size-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "-" : stats.members}</div>
            <p className="text-xs text-muted-foreground">Karyawan ter-assign</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rata-rata / Tim</CardTitle>
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Layers className="size-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "-" : stats.avg}</div>
            <p className="text-xs text-muted-foreground">Anggota per tim</p>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UsersRound className="size-5 text-primary" />
                Daftar Tim
              </CardTitle>
              <CardDescription>Kelola tim dan lihat distribusi anggota</CardDescription>
            </div>
            <Badge variant="secondary" className="w-fit">
              {filtered.length} tim
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Cari tim atau ketua..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="inactive">Nonaktif</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button variant="outline" size="lg" onClick={() => refetch()}>
                Refresh
              </Button>
            </div>
          </div>

          <Separator />

          {loading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center border rounded-lg bg-muted/20">
              <div className="p-3 rounded-full bg-muted">
                <Building2 className="size-6 text-muted-foreground" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold">Belum ada tim</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {searchQuery || statusFilter !== "all"
                    ? "Tidak ada hasil untuk pencarian. Coba ubah filter."
                    : "Buat tim produksi pertama untuk mulai grouping karyawan."}
                </p>
              </div>
              {!searchQuery && statusFilter === "all" && (
                <Button size="sm" onClick={openAdd} className="mt-2">
                  <Plus data-icon="inline-start" />
                  Tambah Tim
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Nama Tim</TableHead>
                    <TableHead>
                      <span className="flex items-center gap-1">
                        <Crown className="size-3.5" /> Ketua
                      </span>
                    </TableHead>
                    <TableHead className="text-center">Anggota</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((team) => (
                    <TableRow key={team.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="size-4 text-primary" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium leading-none">{team.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(team.createdAt).toLocaleDateString("id-ID")}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {team.leaderName ? (
                          <span className="inline-flex items-center gap-1.5 text-sm">
                            <UserCheck className="size-3.5 text-muted-foreground" />
                            {team.leaderName}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">Belum set</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={team.memberCount && team.memberCount > 0 ? "default" : "secondary"}
                          className="font-mono"
                        >
                          <Users className="size-3" />
                          {team.memberCount || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={team.isActive ? "default" : "outline"}>
                          {team.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openView(team)} title="Lihat">
                            <Eye />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(team)} title="Edit">
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDelete(team)}
                            className="text-destructive hover:text-destructive"
                            title="Hapus"
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Tim digunakan untuk grouping karyawan & assign Job Order produksi
          </p>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Tim Baru</DialogTitle>
            <DialogDescription>Buat tim produksi. Anggota di-assign dari menu Karyawan.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="add-name">Nama Tim *</Label>
              <Input
                id="add-name"
                placeholder="Contoh: Tim Produksi A, Tim Jahit..."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="add-leader">Ketua Tim</Label>
              <Input
                id="add-leader"
                placeholder="Nama ketua (opsional)"
                value={form.leaderName}
                onChange={(e) => setForm({ ...form, leaderName: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Bisa diisi nama karyawan penanggung jawab</p>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="add-active">Status Aktif</Label>
                <p className="text-xs text-muted-foreground">Tim nonaktif tidak bisa di-assign JO baru</p>
              </div>
              <Switch
                id="add-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting && <Spinner data-icon="inline-start" />}
              Simpan Tim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tim</DialogTitle>
            <DialogDescription>Perbarui informasi tim produksi</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-name">Nama Tim *</Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-leader">Ketua Tim</Label>
              <Input
                id="edit-leader"
                value={form.leaderName}
                onChange={(e) => setForm({ ...form, leaderName: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="edit-active">Status Aktif</Label>
                <p className="text-xs text-muted-foreground">Toggle keaktifan tim</p>
              </div>
              <Switch
                id="edit-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleUpdate} disabled={submitting}>
              {submitting && <Spinner data-icon="inline-start" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="size-5" />
              {selected?.name}
            </DialogTitle>
            <DialogDescription>
              Detail tim & daftar anggota
            </DialogDescription>
          </DialogHeader>
          {loadingDetail ? (
            <div className="flex flex-col gap-2 py-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : detail ? (
            <div className="flex flex-col gap-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Crown className="size-3" /> Ketua Tim
                  </span>
                  <span className="text-sm font-medium">{detail.leaderName || "-"}</span>
                </div>
                <div className="rounded-lg border p-3 flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <Badge variant={detail.isActive ? "default" : "outline"} className="w-fit">
                    {detail.isActive ? "Aktif" : "Nonaktif"}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Users className="size-4" /> Anggota ({detail.members.length})
                  </h4>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/employees">Kelola Karyawan</Link>
                  </Button>
                </div>

                {detail.members.length === 0 ? (
                  <div className="text-center py-6 border rounded-lg bg-muted/20">
                    <Users className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">Belum ada anggota di tim ini</p>
                    <p className="text-xs text-muted-foreground">Assign via Edit Karyawan → pilih Tim</p>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-hidden max-h-[260px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.members.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium leading-none">{m.name}</span>
                                <span className="text-xs text-muted-foreground">{m.email || "-"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {m.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={m.isActive ? "default" : "outline"}>
                                {m.isActive ? "Aktif" : "Off"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">Gagal memuat detail</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Alert */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Tim?</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin ingin menghapus <span className="font-semibold text-foreground">{selected?.name}</span>? Tindakan tidak bisa dibatalkan.
              Jika masih ada anggota, pindahkan dulu ke tim lain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={submitting}
            >
              {submitting && <Spinner data-icon="inline-start" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
