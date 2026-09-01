export type TransferStatus = "PENDING" | "SHIPPED" | "RECEIVED" | "CANCELLED";

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  PENDING: "Menunggu",
  SHIPPED: "Dikirim",
  RECEIVED: "Diterima",
  CANCELLED: "Dibatalkan",
};

export const TRANSFER_STATUS_COLORS: Record<TransferStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  SHIPPED: "bg-blue-100 text-blue-800",
  RECEIVED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-600",
};

export interface TransferOrder {
  id: string;
  toNumber: string;
  date: Date;
  fromWarehouseId: string;
  fromWarehouseName: string;
  toWarehouseId: string;
  toWarehouseName: string;
  requestedBy: string;
  items: TransferItem[];
  totalQuantity: number;
  status: TransferStatus;
  shippedAt?: Date;
  receivedAt?: Date;
  receivedBy?: string;
  notes?: string;
  receivingDocumentation?: ReceivingDocumentation;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransferItem {
  id: string;
  transferOrderId: string;
  skuId: string;
  skuCode: string;
  skuName: string;
  quantity: number;
  unit: string;
  fromStockId: string;
}

export interface ReceivingDocumentation {
  id: string;
  transferOrderId: string;
  photos: ReceivingPhoto[];
  receivedNotes?: string;
  conditionNotes?: "GOOD" | "DAMAGED" | "INCOMPLETE";
  verifiedBy: string;
  verifiedAt: Date;
  createdAt: Date;
}

export interface ReceivingPhoto {
  id: string;
  url: string;
  caption?: string;
  uploadedAt: Date;
}
