export const ROLE_SUPERADMIN = "SUPERADMIN";
export const ROLE_ADMIN = "ADMIN";
export const ROLE_GUDANG = "GUDANG";
export const ROLE_OPERATOR = "OPERATOR";
export const ROLE_QC = "QC";
export const ROLE_KEUANGAN = "KEUANGAN";
export const ROLE_MANAGER = "MANAGER";
export const ROLE_KARYAWAN = "KARYAWAN";
export const ROLE_VIEWER = "VIEWER";

export const ROLES = [
  ROLE_SUPERADMIN,
  ROLE_ADMIN,
  ROLE_GUDANG,
  ROLE_OPERATOR,
  ROLE_QC,
  ROLE_KEUANGAN,
  ROLE_MANAGER,
  ROLE_KARYAWAN,
  ROLE_VIEWER,
] as const;

export type Role = typeof ROLES[number];

export const ROLE_LABELS: Record<Role, string> = {
  [ROLE_SUPERADMIN]: "Super Admin",
  [ROLE_ADMIN]: "Administrator",
  [ROLE_GUDANG]: "Petugas Gudang",
  [ROLE_OPERATOR]: "Operator Produksi",
  [ROLE_QC]: "QC Staff",
  [ROLE_KEUANGAN]: "Keuangan",
  [ROLE_MANAGER]: "Manajer",
  [ROLE_KARYAWAN]: "Karyawan Produksi",
  [ROLE_VIEWER]: "Viewer",
};

export const ROLE_COLORS: Record<Role, string> = {
  [ROLE_SUPERADMIN]: "bg-destructive/10 text-destructive border border-destructive/30",
  [ROLE_ADMIN]: "bg-destructive/10 text-destructive",
  [ROLE_GUDANG]: "bg-brand-primary/10 text-brand-primary",
  [ROLE_OPERATOR]: "bg-success-light text-success-foreground",
  [ROLE_QC]: "bg-accent text-accent-foreground",
  [ROLE_KEUANGAN]: "bg-warning-light text-warning-foreground",
  [ROLE_MANAGER]: "bg-brand-primary/10 text-brand-primary",
  [ROLE_KARYAWAN]: "bg-brand-primary/10 text-brand-primary",
  [ROLE_VIEWER]: "bg-muted text-muted-foreground",
};

export const UNIT_LUSIN = "LUSIN";
export const UNIT_PCS = "PCS";
export const UNIT_KG = "KG";
export const UNIT_METER = "METER";

export const UNITS = [UNIT_LUSIN, UNIT_PCS, UNIT_KG, UNIT_METER] as const;

export type Unit = typeof UNITS[number];

export const UNIT_LABELS: Record<Unit, string> = {
  [UNIT_LUSIN]: "Lusin (12 pcs)",
  [UNIT_PCS]: "Pieces",
  [UNIT_KG]: "Kilogram",
  [UNIT_METER]: "Meter",
};

export const PAYROLL_WEEKLY = "WEEKLY";
export const PAYROLL_BIWEEKLY = "BIWEEKLY";
export const PAYROLL_MONTHLY = "MONTHLY";

export const PAYROLL_TYPES = [PAYROLL_WEEKLY, PAYROLL_BIWEEKLY, PAYROLL_MONTHLY] as const;

export type PayrollType = typeof PAYROLL_TYPES[number];

export const PAYROLL_LABELS: Record<PayrollType, string> = {
  [PAYROLL_WEEKLY]: "Mingguan",
  [PAYROLL_BIWEEKLY]: "Dua Mingguan",
  [PAYROLL_MONTHLY]: "Bulanan",
};

export const CATEGORY_PRODUCTION = "PRODUCTION";
export const CATEGORY_OPERATIONAL = "OPERATIONAL";

export const EXPENSE_CATEGORIES = [CATEGORY_PRODUCTION, CATEGORY_OPERATIONAL] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export const ASSET_CATEGORY_MACHINE = "MACHINE";
export const ASSET_CATEGORY_EQUIPMENT = "EQUIPMENT";
export const ASSET_CATEGORY_FURNITURE = "FURNITURE";
export const ASSET_CATEGORY_VEHICLE = "VEHICLE";
export const ASSET_CATEGORY_OTHER = "OTHER";

export const ASSET_CATEGORIES = [
  ASSET_CATEGORY_MACHINE,
  ASSET_CATEGORY_EQUIPMENT,
  ASSET_CATEGORY_FURNITURE,
  ASSET_CATEGORY_VEHICLE,
  ASSET_CATEGORY_OTHER,
] as const;

