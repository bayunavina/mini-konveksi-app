"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/shared"
import {
  ArrowRightIcon,
  CircleStackIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  CloudArrowDownIcon,
  ClockIcon,
  DocumentArrowDownIcon,
} from "@heroicons/react/24/outline"
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/constants"
import { toast } from "sonner"

interface Employee {
  id: string
  name: string
  email?: string
  role: string
  pin?: string
  isActive: boolean
  lastLogin?: string | null
  hasPassword?: boolean
}

interface PreviewData {
  transactions: number
  jobOrders: number
  products: number
  materialLots: number
  productionAssignments: number
  qcReports: number
  transfers: number
  employees: number
  inventoryMovements: number
  notifications: number
  salaries: number
  advances: number
  assets: number
}

const CONFIRM_TEXT = "FACTORY RESET"

export default function SettingsPage() {
  const [users, setUsers] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  // Backup states
  const [backupLoading, setBackupLoading] = useState(false)
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const [restoreMode, setRestoreMode] = useState<"merge" | "replace">("merge")
  const [restoring, setRestoring] = useState(false)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Factory reset states
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [factoryScope, setFactoryScope] = useState<string>("all")
  const [confirmText, setConfirmText] = useState("")
  const [factoryLoading, setFactoryLoading] = useState(false)
  const [showFactoryDialog, setShowFactoryDialog] = useState(false)
  const [factoryResult, setFactoryResult] = useState<Record<string, number> | null>(null)
  const [showResultDialog, setShowResultDialog] = useState(false)

  useEffect(() => {
    fetchUsers()
    fetchPreview()
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

  const fetchPreview = async () => {
    setPreviewLoading(true)
    try {
      const res = await fetch("/api/factory-reset")
      if (res.ok) {
        const data = await res.json()
        setPreview(data.preview)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleBackup = async () => {
    setBackupLoading(true)
    try {
      const res = await fetch("/api/backup?download=true")
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || "Gagal membuat backup")
        return
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const disposition = res.headers.get("Content-Disposition")
      let filename = `backup-mini-konveksi-${new Date().toISOString().slice(0, 10)}.json`
      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/)
        if (match) filename = match[1]
      }
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Backup berhasil diunduh", { description: filename })
    } catch (error) {
      console.error(error)
      toast.error("Gagal mengunduh backup")
    } finally {
      setBackupLoading(false)
    }
  }

  const handleRestoreFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setRestoreFile(file)
  }

  const handleRestore = async () => {
    if (!restoreFile) {
      toast.error("Pilih file backup terlebih dahulu")
      return
    }
    setRestoring(true)
    try {
      const text = await restoreFile.text()
      let json: any
      try {
        json = JSON.parse(text)
      } catch {
        toast.error("File backup tidak valid (bukan JSON)")
        setRestoring(false)
        return
      }

      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...json, mode: restoreMode }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Gagal restore backup")
        return
      }
      toast.success(data.message || "Restore berhasil", {
        description: Object.entries(data.restored || {}).map(([k, v]) => `${k}: ${v}`).join(", "),
      })
      setRestoreFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      setShowRestoreDialog(false)
      fetchPreview()
      fetchUsers()
    } catch (error) {
      console.error(error)
      toast.error("Gagal restore backup")
    } finally {
      setRestoring(false)
    }
  }

  const handleFactoryReset = async () => {
    if (confirmText !== CONFIRM_TEXT) {
      toast.error(`Ketik "${CONFIRM_TEXT}" untuk konfirmasi`)
      return
    }
    setFactoryLoading(true)
    try {
      const res = await fetch("/api/factory-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText, scope: factoryScope }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Gagal factory reset")
        return
      }
      toast.success(data.message || "Factory reset berhasil")
      setFactoryResult(data.deleted)
      setShowResultDialog(true)
      setShowFactoryDialog(false)
      setConfirmText("")
      fetchPreview()
      fetchUsers()
    } catch (error) {
      console.error(error)
      toast.error("Gagal melakukan factory reset")
    } finally {
      setFactoryLoading(false)
    }
  }

  const totalRecords = preview ? Object.values(preview).reduce((a, b) => a + b, 0) : 0

  const scopeLabels: Record<string, string> = {
    all: "Semua Data (Factory Reset)",
    transactions: "Hanya Transaksi Keuangan",
    production: "Hanya Data Produksi",
    inventory: "Hanya Data Inventory",
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Pengaturan"
        description="Pengaturan sistem, data, dan manajemen aplikasi"
      />

      <Card>
        <CardHeader>
          <CardTitle>Menu Settings</CardTitle>
          <CardDescription>Kelola pengaturan aplikasi</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/dashboard/settings/users">
            <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Password & User
                  <ArrowRightIcon className="h-4 w-4" />
                </CardTitle>
                <CardDescription>Kelola password dan data user</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/dashboard/settings/master">
            <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Data Master
                  <ArrowRightIcon className="h-4 w-4" />
                </CardTitle>
                <CardDescription>SKU, Supplier, Kategori Biaya</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/dashboard/settings/general">
            <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Pengaturan Umum
                  <ArrowRightIcon className="h-4 w-4" />
                </CardTitle>
                <CardDescription>Konfigurasi sistem</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar User</CardTitle>
          <CardDescription>Kelola password dan last login user</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden md:table-cell">Nama</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden lg:table-cell">Status</TableHead>
                <TableHead>Last Login</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Skeleton className="h-8 w-full mx-auto max-w-md" />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Belum ada user
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium hidden md:table-cell">{user.name}</TableCell>
                    <TableCell className="hidden lg:table-cell">{user.email || "-"}</TableCell>
                    <TableCell>
                      <Badge className={ROLE_COLORS[user.role as keyof typeof ROLE_COLORS]}>
                        {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.lastLogin ? (
                        <span className="text-sm text-muted-foreground">
                          {new Date(user.lastLogin).toLocaleString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                          Belum pernah
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Backup & Restore Section */}
      <Card id="backup" className="border-blue-200 dark:border-blue-900 scroll-mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleStackIcon className="h-5 w-5 text-blue-600" />
            Backup & Restore
          </CardTitle>
          <CardDescription>Cadangkan dan pulihkan data sistem. Backup berisi semua tabel dalam format JSON.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Backup Info */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2 space-y-4">
              <div className="rounded-lg border p-4 bg-blue-50/50 dark:bg-blue-950/20">
                <h4 className="font-medium flex items-center gap-2 text-blue-900 dark:text-blue-100">
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  Backup Data
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Unduh file backup berisi seluruh data: transaksi, job order, produk, material, karyawan, dan pengaturan.
                  Simpan file ini di tempat aman untuk keperluan restore atau migrasi.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button onClick={handleBackup} disabled={backupLoading} className="bg-blue-600 hover:bg-blue-700">
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    {backupLoading ? "Memproses..." : "Backup Sekarang"}
                  </Button>
                  <Button variant="outline" onClick={fetchPreview} disabled={previewLoading}>
                    <ClockIcon className="h-4 w-4 mr-2" />
                    Refresh Info
                  </Button>
                </div>
                {preview && (
                  <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
                    <ShieldCheckIcon className="h-3 w-3" />
                    Total {totalRecords.toLocaleString("id-ID")} records akan di-backup • {preview.transactions} transaksi • {preview.jobOrders} job order • {preview.employees} karyawan
                  </div>
                )}
              </div>

              <div className="rounded-lg border p-4">
                <h4 className="font-medium flex items-center gap-2">
                  <ArrowUpTrayIcon className="h-4 w-4 text-green-600" />
                  Restore Data
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Pulihkan data dari file backup JSON. Mode <b>Merge</b> akan menambah data tanpa menghapus yang ada. Mode <b>Replace</b> akan menghapus data lama terlebih dahulu (kecuali akun superadmin).
                </p>
                <div className="space-y-3 mt-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="backup-file">File Backup (.json)</Label>
                      <Input
                        id="backup-file"
                        type="file"
                        accept=".json,application/json"
                        ref={fileInputRef}
                        onChange={handleRestoreFileChange}
                      />
                      {restoreFile && (
                        <p className="text-xs text-green-600">Terpilih: {restoreFile.name} ({(restoreFile.size / 1024).toFixed(1)} KB)</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Mode Restore</Label>
                      <Select value={restoreMode} onValueChange={(v) => setRestoreMode(v as "merge" | "replace")}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="merge">Merge (tambah, skip duplikat)</SelectItem>
                          <SelectItem value="replace">Replace (hapus dulu, lalu restore)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="border-green-200 text-green-700 hover:bg-green-50"
                    onClick={() => setShowRestoreDialog(true)}
                    disabled={!restoreFile || restoring}
                  >
                    <CloudArrowDownIcon className="h-4 w-4 mr-2" />
                    Restore Sekarang
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <h4 className="font-medium text-sm mb-3">Ringkasan Data</h4>
                {previewLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-4 w-full" />)}
                  </div>
                ) : preview ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Transaksi</span><span className="font-medium">{preview.transactions}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Job Orders</span><span className="font-medium">{preview.jobOrders}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Produk</span><span className="font-medium">{preview.products}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Material Lots</span><span className="font-medium">{preview.materialLots}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Transfers</span><span className="font-medium">{preview.transfers}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Employees</span><span className="font-medium">{preview.employees}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">QC Reports</span><span className="font-medium">{preview.qcReports}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Assets</span><span className="font-medium">{preview.assets}</span></div>
                    <div className="border-t pt-2 mt-2 flex justify-between font-medium">
                      <span>Total Records</span><span>{totalRecords}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Tidak dapat memuat ringkasan</p>
                )}
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  <strong>Tips:</strong> Lakukan backup secara berkala, terutama sebelum factory reset atau migrasi. File backup berisi data sensitif, simpan dengan aman.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Factory Reset Section */}
      <Card id="factory-reset" className="border-red-200 dark:border-red-900 scroll-mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <ExclamationTriangleIcon className="h-5 w-5" />
            Zona Berbahaya — Factory Reset
          </CardTitle>
          <CardDescription>Hapus data sistem dan kembalikan ke pengaturan awal. Tindakan ini tidak dapat dibatalkan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 p-4">
            <h4 className="font-medium text-red-900 dark:text-red-100 flex items-center gap-2">
              <TrashIcon className="h-4 w-4" />
              Factory Reset
            </h4>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              Factory Reset akan menghapus <strong>semua data bisnis</strong> termasuk transaksi, job order, produk, inventory, dan laporan.
              Akun superadmin (<code className="bg-red-100 dark:bg-red-900 px-1 rounded">erpkonveksi@gmail.com</code>) akan dipertahankan agar Anda tetap bisa login.
              <strong> Lakukan backup terlebih dahulu!</strong>
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="scope">Scope Reset</Label>
                <Select value={factoryScope} onValueChange={setFactoryScope}>
                  <SelectTrigger id="scope" className="border-red-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Data (Factory Reset penuh)</SelectItem>
                    <SelectItem value="transactions">Hanya Transaksi Keuangan</SelectItem>
                    <SelectItem value="production">Hanya Data Produksi</SelectItem>
                    <SelectItem value="inventory">Hanya Data Inventory</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {factoryScope === "all" && "Menghapus semua data bisnis, karyawan non-admin, dan pengaturan. Superadmin dipertahankan."}
                  {factoryScope === "transactions" && "Hanya menghapus data transaksi keuangan."}
                  {factoryScope === "production" && "Hanya menghapus data produksi, QC, dan assignment. Job order di-reset ke DRAFT."}
                  {factoryScope === "inventory" && "Hanya menghapus data inventory, material lots, dan transfers."}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Ketik <code className="bg-muted px-1 rounded font-bold">{CONFIRM_TEXT}</code> untuk konfirmasi</Label>
                <Input
                  id="confirm"
                  placeholder={CONFIRM_TEXT}
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className={confirmText === CONFIRM_TEXT ? "border-green-500 focus-visible:ring-green-500" : confirmText ? "border-red-300" : ""}
                />
                {confirmText && confirmText !== CONFIRM_TEXT && (
                  <p className="text-xs text-red-600">Teks konfirmasi belum sesuai. Ketik persis: {CONFIRM_TEXT}</p>
                )}
                {confirmText === CONFIRM_TEXT && (
                  <p className="text-xs text-green-600 flex items-center gap-1"><ShieldCheckIcon className="h-3 w-3" /> Konfirmasi cocok</p>
                )}
              </div>

              <Button
                variant="destructive"
                disabled={confirmText !== CONFIRM_TEXT || factoryLoading}
                onClick={() => setShowFactoryDialog(true)}
                className="w-full"
              >
                <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                {factoryLoading ? "Memproses..." : `Reset ${scopeLabels[factoryScope] || factoryScope}`}
              </Button>
              <p className="text-xs text-muted-foreground text-center">Butuh akses Admin. Hanya admin yang dapat melakukan factory reset.</p>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <h4 className="font-medium text-sm flex items-center justify-between">
                Preview Data yang Akan Dihapus
                <Badge variant="outline" className="text-red-600 border-red-200">{factoryScope === "all" ? `${totalRecords} records` : scopeLabels[factoryScope]}</Badge>
              </h4>
              {previewLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-4 w-full" />)}
                </div>
              ) : preview ? (
                <div className="space-y-1.5 text-sm max-h-[220px] overflow-auto pr-1">
                  <div className="flex justify-between py-1 border-b"><span>Transaksi</span><span className="font-mono">{preview.transactions}</span></div>
                  <div className="flex justify-between py-1 border-b"><span>Job Orders</span><span className="font-mono">{preview.jobOrders}</span></div>
                  <div className="flex justify-between py-1 border-b"><span>Produk</span><span className="font-mono">{preview.products}</span></div>
                  <div className="flex justify-between py-1 border-b"><span>Material Lots</span><span className="font-mono">{preview.materialLots}</span></div>
                  <div className="flex justify-between py-1 border-b"><span>Assignments</span><span className="font-mono">{preview.productionAssignments}</span></div>
                  <div className="flex justify-between py-1 border-b"><span>Transfers</span><span className="font-mono">{preview.transfers}</span></div>
                  <div className="flex justify-between py-1 border-b"><span>Employees</span><span className="font-mono">{preview.employees} <span className="text-xs text-muted-foreground">(keep 1 admin)</span></span></div>
                  <div className="flex justify-between py-1 border-b"><span>Inventory Moves</span><span className="font-mono">{preview.inventoryMovements}</span></div>
                  <div className="flex justify-between py-1 border-b"><span>Notifications</span><span className="font-mono">{preview.notifications}</span></div>
                  <div className="flex justify-between py-1 border-b"><span>Salaries</span><span className="font-mono">{preview.salaries}</span></div>
                  <div className="flex justify-between py-1"><span>Assets</span><span className="font-mono">{preview.assets}</span></div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Gagal memuat preview</p>
              )}
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded p-2.5">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  Pastikan sudah <strong>backup</strong> sebelum melanjutkan. Data yang terhapus tidak dapat dikembalikan tanpa file backup.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CloudArrowDownIcon className="h-5 w-5 text-green-600" />
              Konfirmasi Restore
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span>Anda akan melakukan restore dengan mode <strong>{restoreMode === "merge" ? "Merge" : "Replace"}</strong>.</span>
              {restoreMode === "replace" && (
                <span className="block text-red-600 font-medium mt-2">⚠️ Mode Replace akan menghapus data yang ada sebelum restore! Pastikan sudah backup.</span>
              )}
              <span className="block mt-2">File: <code className="bg-muted px-1 rounded">{restoreFile?.name}</code></span>
              <span className="block">Lanjutkan restore?</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleRestore()
              }}
              disabled={restoring}
              className="bg-green-600 hover:bg-green-700"
            >
              {restoring ? "Memproses..." : "Ya, Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Factory Reset Confirmation Dialog */}
      <AlertDialog open={showFactoryDialog} onOpenChange={setShowFactoryDialog}>
        <AlertDialogContent className="border-red-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <ExclamationTriangleIcon className="h-5 w-5" />
              Yakin ingin Factory Reset?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span className="block">
                Anda akan menghapus <strong>{factoryScope === "all" ? "SEMUA data bisnis" : scopeLabels[factoryScope]}</strong> secara permanen.
              </span>
              <span className="block bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded p-2.5 text-red-700 dark:text-red-300 text-sm">
                Tindakan ini <strong>tidak dapat dibatalkan</strong>. Pastikan Anda sudah melakukan backup. Akun superadmin akan dipertahankan.
              </span>
              <span className="block text-xs">Scope: <Badge variant="destructive">{factoryScope}</Badge></span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={factoryLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleFactoryReset()
              }}
              disabled={factoryLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {factoryLoading ? "Memproses..." : "Ya, Hapus Permanen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Result Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <ShieldCheckIcon className="h-5 w-5" />
              Factory Reset Berhasil
            </DialogTitle>
            <DialogDescription>Data berikut telah dihapus:</DialogDescription>
          </DialogHeader>
          <div className="max-h-[300px] overflow-auto rounded border p-3 bg-muted/30">
            {factoryResult ? (
              <div className="space-y-1 text-sm">
                {Object.entries(factoryResult).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-mono font-medium">{v}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ada detail</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowResultDialog(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
