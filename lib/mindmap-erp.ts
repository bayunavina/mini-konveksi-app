export type MindMapTabId = "main-flow" | "module-map" | "restock" | "payroll"

export type ProcessNodeKind = "stage" | "decision" | "external" | "parallel"

export interface ProcessNode {
  id: string
  label: string
  role: string
  gate: string
  module: string
  kind: ProcessNodeKind
  href?: string
}

export const MIND_MAP_TABS: { id: MindMapTabId; label: string; description: string }[] = [
  { id: "main-flow", label: "Proses Utama", description: "Alur Job Order dari order masuk sampai selesai." },
  { id: "module-map", label: "Struktur Modul", description: "Peta fitur dan modul ERP Konveksi." },
  { id: "restock", label: "Restock Bahan", description: "Alur pengadaan bahan saat stok tidak mencukupi." },
  { id: "payroll", label: "Payroll Produksi", description: "Alur input hasil produksi, klaim gaji, dan pembayaran per pcs." },
]

export const PROCESS_FLOW: ProcessNode[] = [
  { id: "order", label: "Order Customer / Sales Order", role: "Customer + Admin", gate: "Data produk, tim produksi, qty target, dan due date lengkap", module: "Job Order", kind: "external", href: "/dashboard/produksi/new" },
  { id: "approval", label: "Approval Job Order + Input HPP", role: "Admin / Superadmin", gate: "Status JO disetujui (DRAFT → APPROVED); biaya HPP (BBL/TKL/OVP) tercatat", module: "Job Order", kind: "stage", href: "/dashboard/produksi" },
  { id: "stock-check", label: "Apakah stok bahan cukup?", role: "Admin / Gudang", gate: "Ketersediaan material lot untuk produksi diverifikasi", module: "Inventory", kind: "decision", href: "/dashboard/inventory" },
  { id: "restock", label: "Restock / Penerimaan Bahan", role: "Admin + Supplier + Gudang", gate: "Bahan diterima dan tercatat di gudang", module: "Inventory / Transfer", kind: "external", href: "/dashboard/transfer/incoming" },
  { id: "assignment", label: "Assignment Tim Produksi", role: "Admin", gate: "Karyawan, material lot, target qty & rate per pcs ditentukan saat pembuatan JO", module: "Job Order", kind: "stage", href: "/dashboard/produksi/new" },
  { id: "production", label: "Pengerjaan & Input Hasil Produksi", role: "Karyawan", gate: "Tugas diterima (IN_PROGRESS); hasil diinput per assignment; JO tidak HOLD", module: "Produksi", kind: "stage", href: "/dashboard/karyawan/produksi" },
  { id: "qc-request", label: "Request QC", role: "Karyawan", gate: "pendingQty > 0 & QC belum pernah diminta (→ QC_REQUESTED, JO → QC_PENDING)", module: "Quality Control", kind: "stage", href: "/dashboard/karyawan" },
  { id: "qc", label: "QC: Good atau Reject?", role: "QC", gate: "Scan/validasi; success ≤ pendingQty; assignment COMPLETED saat pending = 0", module: "Quality Control", kind: "decision", href: "/dashboard/qc/overview" },
  { id: "reject", label: "Catat Reject", role: "QC", gate: "Reject masuk Gudang Reject; reject rate > 5% memicu biaya MTC otomatis", module: "QC / Inventory", kind: "stage", href: "/dashboard/inventory/rejects" },
  { id: "finished", label: "Barang Jadi di Gudang", role: "Gudang", gate: "QC Good; movement QC_COMPLETE ke Gudang Bahan Jadi", module: "Inventory", kind: "stage", href: "/dashboard/inventory/finished" },
  { id: "delivery", label: "Transfer & Pengiriman", role: "Gudang", gate: "Transfer OUTGOING → COMPLETED; stok keluar tercatat", module: "Transfer", kind: "external", href: "/dashboard/transfer/outgoing" },
  { id: "salary", label: "Klaim Gaji per Pcs", role: "Karyawan", gate: "completedQty > 0, lolos QC, belum ada gaji untuk assignment tsb", module: "Payroll", kind: "stage", href: "/dashboard/karyawan/gaji" },
  { id: "payroll", label: "Review & Pembayaran Gaji", role: "Admin / Superadmin", gate: "Claim APPROVED → PAID; transaksi SALARY tercatat", module: "Payroll", kind: "stage", href: "/dashboard/employees/salaries" },
  { id: "finance", label: "Pencatatan Keuangan & HPP", role: "Admin / Finance", gate: "Transaksi & biaya HPP tersinkron dengan Job Order", module: "Finance", kind: "external", href: "/overview/finance" },
  { id: "done", label: "Selesai", role: "Admin", gate: "JO, stok, QC, payroll, dan finance tersinkron", module: "Dashboard", kind: "stage", href: "/dashboard/admin" },
]

const NON_KARYAWAN_HREF_OVERRIDES: Record<string, string> = {
  production: "/dashboard/produksi",
  "qc-request": "/dashboard/qc-reports",
  salary: "/dashboard/employees/salary-claims",
}

// Halaman /dashboard/karyawan/* hanya diizinkan untuk role KARYAWAN oleh RBAC.
// Untuk role lain (ADMIN/SUPERADMIN), href node mind map dialihkan ke modul setara.
export function getRoleAwareHref(id: string, href: string, role?: string): string {
  if (role === "KARYAWAN") return href
  return NON_KARYAWAN_HREF_OVERRIDES[id] ?? href
}

export const MODULE_BRANCHES = [
  { id: "master", label: "Master Data", href: "/dashboard/settings/master", children: ["Bahan Baku", "Supplier", "Kategori Biaya", "User & Role"] },
  { id: "sales", label: "Sales / Produksi", href: "/dashboard/produksi", children: ["Job Order", "Buat JO Baru", "Assignment Tim", "Input Hasil Produksi"] },
  { id: "qc", label: "Quality Control", href: "/dashboard/qc-reports", children: ["QC Overview", "QC Report", "Good", "Reject"] },
  { id: "inventory", label: "Inventory", href: "/dashboard/inventory", children: ["Overview", "Bahan Baku", "Barang Jadi", "Reject"] },
  { id: "warehouse", label: "Transfer & Warehouse", href: "/dashboard/transfer", children: ["Barang Masuk", "Barang Keluar", "Master Gudang"] },
  { id: "employees", label: "Karyawan & Payroll", href: "/dashboard/employees", children: ["Daftar Karyawan", "Tim Produksi", "Penggajian", "Klaim Gaji", "Kasbon"] },
  { id: "finance", label: "Finance", href: "/overview/finance", children: ["Overview", "Transaksi", "Laporan", "Dashboard HPP"] },
  { id: "reports", label: "Reporting & Audit", href: "/dashboard/balance", children: ["Balance Report", "Log Aktivitas", "Dashboard"] },
  { id: "qr", label: "QR & Scanner", href: "/dashboard/qr-generator", children: ["QR Generator", "Barcode", "Scan QR"] },
]