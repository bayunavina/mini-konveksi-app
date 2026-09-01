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
  DRAFT: "bg-gray-100 text-gray-800",
  APPROVED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  QC_PENDING: "bg-orange-100 text-orange-800",
  COMPLETED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-600",
  HOLD: "bg-purple-100 text-purple-800",
  PENDING: "bg-yellow-50 text-yellow-700 border-yellow-200",
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
