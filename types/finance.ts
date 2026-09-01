export type TransactionType = "INCOME" | "EXPENSE";
export type TransactionCategory = 
  | "SELLING"
  | "CAPITAL"
  | "SALARY"
  | "MATERIAL"
  | "OUTSOURCING"
  | "RENT"
  | "UTILITY"
  | "MAINTENANCE"
  | "TRANSPORT"
  | "OTHER";

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  INCOME: "Pemasukan",
  EXPENSE: "Pengeluaran",
};

export const TRANSACTION_TYPE_COLORS: Record<TransactionType, string> = {
  INCOME: "bg-green-100 text-green-800",
  EXPENSE: "bg-red-100 text-red-800",
};

export const TRANSACTION_CATEGORY_LABELS: Record<TransactionCategory, string> = {
  SELLING: "Penjualan",
  CAPITAL: "Setoran Modal",
  SALARY: "Gaji Karyawan",
  MATERIAL: "Bahan Baku",
  OUTSOURCING: "Jahit Titip",
  RENT: "Sewa",
  UTILITY: "Listrik & Air",
  MAINTENANCE: "Perawatan",
  TRANSPORT: "Transportasi",
  OTHER: "Lainnya",
};

export interface Transaction {
  id: string;
  date: Date;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  description: string;
  referenceType?: "SALARY" | "KASBON" | "TRANSFER" | "JO" | "OTHER";
  referenceId?: string;
  paymentMethod?: "CASH" | "BANK" | "TRANSFER";
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CashFlowReport {
  periodStart: Date;
  periodEnd: Date;
  openingBalance: number;
  totalIncome: number;
  totalExpense: number;
  closingBalance: number;
  transactions: Transaction[];
}

export interface ProfitLossReport {
  periodStart: Date;
  periodEnd: Date;
  totalRevenue: number;
  totalProductionCost: number;
  totalOperationalCost: number;
  grossProfit: number;
  netProfit: number;
}

export interface CostPerJobOrder {
  jobOrderId: string;
  joNumber: string;
  materialCost: number;
  laborCost: number;
  otherCost: number;
  totalCost: number;
  revenue?: number;
  profit?: number;
}
