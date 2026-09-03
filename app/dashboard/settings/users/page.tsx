"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormattedNumberInput } from "@/components/ui/formatted-number-input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
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
import { ArrowLeftIcon, PlusIcon, UserIcon, KeyIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline"
import { toast } from "sonner"

interface Employee {
  id: string
  name: string
  email?: string
  phone?: string
  role: string
  isActive: boolean
  baseSalary?: number
  team?: {
    id: string
    name: string
  }
}

interface Team {
  id: string
  name: string
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  KARYAWAN: "Karyawan",
  QC: "Quality Control",
  GUDANG: "Gudang",
}

const SYSTEM_ADMIN_EMAIL = "erpkonveksi@gmail.com"

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-800",
  KARYAWAN: "bg-[var(--chart-blue)]/10 text-[var(--chart-blue)]",
  QC: "bg-purple-100 text-purple-800",
  GUDANG: "bg-green-100 text-green-800",
}

export default function UsersPage() {
  const [users, setUsers] = useState<Employee[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  const [selectedUser, setSelectedUser] = useState<Employee | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    phone: "",
    teamId: "",
    baseSalary: "",
  })
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    role: "",
    phone: "",
    teamId: "",
    baseSalary: "",
    isActive: true,
  })

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<Employee | null>(null)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)

  useEffect(() => {
    fetchUsers()
    fetchTeams()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/employees")
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTeams = async () => {
    try {
      const response = await fetch("/api/teams")
      if (response.ok) {
        const data = await response.json()
        setTeams(data)
      }
    } catch (error) {
      console.error("Error fetching teams:", error)
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.email !== SYSTEM_ADMIN_EMAIL &&
      (u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const getSuggestions = () => {
    if (!searchQuery || searchQuery.length < 2) return []
    
    const suggestions: { type: string; value: string; label: string }[] = []
    const seen = new Set<string>()
    
    users.forEach((u) => {
      if (u.email === SYSTEM_ADMIN_EMAIL) return
      const name = u.name
      if (name && name.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(name)) {
        seen.add(name)
        suggestions.push({ type: "name", value: name, label: name })
      }
      const email = u.email
      if (email && email.toLowerCase().includes(searchQuery.toLowerCase()) && !seen.has(email)) {
        seen.add(email)
        suggestions.push({ type: "email", value: email, label: email })
      }
    })
    
    return suggestions.slice(0, 10)
  }

  const suggestions = getSuggestions()

  const selectSuggestion = (value: string) => {
    setSearchQuery(value)
    setShowSuggestions(false)
  }

  const handleCreateUser = async () => {
    if (!formData.name || !formData.email || !formData.role) return

    setSaving(true)
    try {
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          role: formData.role,
          teamId: formData.teamId === "__none__" ? null : formData.teamId,
          baseSalary: parseInt(formData.baseSalary) || 0,
        }),
      })

      if (response.ok) {
        await fetchUsers()
        setNewDialogOpen(false)
        setFormData({ name: "", email: "", role: "", phone: "", teamId: "", baseSalary: "" })
        toast.success("User berhasil ditambahkan")
      } else {
        toast.error("Gagal menambahkan user")
      }
    } catch (error) {
      console.error("Error creating user:", error)
      toast.error("Terjadi kesalahan")
    } finally {
      setSaving(false)
    }
  }

  const openEditDialog = (user: Employee) => {
    setSelectedUser(user)
    setEditFormData({
      name: user.name,
      email: user.email || "",
      role: user.role,
      phone: user.phone || "",
      teamId: user.team?.id || "",
      baseSalary: user.baseSalary?.toString() || "",
      isActive: user.isActive,
    })
    setEditDialogOpen(true)
  }

  const handleUpdateUser = async () => {
    if (!selectedUser || !editFormData.name || !editFormData.email || !editFormData.role) return

    setSaving(true)
    try {
      const response = await fetch(`/api/employees/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editFormData.name,
          email: editFormData.email,
          phone: editFormData.phone || null,
          role: editFormData.role,
          teamId: editFormData.teamId === "__none__" ? null : editFormData.teamId,
          baseSalary: parseInt(editFormData.baseSalary) || 0,
          isActive: editFormData.isActive,
        }),
      })

      if (response.ok) {
        await fetchUsers()
        setEditDialogOpen(false)
        setSelectedUser(null)
        toast.success("Data user berhasil diperbarui")
      } else {
        toast.error("Gagal memperbarui user")
      }
    } catch (error) {
      console.error("Error updating user:", error)
      toast.error("Terjadi kesalahan")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return

    setSaving(true)
    try {
      const response = await fetch(`/api/employees/${userToDelete.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await fetchUsers()
        setDeleteDialogOpen(false)
        setUserToDelete(null)
        toast.success("User berhasil dihapus")
      } else {
        const data = await response.json()
        toast.error(data.error || "Gagal menghapus user")
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      toast.error("Terjadi kesalahan")
    } finally {
      setSaving(false)
    }
  }

  const openDeleteDialog = (user: Employee) => {
    if (user.email === SYSTEM_ADMIN_EMAIL) {
      toast.error("Admin Sistem tidak dapat dihapus!")
      return
    }
    setUserToDelete(user)
    setDeleteDialogOpen(true)
  }

  const openPasswordDialog = (user: Employee) => {
    setSelectedUser(user)
    setNewPassword("")
    setConfirmPassword("")
    setPasswordDialogOpen(true)
  }

  const handleUpdatePassword = async () => {
    if (!selectedUser) return
    
    if (newPassword.length < 6) {
      toast.error("Password minimal 6 karakter")
      return
    }
    
    if (newPassword !== confirmPassword) {
      toast.error("Password tidak sama!", {
        description: "Pastikan password baru dan konfirmasi password sama."
      })
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          email: selectedUser.email,
          password: newPassword,
        }),
      })

      const data = await response.json()
      
      if (response.ok && data.success) {
        setPasswordDialogOpen(false)
        setSelectedUser(null)
        setNewPassword("")
        setConfirmPassword("")
        toast.success("Password berhasil diperbarui")
      } else {
        toast.error(data.message || "Gagal memperbarui password")
      }
    } catch (error) {
      console.error("Error updating password:", error)
      toast.error("Terjadi kesalahan saat menyimpan password")
    } finally {
      setSaving(false)
    }
  }

  const isProtectedUser = (user: Employee | null) => {
    return user?.email === SYSTEM_ADMIN_EMAIL
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="User & Role"
        description="Kelola user dan role akses"
        actions={
          <Button variant="outline" asChild>
            <Link href="/dashboard/settings">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Kembali
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total User</CardTitle>
            <Badge className="bg-blue-100 text-blue-800">{filteredUsers.length}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "-" : filteredUsers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif</CardTitle>
            <Badge className="bg-green-100 text-green-800">
              {loading ? "-" : filteredUsers.filter((u) => u.isActive).length}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "-" : filteredUsers.filter((u) => u.isActive).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-1">
              {["ADMIN", "KARYAWAN", "QC"].map((role) => (
                <div key={role} className="flex justify-between">
                  <span>{ROLE_LABELS[role]}</span>
                  <span className="font-medium">
                    {loading ? "-" : filteredUsers.filter((u) => u.role === role).length}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Daftar User</CardTitle>
              <CardDescription>Kelola user dan akses</CardDescription>
            </div>
              <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="dark:bg-[var(--brand-primary)] dark:hover:bg-[var(--brand-primary)]/80">
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Tambah User
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Tambah User Baru</DialogTitle>
                  <DialogDescription>
                    Tambahkan user baru dan tentukan role akses
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama</Label>
                    <Input
                      id="name"
                      placeholder="Nama lengkap..."
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@contoh.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(v) => setFormData({ ...formData, role: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Administrator</SelectItem>
                        <SelectItem value="QC">Quality Control</SelectItem>
                        <SelectItem value="KARYAWAN">Karyawan</SelectItem>
                        <SelectItem value="GUDANG">Gudang</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="team">Tim (opsional)</Label>
                    <Select
                      value={formData.teamId}
                      onValueChange={(v) => setFormData({ ...formData, teamId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih tim" />
                      </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Tanpa Tim</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salary">Gaji Pokok (opsional)</Label>
                    <FormattedNumberInput
                      id="salary"
                      placeholder="0"
                      value={formData.baseSalary}
                      onValueChange={(v) => setFormData({ ...formData, baseSalary: v })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">No. Telepon (opsional)</Label>
                    <Input
                      id="phone"
                      placeholder="08xxxxxxxxxx"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setNewDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button
                    onClick={handleCreateUser}
                    disabled={!formData.name || !formData.email || !formData.role || saving}
                  >
                    {saving ? <Spinner data-icon="inline-start" /> : <UserIcon className="mr-2 h-4 w-4" />}
                    Simpan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Input
              type="search"
              placeholder="Cari user..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
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
                      s.type === "name" ? "bg-blue-100 text-blue-700" :
                      "bg-green-100 text-green-700"
                    }`}>
                      {s.type === "name" ? "Nama" : "Email"}
                    </span>
                    <span className="font-medium">{s.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden md:table-cell">Nama</TableHead>
                  <TableHead className="hidden lg:table-cell">Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium hidden md:table-cell">{user.name}</TableCell>
                    <TableCell className="hidden lg:table-cell">{user.email || "-"}</TableCell>
                    <TableCell>
                      <Badge className={`${ROLE_COLORS[user.role] || "bg-gray-100"}`}>
                        {ROLE_LABELS[user.role] || user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(user)} className="hidden sm:inline-flex">
                          <PencilIcon className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEditDialog(user)} className="sm:hidden p-2">
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openPasswordDialog(user)} className="hidden sm:inline-flex">
                          <KeyIcon className="h-3 w-3 mr-1" />
                          Password
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openPasswordDialog(user)} className="sm:hidden p-2">
                          <KeyIcon className="h-4 w-4" />
                        </Button>
                        {!isProtectedUser(user) && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => openDeleteDialog(user)}
                          >
                            <TrashIcon className="h-3 w-3" />
                          </Button>
                        )}
                        {isProtectedUser(user) && (
                          <span className="inline-flex items-center px-2 py-1 text-xs text-muted-foreground">
                            Locked
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Perbarui data user {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>

            <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nama</Label>
              <Input
                id="edit-name"
                placeholder="Nama lengkap..."
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                disabled={!!(selectedUser && isProtectedUser(selectedUser))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="email@contoh.com"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={editFormData.role}
                onValueChange={(v) => setEditFormData({ ...editFormData, role: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrator</SelectItem>
                  <SelectItem value="QC">Quality Control</SelectItem>
                  <SelectItem value="KARYAWAN">Karyawan</SelectItem>
                  <SelectItem value="GUDANG">Gudang</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-team">Tim</Label>
              <Select
                value={editFormData.teamId}
                onValueChange={(v) => setEditFormData({ ...editFormData, teamId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tim" />
                </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Tanpa Tim</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-salary">Gaji Pokok</Label>
              <FormattedNumberInput
                id="edit-salary"
                placeholder="0"
                value={editFormData.baseSalary}
                onValueChange={(v) => setEditFormData({ ...editFormData, baseSalary: v })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone">No. Telepon</Label>
              <Input
                id="edit-phone"
                placeholder="08xxxxxxxxxx"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-active"
                checked={editFormData.isActive}
                onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="edit-active">User Aktif</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleUpdateUser}
              disabled={!editFormData.name || !editFormData.email || !editFormData.role || saving}
            >
              {saving ? <Spinner data-icon="inline-start" /> : <PencilIcon className="mr-2 h-4 w-4" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <TrashIcon className="h-5 w-5" />
              Hapus User
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus user ini?
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Nama</span>
              <span className="text-sm font-medium">{userToDelete?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium">{userToDelete?.email || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Role</span>
              <Badge className={`${ROLE_COLORS[userToDelete?.role || ""] || "bg-gray-100"}`}>
                {ROLE_LABELS[userToDelete?.role || ""] || userToDelete?.role}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={userToDelete?.isActive ? "default" : "secondary"}>
                {userToDelete?.isActive ? "Aktif" : "Nonaktif"}
              </Badge>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <strong>Peringatan:</strong> Tindakan ini tidak dapat dibatalkan. Semua data terkait user ini akan dihapus permanen.
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteUser}
              disabled={saving}
            >
              {saving ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <TrashIcon className="mr-2 h-4 w-4" />
              )}
              Hapus User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="text-center pb-2">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <KeyIcon className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">Set Password</DialogTitle>
            <DialogDescription>
              Atur password untuk <span className="font-medium text-foreground">{selectedUser?.name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-sm font-medium">Password Baru</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                />
              </div>
              {newPassword.length > 0 && newPassword.length < 6 && (
                <p className="text-xs text-destructive">Password minimal 6 karakter</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-sm font-medium">Konfirmasi Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Ulangi password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`pr-10 ${
                    confirmPassword.length > 0 && newPassword !== confirmPassword 
                      ? 'border-destructive focus-visible:ring-destructive' 
                      : ''
                  }`}
                />
                {confirmPassword.length > 0 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {newPassword === confirmPassword ? (
                      <span className="text-green-500 text-sm">✓</span>
                    ) : (
                      <span className="text-destructive text-sm">✗</span>
                    )}
                  </div>
                )}
              </div>
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <span>⚠</span> Password tidak sama
                </p>
              )}
            </div>

            {newPassword.length >= 6 && confirmPassword.length > 0 && newPassword === confirmPassword && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2">
                <span>✓</span> Password cocok
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)} className="flex-1">
              Batal
            </Button>
            <Button 
              onClick={handleUpdatePassword} 
              disabled={newPassword.length < 6 || newPassword !== confirmPassword || saving}
              className="flex-1"
            >
              {saving ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <KeyIcon className="mr-2 h-4 w-4" />
              )}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
