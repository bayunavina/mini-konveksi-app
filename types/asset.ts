export type AssetCategory = 
  | "MACHINE" 
  | "EQUIPMENT" 
  | "FURNITURE" 
  | "VEHICLE" 
  | "OTHER";

export type AssetStatus = "ACTIVE" | "MAINTENANCE" | "BROKEN" | "RETIRED";
export type DepreciationMethod = "STRAIGHT_LINE" | "DECLINING";
export type MaintenanceType = "PREVENTIVE" | "CORRECTIVE" | "PREDICTIVE";

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  MACHINE: "Mesin",
  EQUIPMENT: "Peralatan",
  FURNITURE: "Furniture",
  VEHICLE: "Kendaraan",
  OTHER: "Lainnya",
};

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  ACTIVE: "Aktif",
  MAINTENANCE: "Perawatan",
  BROKEN: "Rusak",
  RETIRED: "Dinonaktifkan",
};

export const ASSET_STATUS_COLORS: Record<AssetStatus, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  MAINTENANCE: "bg-yellow-100 text-yellow-800",
  BROKEN: "bg-red-100 text-red-800",
  RETIRED: "bg-gray-100 text-gray-600",
};

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  PREVENTIVE: "Preventif",
  CORRECTIVE: "Perbaikan",
  PREDICTIVE: "Prediktif",
};

export interface Asset {
  id: string;
  code: string;
  name: string;
  category: AssetCategory;
  purchaseDate: Date;
  purchasePrice: number;
  depreciationMethod: DepreciationMethod;
  usefulLifeMonths: number;
  residualValue: number;
  currentValue: number;
  location?: string;
  assignedTo?: string;
  assignedToName?: string;
  supplier?: string;
  status: AssetStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Maintenance {
  id: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  type: MaintenanceType;
  description: string;
  scheduledDate?: Date;
  completedDate?: Date;
  cost?: number;
  performedBy?: string;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetDepreciation {
  assetId: string;
  month: Date;
  depreciationAmount: number;
  accumulatedDepreciation: number;
  bookValue: number;
}
