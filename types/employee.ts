import type { Role } from "@/lib/constants";

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: Role;
  pin?: string;
  employeeId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Employee {
  id: string;
  userId?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  bankAccount?: string;
  bankName?: string;
  teamId?: string;
  baseSalary?: number;
  ratePerUnit: number;
  unit: string;
  status: "ACTIVE" | "INACTIVE";
  hireDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Team {
  id: string;
  name: string;
  supervisorId?: string;
  description?: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}

export interface PayrollPeriod {
  id: string;
  type: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  dayOfWeek?: number;
  dayOfMonth?: number;
  weekOfMonth?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SalaryPayment {
  id: string;
  employeeId: string;
  periodStart: Date;
  periodEnd: Date;
  totalUnits: number;
  ratePerUnit: number;
  grossSalary: number;
  bonus: number;
  deduction: number;
  kasbonDeduction: number;
  netSalary: number;
  status: "PENDING" | "PAID";
  paidAt?: Date;
  paidBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Kasbon {
  id: string;
  employeeId: string;
  amount: number;
  reason?: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID";
  approvedBy?: string;
  rejectedReason?: string;
  dueDate?: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface KasbonPayment {
  id: string;
  kasbonId: string;
  employeeId: string;
  amount: number;
  paymentDate: Date;
  paidBy: string;
  notes?: string;
  createdAt: Date;
}
