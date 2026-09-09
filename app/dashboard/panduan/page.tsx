"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { APP_NAME } from "@/lib/constants"
import {
  BookOpenIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
  ArrowRightIcon,
  HomeIcon,
  BuildingOffice2Icon,
  ArchiveBoxIcon,
  TruckIcon,
  UsersIcon,
  BanknotesIcon,
  ClipboardDocumentCheckIcon,
  ScaleIcon,
  Cog6ToothIcon,
  LightBulbIcon,
  QuestionMarkCircleIcon,
  BookmarkSquareIcon,
  Squares2X2Icon,
  BeakerIcon,
  WrenchIcon,
  CheckCircleIcon,
  StarIcon,
} from "@heroicons/react/24/outline"

const APP_VERSION = "0.1.0"

interface SectionLink {
  id: string
  label: string
}

const SECTION_LINKS: SectionLink[] = [
  { id: "mengenal-aplikasi", label: "Mengenal Aplikasi" },
  { id: "komponen-antarmuka", label: "Komponen Antarmuka Utama" },
  { id: "master-data", label: "Master Data" },
  { id: "job-order", label: "Sales Order / Job Order" },
  { id: "produksi", label: "Produksi" },
  { id: "quality-control", label: "Quality Control (QC)" },
  { id: "inventory", label: "Inventory / Stok" },
  { id: "transfer", label: "Transfer & Warehouse" },
  { id: "karyawan-payroll", label: "Karyawan & Payroll" },
  { id: "finance", label: "Finance" },
  { id: "alur-end-to-end", label: "Alur Proses Bisnis End-to-End" },
  { id: "studi-kasus", label: "Studi Kasus / Latihan" },
  { id: "faq", label: "FAQ / Troubleshooting" },
  { id: "glossary", label: "Glossary" },
]

interface RoleInfo {
  role: string
  description: string
}

const ROLES: RoleInfo[] = [
  { role: "SUPERADMIN / ADMIN", description: "Akses penuh ke seluruh modul: Produksi, Stok, Transfer, Karyawan, Keuangan, Aset, Pengaturan. Bertanggung jawab atas pengelolaan sistem dan data master." },
  { role: "QC (Quality Control)", description: "Memvalidasi kualitas barang (Good/Reject) pada setiap scan produksi. Melihat laporan progres QC dan deviasi kualitas." },
  { role: "GUDANG", description: "Operator gudang yang melakukan scan QR barang masuk/keluar, mengelola stok, dan verifikasi transfer barang." },
  { role: "KARYAWAN", description: "Karyawan produksi yang melihat pekerjaan/job order, melaporkan progres, dan melihat slip gaji serta grafik pendapatan." },
]

interface NumberedCallout {
  number: string
  label: string
}

const UI_CALLOUTS: NumberedCallout[] = [
  { number: "1", label: "Title Bar — Menampilkan aplikasi ERP Konveksi di samping logo & brand." },
  { number: "2", label: "Sidebar Menu — Daftar menu modul sesuai role Anda (Produksi, Stok, Karyawan, dll)." },
  { number: "3", label: "Search Bar — Mencari data cepat (hanya untuk Admin)." },
  { number: "4", label: "Notifikasi — Pusat notifikasi role-specific dengan badge jumlah belum dibaca." },
  { number: "5", label: "Theme Toggle — Mengganti mode terang/gelap pada antarmuka." },
  { number: "6", label: "Breadcrumb — Menunjukkan lokasi halaman saat ini." },
  { number: "7", label: "Konten Utama — Area tempat data, tabel, dan form ditampilkan." },
  { number: "8", label: "Profil & Logout — Foto profil, role badge, dan tombol keluar." },
]

const STEP_STYLE = {
  step: "flex items-start gap-3",
  number: "flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand-primary text-[11px] font-bold text-primary-foreground",
  text: "text-sm text-foreground/80 leading-relaxed pt-0.5",
}

function StepList({ steps }: { steps: string[] }) {
  /* Legacy mockup removed; screenshots now use ScreenshotFrame. */
  return (
    <ol className="space-y-3">
      {steps.map((step, i) => (
        <li key={i} className={STEP_STYLE.step}>
          <span className={STEP_STYLE.number}>{i + 1}</span>
          <span className={STEP_STYLE.text}>{step}</span>
        </li>
      ))}
    </ol>
  )
}

function TipBox({ title = "Catatan / Trik", children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 sm:p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
      <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
        <LightBulbIcon className="h-4 w-4" />
        <span className="text-sm">{title}</span>
      </div>
      <div className="mt-2 text-sm text-amber-900/80 dark:text-amber-100/80">{children}</div>
    </div>
  )
}

type ScreenshotVariant =
  | "dashboard"
  | "job-order"
  | "produksi"
  | "qc"
  | "inventory"
  | "transfer"
  | "employees"
  | "finance"

