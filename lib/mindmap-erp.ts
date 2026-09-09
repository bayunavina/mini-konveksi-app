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
  { id: "payroll", label: "Payroll Produksi", description: "Alur pencatatan scan dan penggajian per pcs." },
]

export const PROCESS_FLOW: ProcessNode[] = [
  { id: "order", label: "Order Customer / Sales Order", role: "Customer + Admin", gate: "Data customer, produk, qty, dan target lengkap", module: "Job Order", kind: "external", href: "/dashboard/produksi" },
  { id: "approval", label: "Approval Job Order", role: "Admin / Superadmin", gate: "Order disetujui dan siap diproduksi", module: "Job Order", kind: "stage", href: "/dashboard/produksi" },
  { id: "stock-check", label: "Apakah stok bahan cukup?", role: "Admin / Gudang", gate: "Ketersediaan bahan sudah diverifikasi", module: "Inventory", kind: "decision", href: "/dashboard/inventory" },
  { id: "restock", label: "Restock / Penerimaan Bahan", role: "Admin + Supplier + Gudang", gate: "Bahan diterima dan tercatat di gudang", module: "Inventory / Transfer", kind: "external", href: "/dashboard/transfer/incoming" },
  { id: "assignment", label: "Assignment Tim Produksi", role: "Admin", gate: "Operator dan target qty ditentukan", module: "Produksi", kind: "stage", href: "/dashboard/production/assignments" },
  { id: "production", label: "Cutting → Sewing → Finishing", role: "Tim Produksi", gate: "Progress tercatat dengan scan 1 pcs", module: "Produksi", kind: "stage", href: "/dashboard/production/progress" },
  { id: "qc", label: "QC: Good atau Reject?", role: "QC", gate: "Hasil pemeriksaan disimpan", module: "Quality Control", kind: "decision", href: "/dashboard/qc/overview" },
  { id: "rework", label: "Rework / Barang Reject", role: "QC + Produksi", gate: "Barang diperbaiki atau dicatat sebagai reject", module: "QC / Inventory", kind: "stage", href: "/dashboard/inventory/rejects" },
  { id: "finished", label: "Barang Jadi di Gudang", role: "Gudang", gate: "QC Good dan qty tervalidasi", module: "Inventory", kind: "stage", href: "/dashboard/inventory/finished" },
  { id: "delivery", label: "Barang Keluar / Pengiriman", role: "Gudang", gate: "Transfer keluar disetujui dan discan", module: "Transfer", kind: "external", href: "/dashboard/transfer/outgoing" },
  { id: "finance", label: "Invoice dan Pembayaran", role: "Admin / Finance + Customer", gate: "Transaksi tercatat dan pembayaran diterima", module: "Finance", kind: "external", href: "/overview/finance" },
  { id: "done", label: "Selesai", role: "Admin", gate: "Order, stok, QC, dan finance tersinkron", module: "Dashboard", kind: "stage", href: "/dashboard/admin" },
]

export const MODULE_BRANCHES = [
  { id: "master", label: "Master Data", href: "/dashboard/settings/master", children: ["Bahan Baku", "Supplier", "Kategori Biaya", "User & Role"] },
  { id: "sales", label: "Sales / Produksi", href: "/dashboard/produksi", children: ["Job Order", "Buat JO Baru", "Assignment", "Progress Produksi"] },
  { id: "qc", label: "Quality Control", href: "/dashboard/qc-reports", children: ["QC Overview", "QC Report", "Good", "Reject"] },
  { id: "inventory", label: "Inventory", href: "/dashboard/inventory", children: ["Overview", "Bahan Baku", "Barang Jadi", "Reject"] },
  { id: "warehouse", label: "Transfer & Warehouse", href: "/dashboard/transfer", children: ["Barang Masuk", "Barang Keluar", "Master Gudang"] },
  { id: "employees", label: "Karyawan & Payroll", href: "/dashboard/employees", children: ["Daftar Karyawan", "Tim Produksi", "Penggajian", "Klaim Gaji", "Kasbon"] },
  { id: "finance", label: "Finance", href: "/overview/finance", children: ["Overview", "Transaksi", "Laporan", "Dashboard HPP"] },
  { id: "reports", label: "Reporting & Audit", href: "/dashboard/balance", children: ["Balance Report", "Log Aktivitas", "Dashboard"] },
  { id: "qr", label: "QR & Scanner", href: "/dashboard/qr-generator", children: ["QR Generator", "Barcode", "Scan QR"] },
]