export type AssetCategory = typeof ASSET_CATEGORIES[number];

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  [ASSET_CATEGORY_MACHINE]: "Mesin",
  [ASSET_CATEGORY_EQUIPMENT]: "Peralatan",
  [ASSET_CATEGORY_FURNITURE]: "Furniture",
  [ASSET_CATEGORY_VEHICLE]: "Kendaraan",
  [ASSET_CATEGORY_OTHER]: "Lainnya",
};

export const TRANSACTION_TYPE_INCOME = "INCOME";
export const TRANSACTION_TYPE_EXPENSE = "EXPENSE";

export const TRANSACTION_TYPES = [TRANSACTION_TYPE_INCOME, TRANSACTION_TYPE_EXPENSE] as const;

export type TransactionType = typeof TRANSACTION_TYPES[number];

export const APP_NAME = "ERP Konveksi";
export const APP_DESCRIPTION = "Sistem ERP untuk Manajemen Produksi Konveksi";

export const MAX_PHOTO_UPLOAD = 10;
export const MAX_PHOTO_SIZE_MB = 5;
export const MAX_PHOTO_SIZE_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024;

// Finance / Cost Categories
export const DIRECT_CATEGORIES = new Set(["BBL", "ACC", "TKL", "TKL-P", "OVP", "PKG"]);
export const INDIRECT_CATEGORIES = new Set(["GTL", "LST", "SEWA", "MTC", "BPJS", "KON", "ADM", "MKT"]);

// Category code labels for display/validation
export const CATEGORY_CODE_LABELS: Record<string, { name: string; type: "DIRECT" | "INDIRECT"; description: string }> = {
  BBL: { name: "Bahan Baku Kain", type: "DIRECT", description: "Kain utama, kain keras, rib - termasuk ongkir beli bahan" },
  ACC: { name: "Aksesoris Langsung", type: "DIRECT", description: "Benang, kancing, resleting, karet, busa, label woven" },
  TKL: { name: "Upah Jahit Borongan", type: "DIRECT", description: "Upah jahit per pcs / borongan (60% HPP) - tim 20+ penjahit" },
  TKL_P: { name: "Upah Potong", type: "DIRECT", description: "Upah potong kain harian / borongan" },
  OVP: { name: "Ongkos Vendor Jahit (CMT)", type: "DIRECT", description: "Maklon / CMT vendor luar saat overload 30 orang" },
  PKG: { name: "Packaging & Label", type: "DIRECT", description: "Plastik OPP, hangtag, label harga, dus packing" },
  GTL: { name: "Gaji Tidak Langsung", type: "INDIRECT", description: "Gaji mandor, admin produksi, QC leader (3 org) - tetap bulanan" },
  LST: { name: "Listrik & Air", type: "INDIRECT", description: "Utilitas listrik, air, genset, kompresor bulanan" },
  SEWA: { name: "Sewa Tempat", type: "INDIRECT", description: "Sewa gudang, workshop & toko / cicilan ruko" },
  MTC: { name: "Service & Penyusutan Mesin", type: "INDIRECT", description: "Service mesin jahit, obras, cutting + penyusutan 15-20 mesin" },
  BPJS: { name: "BPJS, THR & Tunjangan", type: "INDIRECT", description: "BPJS Ketenagakerjaan, THR, tunjangan harian 30 karyawan" },
  KON: { name: "Konsumsi & Mess", type: "INDIRECT", description: "Makan siang, air galon, gas, mess karyawan" },
  ADM: { name: "Administrasi Umum", type: "INDIRECT", description: "ATK, internet, operasional kantor, pajak UMKM" },
  MKT: { name: "Marketing & Kirim Jual", type: "INDIRECT", description: "Foto produk, iklan, fee marketplace, ongkir kirim barang jadi" },
};
export const CATEGORY_CODES = Object.keys(CATEGORY_CODE_LABELS) as (keyof typeof CATEGORY_CODE_LABELS)[];

export const isDirectCategory = (code: string) => DIRECT_CATEGORIES.has(code);
export const isIndirectCategory = (code: string) => INDIRECT_CATEGORIES.has(code);

export const getCategoryCodeInfo = (code: string) => CATEGORY_CODE_LABELS[code] || null;

export const MTC_PER_PCS = 7500;
export const REJECT_RATE_THRESHOLD = 0.05;
export const LOW_STOCK_THRESHOLD = 0.2;

export const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || "erpkonveksi@gmail.com";