const SCREENSHOT_DATA: Record<ScreenshotVariant, {
  title: string
  breadcrumb: string
  menu: string
  metrics: [string, string, string][]
  tabs: string[]
  rows: [string, string, string][]
}> = {
  dashboard: {
    title: "Dashboard Utama",
    breadcrumb: "Overview / Dashboard",
    menu: "Overview",
    metrics: [["Job Order Aktif", "24", "+12%"], ["Produksi Hari Ini", "1.248 pcs", "+8%"], ["Stok Menipis", "6 item", "Perlu cek"]],
    tabs: ["Ringkasan", "Aktivitas Terbaru"],
    rows: [["Produksi hari ini", "1.248 pcs", "Berjalan"], ["Job Order #JO-2026-041", "500 pcs", "Dalam proses"], ["QC menunggu review", "18 pcs", "Perlu aksi"]],
  },
  "job-order": {
    title: "Daftar Job Order",
    breadcrumb: "Produksi / Job Order",
    menu: "Job Order",
    metrics: [["Total Job Order", "86", "Bulan ini"], ["Dalam Proses", "24", "Aktif"], ["Selesai", "62", "+18%"]],
    tabs: ["Semua Order", "Draft", "Dalam Proses", "Selesai"],
    rows: [["JO-2026-041", "Seragam Kantor", "500 pcs"], ["JO-2026-040", "Kaos Polo Navy", "250 pcs"], ["JO-2026-039", "Jaket Komunitas", "120 pcs"]],
  },
  produksi: {
    title: "Dashboard Produksi",
    breadcrumb: "Produksi / Overview",
    menu: "Produksi",
    metrics: [["Target Hari Ini", "1.500 pcs", "Target"], ["Sudah Diproduksi", "1.248 pcs", "83%"], ["Menunggu QC", "18 pcs", "Review"]],
    tabs: ["Overview", "Assignment", "Scan Produksi"],
    rows: [["Cutting", "JO-2026-041", "450 / 500 pcs"], ["Sewing", "JO-2026-040", "180 / 250 pcs"], ["Finishing", "JO-2026-039", "120 / 120 pcs"]],
  },
  qc: {
    title: "QC Reports",
    breadcrumb: "Produksi / QC Reports",
    menu: "QC Progress",
    metrics: [["Menunggu QC", "18 pcs", "Perlu review"], ["Good", "1.186 pcs", "95,0%"], ["Reject", "62 pcs", "5,0%"]],
    tabs: ["Overview", "QC Report", "Riwayat Pemeriksaan"],
    rows: [["JO-2026-041", "Seragam Kantor", "Menunggu QC"], ["JO-2026-040", "Kaos Polo Navy", "Good"], ["JO-2026-039", "Jaket Komunitas", "Reject: 2 pcs"]],
  },
  inventory: {
    title: "Overview Stok",
    breadcrumb: "Stok / Overview",
    menu: "Stok",
    metrics: [["Total SKU", "248", "Terdaftar"], ["Stok Aman", "212", "85,5%"], ["Stok Menipis", "6", "Perlu restock"]],
    tabs: ["Overview", "Bahan Baku", "Barang Jadi", "Reject"],
    rows: [["Kain Cotton Combed 24s", "1.250 meter", "Aman"], ["Kancing 15 mm", "320 pcs", "Menipis"], ["Kaos Polo Navy", "480 pcs", "Aman"]],
  },
  transfer: {
    title: "Barang Masuk / Keluar",
    breadcrumb: "Gudang / Barang Masuk & Keluar",
    menu: "Barang Masuk",
    metrics: [["Barang Masuk", "42", "Bulan ini"], ["Barang Keluar", "38", "Bulan ini"], ["Menunggu Verifikasi", "3", "Perlu aksi"]],
    tabs: ["Barang Masuk", "Barang Keluar", "Transfer"],
    rows: [["TRF-2026-018", "Gudang Utama → Produksi", "Diproses"], ["TRF-2026-017", "Produksi → Gudang Jadi", "Selesai"], ["TRF-2026-016", "Supplier → Gudang Utama", "Menunggu scan"]],
  },
  employees: {
    title: "Daftar Karyawan",
    breadcrumb: "Karyawan / Daftar Karyawan",
    menu: "Karyawan",
    metrics: [["Total Karyawan", "48", "Terdaftar"], ["Aktif", "45", "93,7%"], ["Tim Produksi", "8", "Tim"]],
    tabs: ["Daftar Karyawan", "Tim Produksi", "Penggajian"],
    rows: [["Andi Pratama", "Operator Produksi", "Aktif"], ["Siti Rahma", "QC", "Aktif"], ["Budi Santoso", "Gudang", "Cuti"]],
  },
  finance: {
    title: "Dashboard Finance",
    breadcrumb: "Finance / Overview",
    menu: "Finance",
    metrics: [["Pemasukan", "Rp 86,4 jt", "+14,2%"], ["Pengeluaran", "Rp 51,8 jt", "Bulan ini"], ["Saldo Bersih", "Rp 34,6 jt", "Berjalan"]],
    tabs: ["Overview", "Transaksi", "Laporan", "Dashboard HPP"],
    rows: [["Invoice #INV-041", "Pemasukan", "Rp 18.500.000"], ["Pembelian bahan baku", "Pengeluaran", "Rp 7.250.000"], ["Upah produksi minggu 2", "Pengeluaran", "Rp 5.800.000"]],
  },
}

function ScreenshotFrame({
  src,
  title,
  callouts,
}: {
  src: string
  title: string
  callouts?: NumberedCallout[]
}) {
  return (
    <figure className="m-0 w-full space-y-2">
      <div className="relative max-h-[720px] w-full overflow-auto rounded-xl border border-border bg-muted/20 shadow-sm">
        <img
          src={src}
          alt={`Screenshot asli halaman ${title}`}
          style={{ width: "100%", height: "auto", display: "block" }}
        />
        {callouts?.map((callout) => (
          <span key={callout.number} className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-primary text-[11px] font-bold text-primary-foreground shadow">
            {callout.number}
          </span>
        ))}
      </div>
      <figcaption className="text-xs text-muted-foreground">
        Screenshot asli halaman {title} yang diambil dari UI aplikasi pada saat dokumentasi dibuat.
      </figcaption>
      {callouts && (
        <ul className="space-y-1">
          {callouts.map((callout) => (
            <li key={callout.number} className="flex gap-2 text-xs text-muted-foreground">
              <span className="flex h-4 w-4 flex-none items-center justify-center rounded-full bg-brand-primary/10 text-[10px] font-bold text-brand-primary">{callout.number}</span>
              <span>{callout.label}</span>
            </li>
          ))}
        </ul>
      )}
    </figure>
  )
}

