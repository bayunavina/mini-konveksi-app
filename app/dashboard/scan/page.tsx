"use client"

import { useMemo, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/shared"
import { ScanModal } from "@/components/scanner"
import { useFetch } from "@/hooks/useFetch"
import { useSKUMaster } from "@/hooks/useSKUMaster"
import { parseQRPayload } from "@/lib/qr-payload"
import { formatDateShort } from "@/lib/utils"
import {
  QrCodeIcon,
  CameraIcon,
  CheckIcon,
  XMarkIcon,
  CommandLineIcon,
  TruckIcon,
  ArchiveBoxIcon,
  UsersIcon,
  BuildingOffice2Icon,
  TagIcon,
} from "@heroicons/react/24/outline"

interface TransferItem {
  id: string
  skuCode?: string | null
  skuName?: string | null
  quantity: number
  unit: string
}

interface Transfer {
  id: string
  transferNumber: string
  type: string
  status: string
  createdAt: string
  items?: TransferItem[]
}

interface MaterialLot {
  id: string
  lotNumber: string
  qrCode: string
  quantity: number
  initialQty: number
  status: string
  supplier?: string | null
  createdAt: string
  product?: { id?: string | null; code?: string | null; name?: string | null } | null
}

interface Employee {
  id: string
  name: string
  role?: string | null
  qrCode?: string | null
}

interface Assignment {
  id: string
  targetQty: number
  completedQty?: number | null
  acceptedQty?: number | null
  rejectedQty?: number | null
  status: string
  employee?: { id: string; name: string } | null
  jobOrder?: { id: string; joNumber?: string | null } | null
  product?: { id: string; name?: string | null; code?: string | null } | null
  assignedAt?: string | null
}

interface ScanHistory {
  id: string
  data: string
  type: string
  result: string
  time: string
  timestamp: number
  resolved?: ResolvedResult | null
}

const HISTORY_TTL_MS = 24 * 60 * 60 * 1000 // 1 hari

function isHistoryExpired(h: ScanHistory): boolean {
  if (!h || typeof h.timestamp !== "number") return true
  return Date.now() - h.timestamp > HISTORY_TTL_MS
}

type ResolvedType =
  | "TRANSFER"
  | "MATERIAL_LOT"
  | "EMPLOYEE"
  | "JOB_ORDER"
  | "SKU"
  | "UNKNOWN"

const TYPE_LABEL: Record<ResolvedType, string> = {
  TRANSFER: "Transfer",
  MATERIAL_LOT: "Bahan Lot",
  EMPLOYEE: "Penjahit (Karyawan)",
  JOB_ORDER: "Job Order",
  SKU: "SKU / Produk",
  UNKNOWN: "Tidak Dikenali",
}

const TYPE_ICON: Record<ResolvedType, React.ElementType> = {
  TRANSFER: TruckIcon,
  MATERIAL_LOT: ArchiveBoxIcon,
  EMPLOYEE: UsersIcon,
  JOB_ORDER: BuildingOffice2Icon,
  SKU: TagIcon,
  UNKNOWN: QrCodeIcon,
}

const TYPE_BADGE: Record<ResolvedType, string> = {
  TRANSFER: "bg-emerald-100 text-emerald-800",
  MATERIAL_LOT: "bg-blue-100 text-blue-800",
  EMPLOYEE: "bg-purple-100 text-purple-800",
  JOB_ORDER: "bg-amber-100 text-amber-800",
  SKU: "bg-cyan-100 text-cyan-800",
  UNKNOWN: "bg-gray-100 text-gray-800",
}

interface ResultRow {
  label: string
  value: string | number
}

interface ResolvedResult {
  type: ResolvedType
  found: boolean
  code: string
  title: string
  subtitle?: string
  rows: ResultRow[]
}

function norm(value: string): string {
  return value.trim().toLowerCase().replace(/[-_]/g, "")
}

export default function ScanPage() {
  const [scanModalOpen, setScanModalOpen] = useState(false)
  const [rawInput, setRawInput] = useState("")
  const [scanResult, setScanResult] = useState<ResolvedResult | null>(null)
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([])
  const [resolving, setResolving] = useState(false)

  const { data: transfers, loading: transfersLoading } = useFetch<Transfer[]>("/api/transfers")
  const { data: lots, loading: lotsLoading } = useFetch<MaterialLot[]>("/api/material-lots")
  const { data: employees, loading: employeesLoading } = useFetch<Employee[]>("/api/employees")
  const { data: assignments, loading: assignmentsLoading } = useFetch<Assignment[]>("/api/production/assign")
  const { skus: skuMaster, loading: skuLoading } = useSKUMaster()

  const dataLoading = transfersLoading || lotsLoading || employeesLoading || assignmentsLoading || skuLoading

  useEffect(() => {
    const saved = localStorage.getItem("scanHistory")
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ScanHistory[]
        const fresh = Array.isArray(parsed) ? parsed.filter((h) => !isHistoryExpired(h)) : []
        setScanHistory(fresh)
        localStorage.setItem("scanHistory", JSON.stringify(fresh))
      } catch {
        // ignore corrupt history
      }
    }
  }, [])

  const saveHistory = (data: string, result: ResolvedResult) => {
    const now = Date.now()
    const newScan: ScanHistory = {
      id: now.toString(),
      data,
      type: TYPE_LABEL[result.type],
      result: result.found ? "MATCH" : "NO_MATCH",
      time: new Date(now).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      timestamp: now,
      resolved: result,
    }
    const updated = [newScan, ...scanHistory.filter((h) => !isHistoryExpired(h))]
    setScanHistory(updated)
    localStorage.setItem("scanHistory", JSON.stringify(updated))
  }

  const resolve = useMemo(() => {
    return (raw: string): ResolvedResult => {
      const parsed = parseQRPayload(raw)
      const rawNorm = norm(raw)
      const code = parsed.payload?.code || raw

      // --- TRANSFER ---
      if (parsed.detectedType === "TRANSFER" || transfers?.some((t) => norm(t.transferNumber) === rawNorm)) {
        const t = transfers?.find(
          (x) => norm(x.transferNumber) === rawNorm || x.transferNumber.toLowerCase().includes(code.toLowerCase())
        )
        if (t) {
          return {
            type: "TRANSFER",
            found: true,
            code: t.transferNumber,
            title: t.transferNumber,
            subtitle: t.type === "INCOMING" ? "Barang Masuk" : "Barang Keluar",
            rows: [
              { label: "Status", value: t.status },
              { label: "Total Qty", value: (t.items?.reduce((s, i) => s + i.quantity, 0) || 0).toLocaleString() },
              { label: "Item", value: t.items?.map((i) => i.skuName || i.skuCode).join(", ") || "-" },
              { label: "Tanggal", value: formatDateShort(t.createdAt) },
            ],
          }
        }
      }

      // --- MATERIAL LOT ---
      if (
        parsed.detectedType === "MATERIAL_LOT" ||
        lots?.some((l) => norm(l.lotNumber) === rawNorm || norm(l.qrCode) === rawNorm)
      ) {
        const l = lots?.find(
          (x) =>
            norm(x.lotNumber) === rawNorm ||
            norm(x.qrCode) === rawNorm ||
            x.lotNumber.toLowerCase().includes(code.toLowerCase())
        )
        if (l) {
          return {
            type: "MATERIAL_LOT",
            found: true,
            code: l.lotNumber,
            title: l.lotNumber,
            subtitle: l.product?.name || l.product?.code || "-",
            rows: [
              { label: "SKU", value: l.product?.code || "-" },
              { label: "Awal", value: l.initialQty.toLocaleString() },
              { label: "Sisa", value: l.quantity.toLocaleString() },
              { label: "Supplier", value: l.supplier || "-" },
              { label: "Status", value: l.status },
            ],
          }
        }
      }

      // --- EMPLOYEE (Penjahit) ---
      if (
        parsed.detectedType === "EMPLOYEE" ||
        employees?.some((e) => (e.qrCode ? norm(e.qrCode) === rawNorm : false)) ||
        employees?.some((e) => e.name.toLowerCase() === raw)
      ) {
        const targetEmployee = parsed.payload?.id
          ? employees?.find((e) => e.id === parsed.payload?.id)
          : employees?.find(
              (e) => (e.qrCode ? norm(e.qrCode) === rawNorm : false) || e.name.toLowerCase() === raw.toLowerCase()
            )
        if (targetEmployee) {
          const empAssign = (assignments || []).filter((a) => a.employee?.id === targetEmployee.id)
          const totalTarget = empAssign.reduce((s, a) => s + a.targetQty, 0)
          const totalAccepted = empAssign.reduce((s, a) => s + (a.acceptedQty || 0), 0)
          const totalCompleted = empAssign.reduce((s, a) => s + (a.completedQty || 0), 0)
          return {
            type: "EMPLOYEE",
            found: true,
            code: targetEmployee.name,
            title: targetEmployee.name,
            subtitle: targetEmployee.role ? `Role: ${targetEmployee.role}` : undefined,
            rows: [
              { label: "Jumlah Assignment", value: empAssign.length },
              { label: "Total Target", value: totalTarget.toLocaleString() },
              { label: "Total Selesai", value: totalCompleted.toLocaleString() },
              { label: "Total Diterima", value: totalAccepted.toLocaleString() },
            ],
          }
        }
      }

      // --- JOB ORDER ---
      if (parsed.detectedType === "JOB_ORDER") {
        const a = assignments?.find(
          (x) => x.jobOrder?.joNumber?.toLowerCase() === code.toLowerCase()
        )
        if (a?.jobOrder?.joNumber) {
          const joAssign = (assignments || []).filter(
            (x) => x.jobOrder?.joNumber?.toLowerCase() === a.jobOrder?.joNumber?.toLowerCase()
          )
          const target = joAssign.reduce((s, x) => s + x.targetQty, 0)
          const completed = joAssign.reduce((s, x) => s + (x.completedQty || 0), 0)
          return {
            type: "JOB_ORDER",
            found: true,
            code: a.jobOrder.joNumber,
            title: a.jobOrder.joNumber,
            subtitle: a.product?.name || undefined,
            rows: [
              { label: "Status", value: a.status },
              { label: "Assignment", value: joAssign.length },
              { label: "Target", value: target.toLocaleString() },
              { label: "Selesai", value: completed.toLocaleString() },
            ],
          }
        }
      }

      // --- SKU ---
      const matchedSku = skuMaster.find(
        (s) => norm(s.code) === rawNorm || s.code.toLowerCase() === code.toLowerCase()
      )
      if (matchedSku) {
        const relatedLots = (lots || []).filter((l) => l.product?.code?.toLowerCase() === matchedSku.code.toLowerCase())
        const lotSisa = relatedLots.reduce((s, l) => s + (l.quantity || 0), 0)
        return {
          type: "SKU",
          found: true,
          code: matchedSku.code,
          title: `${matchedSku.code} - ${matchedSku.name}`,
          subtitle: matchedSku.category || undefined,
          rows: [
            { label: "Unit", value: matchedSku.unit },
            { label: "Jml. Lot", value: relatedLots.length },
            { label: "Total Sisa Lot", value: lotSisa.toLocaleString() },
          ],
        }
      }

      return {
        type: "UNKNOWN",
        found: false,
        code: raw,
        title: "Tidak ditemukan di data tracking",
        subtitle: "Kode tidak cocok dengan transfer, bahan lot, penjahit, job order, atau SKU.",
        rows: [],
      }
    }
  }, [transfers, lots, employees, assignments, skuMaster])

  const handleScan = async (raw: string) => {
    if (!raw || raw.length < 3) {
      setScanResult({
        type: "UNKNOWN",
        found: false,
        code: raw,
        title: "Kode terlalu pendek",
        subtitle: "Pastikan QR/barcode terpindai dengan benar.",
        rows: [],
      })
      return
    }

    // A kode like IMG_xxx / filename is a bad scan
    if (
      raw.match(/^(IMG_|DSC_|Photo_|PXL_|VID_)/i) ||
      raw.match(/\.(jpg|jpeg|png|gif|webp|mp4|mov)$/i)
    ) {
      setScanResult({
        type: "UNKNOWN",
        found: false,
        code: raw,
        title: "QR tidak terbaca",
        subtitle: "Gunakan QR code yang jelas.",
        rows: [],
      })
      return
    }

    setResolving(true)
    const result = resolve(raw)
    // If JOB_ORDER/EMPLOYEE etc. may need available assignments; else finalize
    setScanResult(result)
    setResolving(false)
    saveHistory(raw, result)
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (rawInput.trim()) {
      handleScan(rawInput.trim())
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Scan & Tracking"
        description="Scan QR/barcode untuk melihat korelasi data tracking (transfer, lot, penjahit, job order, SKU)"
        actions={
          <Button onClick={() => setScanModalOpen(true)} className="dark:bg-[var(--brand-primary)] dark:hover:bg-[var(--brand-primary)]/80">
            <QrCodeIcon className="mr-2 h-4 w-4" />
            Mulai Scan
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CameraIcon className="h-5 w-5" />
              Scan dengan Kamera
            </CardTitle>
            <CardDescription>
              Gunakan kamera untuk scan QR code atau barcode
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setScanModalOpen(true)} className="w-full" size="lg">
              <QrCodeIcon className="mr-2 h-5 w-5" />
              Buka Kamera
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CommandLineIcon className="h-5 w-5" />
              Input Manual / USB Scanner
            </CardTitle>
            <CardDescription>
              Ketik manual atau gunakan barcode scanner USB
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="Contoh: TRF-IN-250101-AB12, JO250101-AB, BB-..."
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
              />
              <Button type="submit" disabled={resolving}>
                Cari
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-3">
              Scanner barcode USB otomatis terdeteksi saat mengetik. Tekan Enter untuk memproses.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Result panel */}
      {resolving ? (
        <Card>
          <CardContent className="space-y-2 py-6">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ) : scanResult ? (
        <Card className={scanResult.found ? "border-green-500/40" : "border-red-500/40"}>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = TYPE_ICON[scanResult.type]
                  return <Icon className="h-5 w-5" />
                })()}
                <CardTitle className="text-sm sm:text-base">{scanResult.title}</CardTitle>
                <Badge className={TYPE_BADGE[scanResult.type]}>{TYPE_LABEL[scanResult.type]}</Badge>
                <Badge className={scanResult.found ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                  {scanResult.found ? "Cocok" : "Tidak Cocok"}
                </Badge>
              </div>
              {scanResult.subtitle && (
                <span className="text-xs text-muted-foreground">{scanResult.subtitle}</span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {scanResult.rows.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {scanResult.rows.map((row) => (
                  <div key={row.label} className="rounded-lg border bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">{row.label}</p>
                    <div className="text-sm font-semibold mt-0.5">{row.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{scanResult.subtitle}</p>
            )}
          </CardContent>
        </Card>
      ) : (
        dataLoading && (
          <Card>
            <CardContent className="space-y-2 py-6">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        )
      )}

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Scan Terakhir</CardTitle>
          <CardDescription className="text-xs">
            Hasil scan terakhir dengan data tracking terkait
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {scanHistory.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Belum ada riwayat scan</p>
            ) : (
              scanHistory.map((scan) => (
                <div
                  key={scan.id}
                  className="p-3 rounded-lg border"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${scan.result === "MATCH" ? "bg-green-100" : "bg-red-100"}`}>
                        {scan.result === "MATCH" ? (
                          <CheckIcon className="h-4 w-4 text-green-600" />
                        ) : (
                          <XMarkIcon className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-mono font-medium">{scan.data}</p>
                        <p className="text-xs text-muted-foreground">
                          {scan.type} - {scan.time}
                        </p>
                      </div>
                    </div>
                    <Badge className={scan.result === "MATCH" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {scan.result === "MATCH" ? "Cocok" : "Tidak Cocok"}
                    </Badge>
                  </div>

                  {scan.resolved && scan.resolved.rows.length > 0 && (
                    <div className="mt-3 pt-3 border-t grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {scan.resolved.rows.map((row) => (
                        <div key={row.label} className="rounded-lg bg-muted/50 p-2.5">
                          <p className="text-[10px] text-muted-foreground">{row.label}</p>
                          <div className="text-xs font-semibold mt-0.5 break-words">{row.value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {scan.resolved && !scan.resolved.found && (
                    <p className="mt-2 text-xs text-muted-foreground">{scan.resolved.subtitle}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <ScanModal
        open={scanModalOpen}
        onOpenChange={setScanModalOpen}
        onScan={handleScan}
        title="Scan QR/Barcode"
        description="Arahkan kamera ke QR code atau barcode"
      />
    </div>
  )
}