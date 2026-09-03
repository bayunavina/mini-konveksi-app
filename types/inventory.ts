export type StockType = "MATERIAL" | "FINISHED" | "REJECT";

export const STOCK_TYPE_LABELS: Record<StockType, string> = {
  MATERIAL: "Bahan Baku",
  FINISHED: "Barang Jadi",
  REJECT: "Reject",
};

export const STOCK_TYPE_COLORS: Record<StockType, string> = {
  MATERIAL: "bg-brand-primary/10 text-brand-primary",
  FINISHED: "bg-success-light text-success-foreground",
  REJECT: "bg-destructive/10 text-destructive",
};

export interface Stock {
  id: string;
  skuId: string;
  skuCode: string;
  skuName: string;
  type: StockType;
  quantity: number;
  unit: string;
  warehouseId?: string;
  warehouseName?: string;
  minStock?: number;
  location?: string;
  lastMovementAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockMovement {
  id: string;
  stockId: string;
  type: StockType;
  movementType: 
    | "IN" 
    | "OUT" 
    | "TRANSFER_IN" 
    | "TRANSFER_OUT"
    | "ADJUSTMENT";
  quantity: number;
  unit: string;
  referenceType?: "JOB_ORDER" | "TRANSFER_ORDER" | "PURCHASE" | "ADJUSTMENT";
  referenceId?: string;
  notes?: string;
  performedBy: string;
  performedAt: Date;
  createdAt: Date;
}

export interface RejectRecord {
  id: string;
  jobOrderId?: string;
  joNumber?: string;
  skuId: string;
  skuCode: string;
  skuName: string;
  quantity: number;
  unit: string;
  reason: string;
  reportedBy: string;
  reportedAt: Date;
  status: "PENDING" | "REVIEWED" | "DISPOSED";
  reviewedBy?: string;
  reviewedAt?: Date;
  notes?: string;
  createdAt: Date;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address?: string;
  isMain: boolean;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}