function AppScreenshot({ variant, callouts }: { variant: ScreenshotVariant; callouts?: NumberedCallout[] }) {
  const data = SCREENSHOT_DATA[variant]
  const screenshotName = variant === "employees" ? "karyawan" : variant === "dashboard" ? "dashboard-utama" : variant

  return <ScreenshotFrame src={`/screenshots/${screenshotName}.png`} title={data.title} callouts={callouts} />

  /*
  return (
    <div className="space-y-2">
  return <ScreenshotFrame src="/screenshots/master-data.png" title="Settings → User & Role" />
            <div className="space-y-1 text-[9px] sm:text-[10px]">
              {['Overview', 'Job Order', 'Produksi', 'QC Progress', 'Stok', 'Karyawan', 'Finance'].map((item) => <div key={item} className={cn("rounded-md px-2 py-1.5", item === data.menu ? "bg-indigo-500/20 font-semibold text-indigo-200" : "text-slate-400")}>{item}</div>)}
            </div>
          </aside>
          <div className="bg-white p-3 sm:p-5 dark:bg-slate-900">
            <div className="mb-3 flex items-start justify-between gap-2"><div><div className="text-[9px] text-slate-400 sm:text-[10px]">{data.breadcrumb}</div><div className="mt-1 text-sm font-bold text-slate-800 sm:text-base dark:text-slate-100">{data.title}</div></div><div className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-[9px] font-semibold text-white sm:text-[10px]">+ Tambah Baru</div></div>
            <div className="mb-3 grid grid-cols-3 gap-2">{data.metrics.map(([label, value, note]) => <div key={label} className="rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800"><div className="text-[8px] text-slate-400">{label}</div><div className="mt-1 text-[11px] font-bold text-slate-800 sm:text-xs dark:text-white">{value}</div><div className="text-[8px] text-emerald-600">{note}</div></div>)}</div>
            <div className="mb-2 flex gap-1 overflow-hidden border-b border-slate-200 text-[9px] sm:text-[10px] dark:border-slate-700">{data.tabs.map((tab, index) => <div key={tab} className={cn("whitespace-nowrap px-2 pb-2", index === 0 ? "border-b-2 border-indigo-500 font-semibold text-indigo-600" : "text-slate-400")}>{tab}</div>)}</div>
            <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-700"><div className="grid grid-cols-[1.4fr_1fr_0.8fr] gap-2 bg-slate-50 px-2 py-2 text-[8px] font-bold uppercase tracking-wide text-slate-400 sm:px-3 sm:text-[9px]"><span>Item / Keterangan</span><span>Detail</span><span>Status</span></div>{data.rows.map(([item, detail, status]) => <div key={item} className="grid grid-cols-[1.4fr_1fr_0.8fr] items-center gap-2 border-t border-slate-100 px-2 py-2 text-[9px] text-slate-600 sm:px-3 sm:text-[10px] dark:border-slate-800 dark:text-slate-300"><span className="truncate font-semibold">{item}</span><span className="truncate text-slate-400">{detail}</span><span className="truncate rounded px-1.5 py-0.5 text-[8px] font-semibold text-indigo-600">{status}</span></div>)}</div>
          </div>
        </div>
        {callouts?.map((callout) => <span key={callout.number} className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-primary text-[11px] font-bold text-primary-foreground shadow">{callout.number}</span>)}
      </div>
      <p className="text-xs text-muted-foreground">Ilustrasi halaman {data.title}. Menu aktif, ringkasan metrik, tab, dan tabel menunjukkan area utama yang perlu diperhatikan.</p>
      {callouts && <ul className="space-y-1">{callouts.map((callout) => <li key={callout.number} className="flex gap-2 text-xs text-muted-foreground"><span className="flex h-4 w-4 flex-none items-center justify-center rounded-full bg-brand-primary/10 text-[10px] font-bold text-brand-primary">{callout.number}</span><span>{callout.label}</span></li>)}</ul>}
    </div>
  )
}
  */
}

function MasterDataScreenshot() {
  return <ScreenshotFrame src="/screenshots/master-data.png" title="Settings → Data Master" />

  /*
  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border border-border bg-muted/20 shadow-sm">
        <img src="/screenshots/master-data.png" alt="Screenshot asli halaman User dan Role" className="block max-h-[620px] w-full object-contain object-top" />
      </div>
      <p className="text-xs text-muted-foreground">Screenshot asli halaman Settings → User & Role yang diambil dari UI aplikasi.</p>
    </div>
  )

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-700 dark:bg-slate-950">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <div className="ml-2 flex h-6 flex-1 items-center rounded-md bg-slate-100 px-3 text-[10px] text-slate-400 dark:bg-slate-800">
            app.konveksi.local/dashboard/settings/users
          </div>
        </div>
        <div className="grid min-h-[260px] grid-cols-[118px_1fr] sm:grid-cols-[156px_1fr]">
          <aside className="bg-slate-900 px-2 py-3 text-slate-300 sm:px-3">
            <div className="mb-5 flex items-center gap-2 px-1 text-[10px] font-bold tracking-wide text-white sm:text-xs">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500">K</span>
              KONVEKSI
            </div>
            <div className="space-y-1 text-[9px] sm:text-[10px]">
              {['Overview', 'Job Order', 'Produksi', 'Inventory'].map((item) => (
                <div key={item} className="rounded-md px-2 py-1.5 text-slate-400">{item}</div>
              ))}
              <div className="rounded-md bg-indigo-500/20 px-2 py-1.5 font-semibold text-indigo-200">Settings</div>
              <div className="ml-2 border-l border-slate-700 pl-2 text-indigo-300">User & Role</div>
              <div className="ml-2 border-l border-slate-700 pl-2 text-slate-500">Data Master</div>
            </div>
          </aside>
          <div className="bg-white p-3 sm:p-5 dark:bg-slate-900">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <div className="text-[9px] text-slate-400 sm:text-[10px]">Settings / User & Role</div>
                <div className="mt-1 text-sm font-bold text-slate-800 sm:text-base dark:text-slate-100">User & Role</div>
              </div>
              <div className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-[9px] font-semibold text-white sm:text-[10px]">+ Tambah User</div>
            </div>
            <div className="mb-3 flex gap-1 border-b border-slate-200 text-[9px] sm:text-[10px] dark:border-slate-700">
              <div className="border-b-2 border-indigo-500 px-2 pb-2 font-semibold text-indigo-600">User & Role</div>
              <div className="px-2 pb-2 text-slate-400">Data Master</div>
              <div className="px-2 pb-2 text-slate-400">Pengaturan</div>
            </div>
            <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-[1.5fr_1fr_0.8fr_0.6fr] gap-2 bg-slate-50 px-2 py-2 text-[8px] font-bold uppercase tracking-wide text-slate-400 sm:px-3 sm:text-[9px] dark:bg-slate-800">
                <span>Nama / Email</span><span>Role</span><span>Status</span><span>Aksi</span>
              </div>
              {[
                ['Admin Utama', 'ADMIN', 'Aktif'],
                ['Rina QC', 'QC', 'Aktif'],
                ['Budi Gudang', 'GUDANG', 'Nonaktif'],
              ].map(([name, role, status]) => (
                <div key={name} className="grid grid-cols-[1.5fr_1fr_0.8fr_0.6fr] items-center gap-2 border-t border-slate-100 px-2 py-2 text-[9px] text-slate-600 sm:px-3 sm:text-[10px] dark:border-slate-800 dark:text-slate-300">
                  <div><div className="font-semibold">{name}</div><div className="text-[8px] text-slate-400">{name.toLowerCase().replace(' ', '.')}@mail.com</div></div>
                  <span className="w-fit rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-semibold text-slate-500 dark:bg-slate-800">{role}</span>
                  <span className={cn("w-fit rounded px-1.5 py-0.5 text-[8px] font-semibold", status === "Aktif" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400")}>{status}</span>
                  <span className="text-indigo-500">•••</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Ilustrasi halaman Settings → User & Role. Gunakan tab di bagian atas untuk berpindah antara user, data master, dan pengaturan umum.</p>
    </div>
  )
  */
}

