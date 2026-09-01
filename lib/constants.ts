export const ROLE_ADMIN = "ADMIN";
export const ROLE_GUDANG = "GUDANG";
export const ROLE_OPERATOR = "OPERATOR";
export const ROLE_QC = "QC";
export const ROLE_KEUANGAN = "KEUANGAN";
export const ROLE_MANAGER = "MANAGER";
export const ROLE_KARYAWAN = "KARYAWAN";
export const ROLE_VIEWER = "VIEWER";

export const ROLES = [
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
  [ROLE_ADMIN]: "Administrator",
  [ROLE_GUDANG]: "Operator Gudang",
  [ROLE_OPERATOR]: "Operator Produksi",
  [ROLE_QC]: "QC Staff",
  [ROLE_KEUANGAN]: "Keuangan",
  [ROLE_MANAGER]: "Manajer",
  [ROLE_KARYAWAN]: "Karyawan Produksi",
  [ROLE_VIEWER]: "Viewer",
};

export const ROLE_COLORS: Record<Role, string> = {
  [ROLE_ADMIN]: "bg-red-100 text-red-800",
  [ROLE_GUDANG]: "bg-blue-100 text-blue-800",
  [ROLE_OPERATOR]: "bg-green-100 text-green-800",
  [ROLE_QC]: "bg-purple-100 text-purple-800",
  [ROLE_KEUANGAN]: "bg-yellow-100 text-yellow-800",
  [ROLE_MANAGER]: "bg-indigo-100 text-indigo-800",
  [ROLE_KARYAWAN]: "bg-teal-100 text-teal-800",
  [ROLE_VIEWER]: "bg-gray-100 text-gray-800",
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
