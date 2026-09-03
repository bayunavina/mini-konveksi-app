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
  ACTIVE: "bg-success-light text-success-foreground",
  MAINTENANCE: "bg-warning-light text-warning-foreground",
  BROKEN: "bg-destructive/10 text-destructive",
  RETIRED: "bg-muted text-muted-foreground",
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