function SectionTitle({ id, icon: Icon, title, description }: { id: string; icon: React.ElementType; title: string; description?: string }) {
  return (
    <div
      id={id}
      className="mb-5 flex items-start gap-3 scroll-mt-24"
    >
      <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground leading-snug">{description}</p>}
      </div>
    </div>
  )
}

function FlowNode({ label, icon: Icon }: { label: string; icon: React.ElementType }) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md">
        <Icon className="h-5 w-5" />
      </div>
      <span className="max-w-[90px] text-[10px] font-medium leading-tight text-muted-foreground">{label}</span>
    </div>
  )
}

function FlowConnector() {
  return <ArrowRightIcon className="h-4 w-4 flex-none self-center text-muted-foreground/50" />
}

function RoleBadge({ role }: { role: string }) {
  return (
    <Badge variant="outline" className="font-mono text-[10px]">
      {role}
    </Badge>
  )
}

function PageHeader({ title, version }: { title: string; version: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 p-6 sm:p-8 text-white shadow-lg">
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-8 -right-4 h-32 w-32 rounded-full bg-white/10 blur-xl" />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <BookOpenIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Panduan Penggunaan {title}</h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-white/85">
              <span>Versi {version}</span>
              <span className="text-white/40">•</span>
              <span>Terintegrasi di dalam aplikasi</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PanduanPage() {
  const [search, setSearch] = useState("")
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    )
    for (const s of SECTION_LINKS) {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])

  return (
    <div className="page-container p-3 md:p-6 pt-4 print:p-0">
      <PageHeader title={APP_NAME} version={APP_VERSION} />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        {/* Left sidebar nav (only on lg+, toggleable on mobile) */}
        <aside className="print:hidden">
          <div className="lg:sticky lg:top-24 space-y-4">
            <Button
              variant="outline"
              className="w-full justify-between lg:hidden"
              onClick={() => setSidebarOpen((o) => !o)}
            >
              <span>Daftar Isi</span>
              <ChevronRightIcon className={cn("h-4 w-4 transition-transform", sidebarOpen && "rotate-90")} />
            </Button>

            <div
              className={cn(
                "overflow-hidden rounded-xl border bg-card/50 p-2 transition-all lg:block",
                sidebarOpen ? "block" : "hidden"
              )}
            >
              <div className="px-2 pb-2">
                <div className="relative">
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Cari panduan..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 text-xs"
                  />
                </div>
              </div>
              <nav className="space-y-0.5 max-h-[60vh] overflow-y-auto pr-1">
                {SECTION_LINKS.filter((s) =>
                  s.label.toLowerCase().includes(search.toLowerCase())
                ).map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "block rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                      activeSection === section.id
                        ? "bg-brand-primary/10 text-brand-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    {section.label}
                  </a>
                ))}
              </nav>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="min-w-0 print:!block">
          <div className="space-y-8">
            {/* Mengenal Aplikasi */}
            <Card className="shadow-sm">
              <CardContent className="pt-5 space-y-8">
                <div>
                  <SectionTitle
                    id="mengenal-aplikasi"
                    icon={Squares2X2Icon}
                    title="Mengenal Aplikasi"
                    description="Gambaran umum sistem ERP Konveksi, siapa penggunanya, dan alur kerja end-to-end."
                  />

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-base font-semibold mb-2">Apa itu {APP_NAME}?</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {APP_NAME} adalah sistem manajemen ERP yang dirancang khusus untuk usaha konveksi/garment.
                        Aplikasi ini membantu mengelola seluruh proses bisnis — dari pembuatan job order (pesanan),
                        produksi, quality control, pengelolaan stok gudang, transfer barang, hingga penggajian
                        karyawan dan keuangan.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-base font-semibold mb-3">Pengguna & Role</h3>
                      <div className="space-y-2">
                        {ROLES.map((r) => (
                          <div
                            key={r.role}
                            className="flex items-start gap-3 rounded-lg border border-border/50 p-3 hover:bg-accent/30 transition-colors"
                          >
                            <RoleBadge role={r.role.split(" / ")[0]} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{r.role}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{r.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-semibold mb-3">Alur Kerja End-to-End</h3>
                      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-muted/20 p-4">
                        <FlowNode icon={BuildingOffice2Icon} label="Job Order" />
                        <FlowConnector />
                        <FlowNode icon={WrenchIcon} label="Produksi" />
                        <FlowConnector />
                        <FlowNode icon={ClipboardDocumentCheckIcon} label="QC" />
                        <FlowConnector />
                        <FlowNode icon={ArchiveBoxIcon} label="Stok Gudang" />
                        <FlowConnector />
                        <FlowNode icon={TruckIcon} label="Transfer" />
                        <FlowConnector />
                        <FlowNode icon={BanknotesIcon} label="Finance / Invoice" />
                      </div>
                    </div>
                  </div>
                </div>
                <AppScreenshot variant="dashboard" callouts={UI_CALLOUTS} />
              </CardContent>
            </Card>

            {/* Komponen Antarmuka */}
            <Card className="shadow-sm">
              <CardContent className="pt-5 space-y-4">
                <SectionTitle
                  id="komponen-antarmuka"
                  icon={HomeIcon}
                  title="Komponen Antarmuka Utama"
                  description="Mengenal elemen-elemen penting pada antarmuka aplikasi."
                />
                <AppScreenshot variant="dashboard" callouts={UI_CALLOUTS} />
              </CardContent>
            </Card>

            {/* Master Data */}
            <Card className="shadow-sm">
              <CardContent className="pt-5 space-y-4">
                <SectionTitle
                  id="master-data"
                  icon={Cog6ToothIcon}
                  title="Master Data"
                  description="Mengelola data dasar: User & Role, Data Master, dan pengaturan umum."
                />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Menu <span className="font-semibold text-foreground">Settings</span> di sidebar
                  (akses Admin) berisi tiga sub-bagian utama untuk mengelola data master sistem.
                </p>

                <MasterDataScreenshot />

                <div>
                  <h3 className="text-sm font-semibold mb-3">Cara Mengelola User & Role</h3>
                  <StepList
                    steps={[
                      "Buka menu Settings → pilih sub-menu User & Role.",
                      "Klik tombol Tambah/Simpan untuk menambah user baru atau mengedit user yang ada.",
                      "Isi email, password (untuk user baru), dan pilih role: ADMIN, QC, GUDANG, atau KARYAWAN.",
                      "Toggle status Aktif/NONAKTIF untuk mengaktifkan atau menonaktifkan akses user.",
                      "Klik Simpan untuk menyimpan perubahan.",
                    ]}
                  />
                </div>

                <TipBox>
                  Role <span className="font-semibold">SUPERADMIN</span> hanya untuk akun sistem
                  (default: <span className="font-mono">erpkonveksi@gmail.com</span>) dan tidak dapat
                  diubah lewat UI. Role ini memiliki akses penuh ke seluruh menu aplikasi.
                </TipBox>
              </CardContent>
            </Card>

            {/* Job Order / Sales Order */}
            <Card className="shadow-sm">
              <CardContent className="pt-5 space-y-4">
                <SectionTitle
                  id="job-order"
                  icon={BuildingOffice2Icon}
                  title="Sales Order / Job Order"
                  description="Membuat dan mengelola pesanan produksi (job order)."
                />
                <AppScreenshot variant="job-order" />

                <div>
                  <h3 className="text-sm font-semibold mb-3">Cara Membuat Job Order Baru</h3>
                  <StepList
                    steps={[
                      "Buka menu Produksi → Job Order, lalu klik tombol 'Job Order Baru' (atau menu → Buat JO Baru).",
                      "Isi informasi pesanan: nama/nomor JO, produk, jumlah qty, dan tanggal target produksi.",
                      "Pilih tim produksi / assignment karyawan yang akan mengerjakan JO tersebut.",
                      "Isi detail biaya dan estimasi HPP jika tersedia untuk perhitungan harga pokok.",
                      "Periksa ringkasan lalu klik Simpan / Submit untuk membuat Job Order.",
                      "Job Order akan muncul di daftar dengan status awal 'Draft' atau 'Dalam Proses'.",
                    ]}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-3">Melacak Status Job Order</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    Status job order berubah otomatis mengikuti alur produksi:
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {["Draft", "Diproses", "Cutting", "Produksi", "QC", "Selesai", "Terkirim"].map((s, i) => (
                      <div key={s} className="flex items-center gap-2">
                        <Badge className="bg-warning-light text-warning-foreground">{s}</Badge>
                        {i < 6 && <ArrowRightIcon className="h-3 w-3 text-muted-foreground/50" />}
                      </div>
                    ))}
                  </div>
                </div>

                <TipBox>
                  Job Order terhubung lintas modul: saat QC menyetujui hasil produksi, stok barang
                  jadi otomatis bertambah dan status order berubah. Ini menghindari data ganda
                  dan menjaga konsistensi antar departemen.
                </TipBox>
              </CardContent>
            </Card>

            {/* Produksi */}
            <Card className="shadow-sm">
              <CardContent className="pt-5 space-y-4">
                <SectionTitle
                  id="produksi"
                  icon={WrenchIcon}
                  title="Produksi"
                  description="Mengelola proses produksi, assignment tim, dan progres pekerjaan."
                />
                <AppScreenshot variant="produksi" />

                <div>
                  <h3 className="text-sm font-semibold mb-3">Alur Produksi & Assignment</h3>
                  <StepList
                    steps={[
                      "Admin membuat Job Order dan menentukan tim produksi yang akan mengerjakan.",
                      "Karyawan melihat pekerjaan yang ditugaskan di dashboard Produksi (Karyawan).",
                      "Karyawan memperbarui progres status sesuai tahapan (Cutting → Sewing → Finishing).",
                      "Saat barang selesai, karyawan mengajukan request Quality Control (QC).",
                      "Barang menunggu pengecekan QC sebelum dianggap selesai.",
                    ]}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-3">Update Status Produksi</h3>
                  <StepList
                    steps={[
                      "Buka halaman Produksi di dashboard Anda.",
                      "Pilih Job Order yang sedang dikerjakan.",
                      "Klik tombol update/change status sesuai tahapan terbaru.",
                      "Simpan perubahan — status akan otomatis tercatat dengan waktu dan user.",
                    ]}
                  />
                </div>

                <TipBox>
                  Gunakan sistem <span className="font-semibold">scan QR (1 scan = 1 pcs)</span> untuk
                  mencatat jumlah produksi per operator. Data ini otomatis dipakai untuk menghitung
                  gaji per pcs dan memantau pencapaian target produksi.
                </TipBox>
              </CardContent>
            </Card>

            {/* Quality Control */}
            <Card className="shadow-sm">
              <CardContent className="pt-5 space-y-4">
                <SectionTitle
                  id="quality-control"
                  icon={ClipboardDocumentCheckIcon}
                  title="Quality Control (QC)"
                  description="Validasi kualitas barang yang diproduksi sebelum masuk gudang."
                />
                <AppScreenshot variant="qc" />

                <div>
                  <h3 className="text-sm font-semibold mb-3">Cara Validasi QC (Approve/Reject)</h3>
                  <StepList
                    steps={[
                      "Buka menu QC Progress → Overview untuk melihat daftar produksi yang menunggu QC.",
                      "Pilih item/lot produksi yang akan dicek.",
                      "Periksa fisik barang vs standar kualitas yang ditentukan.",
                      "Set status: GOOD (layak) atau REJECT (tidak layak), lengkapi catatan/alasan reject.",
                      "Klik Approve untuk meloloskan — sistem otomatis menambah stok barang jadi.",
                    ]}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-3">Membuat QC Report</h3>
                  <StepList
                    steps={[
                      "Buka QC Report pada menu QC.",
                      "Pilih produk/produksi yang diperiksa.",
                      "Isi jumlah good dan reject beserta catatan kualitas.",
                      "Simpan laporan — akan terekam untuk admin review di QC Reports.",
                    ]}
                  />
                </div>

                <TipBox>
                  Hanya role <span className="font-semibold">QC</span> yang boleh menilai GOOD/REJECT.
                  Meski operator gudang bisa scan QR, status kualitas final hanya ditentukan oleh QC.
                </TipBox>
              </CardContent>
            </Card>

            {/* Inventory / Stok */}
            <Card className="shadow-sm">
              <CardContent className="pt-5 space-y-4">
                <SectionTitle
                  id="inventory"
                  icon={ArchiveBoxIcon}
                  title="Inventory / Stok"
                  description="Mengelola stok bahan baku, barang jadi, dan barang reject."
                />
                <AppScreenshot variant="inventory" />

                <div>
                  <h3 className="text-sm font-semibold mb-3">Sub-Menu Stok</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-3"><span className="font-semibold text-foreground">Overview</span> — Ringkasan seluruh stok.</li>
                    <li className="flex gap-3"><span className="font-semibold text-foreground">Bahan Baku (Admin)</span> — Stok bahan mentah seperti kain, kancing, resleting.</li>
                    <li className="flex gap-3"><span className="font-semibold text-foreground">Barang Jadi</span> — Produk jadi siap kirim (Admin & Gudang).</li>
                    <li className="flex gap-3"><span className="font-semibold text-foreground">Reject (Admin)</span> — Barang yang gagal QC.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-3">Cara Mengecek Stok</h3>
                  <StepList
                    steps={[
                      "Buka menu Stok di sidebar.",
                      "Pilih jenis stok yang ingin dilihat (Overview / Bahan Baku / Barang Jadi / Reject).",
                      "Gunakan kotak pencarian atau filter untuk menemukan produk tertentu.",
                      "Lihat kolom jumlah stok, satuan, dan status ketersediaan (termasuk peringatan stok menipis).",
                    ]}
                  />
                </div>

                <TipBox>
                  Aplikasi menampilkan peringatan saat stok mencapai ambang batas minimum (LOW_STOCK).
                  Saldo stok diperbarui otomatis saat ada transfer barang masuk/keluar yang disetujui.
                </TipBox>
              </CardContent>
            </Card>

            {/* Transfer & Warehouse */}
            <Card className="shadow-sm">
              <CardContent className="pt-5 space-y-4">
                <SectionTitle
                  id="transfer"
                  icon={TruckIcon}
                  title="Transfer & Warehouse"
                  description="Memindahkan barang antar gudang dengan validasi scan QR."
                />
                <AppScreenshot variant="transfer" />

                <div>
                  <h3 className="text-sm font-semibold mb-3">Alur Transfer dengan Scan QR (1 Scan = 1 Pcs)</h3>
                  <StepList
                    steps={[
                      "Buka menu Barang Masuk atau Barang Keluar (Gudang) / Transfer (Admin).",
                      "Klik buat transfer baru dan tentukan gudang asal & tujuan.",
                      "Scan QR code produk — sistem otomatis mengisi kode produk dan qty = 1 pcs.",
                      "Scan berulang sampai mencapai target jumlah yang diinginkan.",
                      "Progress tampil real-time (mis. 67/100 pcs).",
                      "Klik Submit untuk menyelesaikan transfer.",
                    ]}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-3">Verifikasi Transfer via Scan</h3>
                  <StepList
                    steps={[
                      "Dari sidebar (role Gudang), klik tombol hijau 'Scan QR'.",
                      "Arahkan kamera ke QR code dokumen transfer.",
                      "Sistem menampilkan detail transfer (nomor, produk, qty, gudang tujuan, status).",
                      "Pilih Terima untuk menyetujui atau Cancel untuk membatalkan.",
                    ]}
                  />
                </div>

                <TipBox>
                  Konsep <span className="font-semibold">1 scan = 1 pcs</span> memberikan validasi paling
                  akurat — setiap pcs tercatat dengan operator ID dan waktu, memudahkan audit dan
                  menghitung deviasi vs target produksi.
                </TipBox>
              </CardContent>
            </Card>

            {/* Karyawan & Payroll */}
            <Card className="shadow-sm">
              <CardContent className="pt-5 space-y-4">
                <SectionTitle
                  id="karyawan-payroll"
                  icon={UsersIcon}
                  title="Karyawan & Payroll"
                  description="Mengelola data karyawan, tim produksi, dan penggajian."
                />
                <AppScreenshot variant="employees" />

                <div>
                  <h3 className="text-sm font-semibold mb-3">Sub-Menu Karyawan (Admin)</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-3"><span className="font-semibold text-foreground">Daftar Karyawan</span> — Kelola data & role karyawan.</li>
                    <li className="flex gap-3"><span className="font-semibold text-foreground">Tim Produksi</span> — Susun tim/kelompok produksi.</li>
                    <li className="flex gap-3"><span className="font-semibold text-foreground">Penggajian</span> — Hitung & kelola gaji (per periode).</li>
                    <li className="flex gap-3"><span className="font-semibold text-foreground">Klaim Gaji</span> — Kelola klaim/tambahan gaji.</li>
                    <li className="flex gap-3"><span className="font-semibold text-foreground">Kasbon</span> — Kelola kasbon/pinjaman karyawan.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-3">Cara Menghitung Gaji (per Pcs)</h3>
                  <StepList
                    steps={[
                      "Sistem mengumpulkan seluruh scan events produksi per karyawan per periode.",
                      "Gaji dihitung: Total jumlah pcs × rate per pcs (sesuai konfigurasi).",
                      "Kualitas (rasio good/reject) dapat memengaruhi hasil atau penilaian.",
                      "Admin mereview dan mengesahkan penggajian di menu Penggajian.",
                      "Karyawan melihat slip & grafik gaji di dashboard-nya (menu Gaji & Chart Gaji).",
                    ]}
                  />
                </div>

                <TipBox>
                  Sistem penggajian per pcs memastikan karyawan dibayar sesuai produktivitas nyata —
                  dihitung dari data scan asli, bukan estimasi manual. Ini menjaga transparansi dan
                  akurasi.
                </TipBox>
              </CardContent>
            </Card>

            {/* Finance */}
            <Card className="shadow-sm">
              <CardContent className="pt-5 space-y-4">
                <SectionTitle
                  id="finance"
                  icon={BanknotesIcon}
                  title="Finance"
                  description="Mengelola transaksi keuangan, laporan, dan analisis HPP."
                />
                <AppScreenshot variant="finance" />

                <div>
                  <h3 className="text-sm font-semibold mb-3">Sub-Menu Finance (Admin)</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-3"><span className="font-semibold text-foreground">Overview</span> — Ringkasan keuangan & transaksi terbaru.</li>
                    <li className="flex gap-3"><span className="font-semibold text-foreground">Transaksi</span> — Catat pemasukan (INCOME) & pengeluaran (EXPENSE).</li>
                    <li className="flex gap-3"><span className="font-semibold text-foreground">Laporan</span> — Laporan keuangan periodik.</li>
                    <li className="flex gap-3"><span className="font-semibold text-foreground">Dashboard HPP</span> — Analisis harga pokok produksi per kategori biaya.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-3">Cara Mencatat Transaksi</h3>
                  <StepList
                    steps={[
                      "Buka menu Finance → Transaksi.",
                      "Klik tombol tambah transaksi baru.",
                      "Pilih tipe: INCOME (pemasukan) atau EXPENSE (pengeluaran).",
                      "Pilih kategori biaya (mis. Bahan Baku, Upah Jahit, Marketing) dan isi nominal.",
                      "Lengkapi keterangan, lalu Simpan.",
                    ]}
                  />
                </div>

                <TipBox>
                  Kategori biaya dibedakan menjadi <span className="font-semibold">Direct</span>
                  (langsung ke HPP seperti BBL, ACC, TKL) dan <span className="font-semibold">Indirect</span>
                  (tidak langsung seperti GTL, Sewa, Listrik) — penting untuk perhitungan HPP yang akurat.
                </TipBox>
              </CardContent>
            </Card>

            {/* End-to-End */}
            <Card className="shadow-sm">
              <CardContent className="pt-5 space-y-4">
                <SectionTitle
                  id="alur-end-to-end"
                  icon={ScaleIcon}
                  title="Alur Proses Bisnis End-to-End"
                  description="Perjalanan satu Sales Order dari input sampai barang terkirim & invoice lunas."
                />

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-muted/20 p-4">
                    <FlowNode icon={BuildingOffice2Icon} label="1. Buat JO" />
                    <FlowConnector />
                    <FlowNode icon={WrenchIcon} label="2. Produksi" />
                    <FlowConnector />
                    <FlowNode icon={ClipboardDocumentCheckIcon} label="3. QC Approve" />
                    <FlowConnector />
                    <FlowNode icon={ArchiveBoxIcon} label="4. Stok Bertambah" />
                    <FlowConnector />
                    <FlowNode icon={TruckIcon} label="5. Transfer Kirim" />
                    <FlowConnector />
                    <FlowNode icon={BanknotesIcon} label="6. Invoice & Bayar" />
                  </div>

                  <ol className="mt-4 space-y-3">
                    {[
                      "Admin membuat Job Order (pesanan) dengan detail produk, qty, dan target.",
                      "Tim produksi mengerjakan order dan update progres step-by-step.",
                      "Saat selesai, QC memvalidasi — jika approve, barang dianggap lolos.",
                      "Barang jadi ditambahkan ke stok gudang (inventory) secara otomatis.",
                      "Gudang melakukan transfer/pengiriman barang ke tujuan (barang keluar).",
                      "Finance mencatat invoice dan pembayaran; laporan keuangan diperbarui.",
                    ].map((s, i) => (
                      <li key={i} className={STEP_STYLE.step}>
                        <span className={STEP_STYLE.number}>{i + 1}</span>
                        <span className={STEP_STYLE.text}>{s}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <TipBox>
                  Semua tahap di atas saling terhubung di dalam satu sistem — tidak perlu input ulang
                  data. Saat satu modul diperbarui (mis. QC approve), modul lain (stok, status order)
                  ikut diperbarui otomatis.
                </TipBox>
              </CardContent>
            </Card>

            {/* Studi Kasus */}
            <Card className="shadow-sm">
              <CardContent className="pt-5 space-y-4">
                <SectionTitle
                  id="studi-kasus"
                  icon={BeakerIcon}
                  title="Studi Kasus / Latihan"
                  description="Skenario penggunaan nyata agar dapat langsung praktik di aplikasi."
                />

                <div className="space-y-4">
                  <CaseCard
                    title="Studi Kasus 1: Menerima Job Order Baru"
                    setup="Kondisi awal: Anda login sebagai ADMIN, belum ada job order."
                    steps={[
                      "Buat satu Job Order untuk produk 'Kaos Polos' qty 100 pcs.",
                      "Tugaskan ke tim produksi Anda.",
                      "Periksa apakah JO muncul di daftar Job Order.",
                    ]}
                    expected="Hasil yang diharapkan: Job Order tampil di daftar dengan status awal 'Draft' atau 'Dalam Proses'."
                  />
                  <CaseCard
                    title="Studi Kasus 2: Transfer Barang dengan Scan QR"
                    setup="Kondisi awal: Anda login sebagai GUDANG, ada produk di gudang asal."
                    steps={[
                      "Buat transfer barang masuk baru.",
                      "Scan QR produk beberapa kali hingga qty mencapai target.",
                      "Perhatikan progress scan bertambah real-time.",
                      "Submit transfer saat target tercapai.",
                    ]}
                    expected="Hasil yang diharapkan: Transfer tersimpan, stok gudang tujuan bertambah sesuai scan, dan semua scan tercatat per operator."
                  />
                  <CaseCard
                    title="Studi Kasus 3: Validasi QC & Lihat Gaji"
                    setup="Kondisi awal: Anda login sebagai QC, ada produksi menunggu QC."
                    steps={[
                      "Buka QC Progress → Overview.",
                      "Set status GOOD pada lot yang layak dan REJECT satu item dengan catatan.",
                      "Sebagai KARYAWAN, buka menu Gaji dan Chart Gaji untuk melihat perhitungan.",
                    ]}
                    expected="Hasil yang diharapkan: Item GOOD menambah stok barang jadi; item REJECT tercatat; karyawan melihat gaji sesuai pcs yang diproduksi."
                  />
                </div>
              </CardContent>
            </Card>

            {/* FAQ */}
            <Card className="shadow-sm">
              <CardContent className="pt-5 space-y-4">
                <SectionTitle
                  id="faq"
                  icon={QuestionMarkCircleIcon}
                  title="FAQ / Troubleshooting"
                  description="Jawaban atas pertanyaan dan masalah yang sering terjadi."
                />

                <div className="space-y-3">
                  <FaqItem
                    q="Saya tidak bisa login. Bagaimana? "
                    a="Pastikan email & password benar. Jika akun belum terdaftar sebagai karyawan, tampil pesan hubungi admin. Hubungi administrator untuk menambahkan akun Anda dengan role yang sesuai."
                  />
                  <FaqItem
                    q="Menu tertentu tidak muncul di sidebar saya. Kenapa?"
                    a="Menu ditampilkan sesuai role Anda (ADMIN, QC, GUDANG, KARYAWAN). Hubungi admin jika merasa butuh akses menu yang tidak tampil."
                  />
                  <FaqItem
                    q="Scan QR tidak terbaca. Bagaimana caranya?"
                    a="Pastikan QR code jelas dan tidak buram. Hindari hasil foto/gambar. Jika muncul pesan 'QR Code tidak terbaca', coba gunakan QR yang lebih jelas atau pencahayaan lebih baik."
                  />
                  <FaqItem
                    q="Bagaimana cara reset password?"
                    a="Saat ini belum ada fitur reset password otomatis. Silakan hubungi admin untuk mereset password akun Anda."
                  />
                  <FaqItem
                    q="Stok tidak bertambah setelah QC approve. Kenapa?"
                    a="Pastikan QC benar-benar men-set status GOOD dan menyimpan. Status approve otomatis menambah stok barang jadi. Jika masih bermasalah, refresh halaman atau hubungi admin."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Glossary */}
            <Card className="shadow-sm">
              <CardContent className="pt-5 space-y-4">
                <SectionTitle
                  id="glossary"
                  icon={BookmarkSquareIcon}
                  title="Glossary"
                  description="Istilah khusus dunia konveksi dan sistem ERP ini."
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <GlossaryItem term="Cutting" def="Proses pemotongan bahan kain menjadi bagian-bagian pola sebelum dijahit." />
                  <GlossaryItem term="Sewing / Jahit" def="Proses menjahit potongan kain menjadi produk jadi." />
                  <GlossaryItem term="Bordir" def="Proses pemberian hiasan/motif pada kain menggunakan mesin bordir." />
                  <GlossaryItem term="Finishing" def="Tahap akhir seperti pemasangan label, packing, dan pengecekan akhir." />
                  <GlossaryItem term="QC (Quality Control)" def="Pengecekan kualitas produk untuk menentukan GOOD atau REJECT." />
                  <GlossaryItem term="Reject" def="Produk yang tidak lolos QC dan dianggap gagal/cacat." />
                  <GlossaryItem term="WIP (Work In Process)" def="Barang yang masih dalam proses produksi, belum jadi." />
                  <GlossaryItem term="Job Order (JO)" def="Dokumen pesanan kerja yang berisi detail produksi yang harus dikerjakan." />
                  <GlossaryItem term="HPP" def="Harga Pokok Produksi — total biaya untuk menghasilkan satu unit produk." />
                  <GlossaryItem term="Lusin" def="Satuan hitung = 12 pcs, umum digunakan di konveksi." />
                  <GlossaryItem term="CMT" def="Cutting, Making, Trimming — skema upah jahit borongan/vendor (maklon)." />
                  <GlossaryItem term="WIP Stok" def="Stok barang yang masih dalam tahap produksi." />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground">
            <p>— Akhir Panduan Penggunaan —</p>
            <p>
              Butuh bantuan lebih lanjut? Hubungi administrator sistem.
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .page-container { padding: 0 !important; }
          aside { display: none !important; }
          .print\\:!block { display: block !important; }
        }
      `}</style>
    </div>
  )
}

function CaseCard({ title, setup, steps, expected }: { title: string; setup: string; steps: string[]; expected: string }) {
  return (
    <div className="rounded-xl border border-border/60 p-4 hover:shadow-md transition-shadow">
      <h4 className="flex items-center gap-2 text-sm font-semibold">
        <StarIcon className="h-4 w-4 text-amber-500" />
        {title}
      </h4>
      <p className="mt-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Kondisi awal:</span> {setup}
      </p>
      <ol className="mt-3 space-y-1.5">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
            <span className="flex h-4 w-4 flex-none items-center justify-center rounded-full bg-brand-primary/10 text-[10px] font-bold text-brand-primary">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-green-700 flex gap-2 dark:text-green-400">
        <CheckCircleIcon className="h-4 w-4 flex-none" />
        <span><span className="font-semibold">Hasil yang diharapkan:</span> {expected}</span>
      </p>
    </div>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/50 p-3">
      <QuestionMarkCircleIcon className="h-5 w-5 flex-none text-brand-primary" />
      <div>
        <p className="text-sm font-semibold">{q}</p>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{a}</p>
      </div>
    </div>
  )
}

function GlossaryItem({ term, def }: { term: string; def: string }) {
  return (
    <div className="rounded-lg border border-border/50 p-3">
      <p className="text-sm font-semibold text-brand-primary">{term}</p>
      <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{def}</p>
    </div>
  )
}
