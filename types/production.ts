export type JobOrderStatus = 
  | "DRAFT" 
  | "APPROVED" 
  | "IN_PROGRESS" 
  | "QC_PENDING" 
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED"
  | "HOLD"
  | "PENDING";

export const JOB_ORDER_STATUS_LABELS: Record<JobOrderStatus, string> = {
  DRAFT: "Draft",
  APPROVED: "Disetujui",
  IN_PROGRESS: "Dalam Produksi",
  QC_PENDING: "Menunggu QC",
  COMPLETED: "Selesai",
  REJECTED: "Ditolak",
  CANCELLED: "Dibatalkan",
  HOLD: "Hold",
  PENDING: "Menunggu",
};

export const JOB_ORDER_STATUS_COLORS: Record<JobOrderStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  APPROVED: "bg-brand-primary/10 text-brand-primary",
  IN_PROGRESS: "bg-warning-light text-warning-foreground",
  QC_PENDING: "bg-warning-light text-warning-foreground",
  COMPLETED: "bg-success-light text-success-foreground",
  REJECTED: "bg-destructive/10 text-destructive",
  CANCELLED: "bg-muted text-muted-foreground",
  HOLD: "bg-accent text-accent-foreground",
  PENDING: "bg-warning-light text-warning-foreground border-warning/30",
};

export interface JobOrder {
  id: string;
  joNumber: string;
  targetQty: number;
  completedQty: number;
  rejectedQty: number;
  acceptedQty?: number;
  status: JobOrderStatus | string;
  dueDate?: string | Date | null;
  notes?: string | null;
  createdAt: string | Date;
  qcEmployeeId?: string | null;
  productId?: string | null;
  product?: {
    id: string;
    sku: string;
    name: string;
  } | null;
  employee?: {
    name: string;
  } | null;
  hppEstimated?: number;
  hppActual?: number;
  hppPerPcs?: number;
}

export interface ProductionReport {
  id: string;
  jobOrderId: string;
  joNumber: string;
  teamId: string;
  teamName?: string;
  successQuantity: number;
  rejectQuantity: number;
  rejectReason?: string;
  reportedBy: string;
  reportedAt: Date;
  qcStatus: "PENDING" | "APPROVED" | "REJECTED";
  qcNotes?: string;
  qcApprovedBy?: string;
  qcApprovedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface QCApproval {
  id: string;
  productionReportId: string;
  status: "APPROVED" | "REJECTED";
  notes?: string;
  approvedBy: string;
  approvedAt: Date;
  createdAt: Date;
}

export interface MaterialLot {
  id: string;
  lotNumber: string;
  skuId: string;
  skuCode: string;
  skuName: string;
  quantity: number;
  unit: string;
  supplierId?: string;
  supplierName?: string;
  poNumber?: string;
  receivedAt: Date;
  status: "AVAILABLE" | "IN_USE" | "DEPLETED";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
