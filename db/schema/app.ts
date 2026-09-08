import { pgTable, text, timestamp, integer, boolean, uuid, decimal } from "drizzle-orm/pg-core"

export const masterSkus = pgTable("master_skus", {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    category: text("category"),
    unit: text("unit").default("Pcs"),
    price: decimal("price", { precision: 12, scale: 2 }).default("0"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
})

// Warehouses
export const warehouses = pgTable("warehouses", {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    address: text("address"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
})

// Products / SKU
export const products = pgTable("products", {
    id: uuid("id").primaryKey().defaultRandom(),
    sku: text("sku").notNull().unique(),
    name: text("name").notNull(),
    category: text("category"),
    unit: text("unit").default("Pcs"),
    price: integer("price").default(0),
    minStock: integer("min_stock").default(0),
    isActive: boolean("is_active").default(true),
    source: text("source").default("MANUAL"),
    sourceId: text("source_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
})

// Inventory / Stock
export const inventory = pgTable("inventory", {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id").references(() => products.id),
    warehouseId: uuid("warehouse_id").references(() => warehouses.id),
    quantity: integer("quantity").default(0),
    lotNumber: text("lot_number"),
    location: text("location"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
})

// Material Lots - Track individual material lots with stock
export const materialLots = pgTable("material_lots", {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id").notNull(), // References master-skus
    lotNumber: text("lot_number").notNull().unique(),
    qrCode: text("qr_code").notNull().unique(),
    quantity: integer("quantity").default(0).notNull(),
    initialQty: integer("initial_qty").default(0).notNull(),
    status: text("status").default("AVAILABLE"),
    isReadyForProduction: boolean("is_ready_for_production").default(false),
    notes: text("notes"),
    supplier: text("supplier"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
})

// Production Logs - Track production from materials
export const productionFromMaterials = pgTable("production_from_materials", {
    id: uuid("id").primaryKey().defaultRandom(),
    lotId: uuid("lot_id").references(() => materialLots.id).notNull(),
    productId: uuid("product_id").references(() => products.id).notNull(),
    producedQty: integer("produced_qty").notNull(),
    usedQty: integer("used_qty").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
})

// Production Assignments - Assign production to employees
export const productionAssignments = pgTable("production_assignments", {
    id: uuid("id").primaryKey().defaultRandom(),
    jobOrderId: uuid("job_order_id").references(() => jobOrders.id),
    materialLotId: uuid("material_lot_id").references(() => materialLots.id),
    employeeId: uuid("employee_id").references(() => employees.id).notNull(),
    targetQty: integer("target_qty").notNull(),
    completedQty: integer("completed_qty").default(0),
    rejectedQty: integer("rejected_qty").default(0),
    acceptedQty: integer("accepted_qty").default(0),
    pendingQty: integer("pending_qty").default(0),
    qcRequestedAt: timestamp("qc_requested_at"),
    ratePerUnit: decimal("rate_per_unit", { precision: 10, scale: 2 }).default("0"),
    status: text("status").default("ASSIGNED"),
    notes: text("notes"),
    assignedAt: timestamp("assigned_at").defaultNow(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
})

// Production Progress - Track progress logs
export const productionProgress = pgTable("production_progress", {
    id: uuid("id").primaryKey().defaultRandom(),
    assignmentId: uuid("assignment_id").references(() => productionAssignments.id).notNull(),
    employeeId: uuid("employee_id").references(() => employees.id).notNull(),
    qtyCompleted: integer("qty_completed").notNull(),
    qtyRejected: integer("qty_rejected").default(0),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
})

// Production Salary - Calculate salary from production
export const productionSalary = pgTable("production_salary", {
    id: uuid("id").primaryKey().defaultRandom(),
    kode: text("kode").unique(),
    employeeId: uuid("employee_id").references(() => employees.id).notNull(),
    assignmentId: uuid("assignment_id").references(() => productionAssignments.id),
    totalCompleted: integer("total_completed").default(0),
    totalRejected: integer("total_rejected").default(0),
    totalAccepted: integer("total_accepted").default(0),
    ratePerUnit: decimal("rate_per_unit", { precision: 10, scale: 2 }).default("0"),
    totalSalary: decimal("total_salary", { precision: 12, scale: 2 }).default("0"),
    periodStart: timestamp("period_start"),
    periodEnd: timestamp("period_end"),
    status: text("status").default("PENDING"),
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").defaultNow(),
})

// Teams
export const teams = pgTable("teams", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    leaderName: text("leader_name"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
})

// Employees
export const employees = pgTable("employees", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id"),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    role: text("role").default("KARYAWAN"),
    teamId: uuid("team_id").references(() => teams.id),
    employmentType: text("employment_type").default("HARIAN"),
    baseSalary: integer("base_salary").default(0),
    ratePerUnit: integer("rate_per_unit").default(0),
    pin: text("pin"),
    qrCode: text("qr_code").unique(),
    isActive: boolean("is_active").default(true),
    lastLogin: timestamp("last_login"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
})

// Job Orders
export const jobOrders = pgTable("job_orders", {
    id: uuid("id").primaryKey().defaultRandom(),
    joNumber: text("jo_number").notNull().unique(),
    qrCode: text("qr_code").unique(),
    productId: uuid("product_id"),
    teamId: uuid("team_id").references(() => teams.id),
    qcEmployeeId: uuid("qc_employee_id").references(() => employees.id),
    targetQty: integer("target_qty").notNull(),
    completedQty: integer("completed_qty").default(0),
    rejectedQty: integer("rejected_qty").default(0),
    status: text("status").default("DRAFT"),
    dueDate: timestamp("due_date"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  })

// Transfers
export const transfers = pgTable("transfers", {
    id: uuid("id").primaryKey().defaultRandom(),
    transferNumber: text("transfer_number").notNull().unique(),
    type: text("type").notNull(),
    fromWarehouseId: uuid("from_warehouse_id").references(() => warehouses.id),
    toWarehouseId: uuid("to_warehouse_id").references(() => warehouses.id),
    status: text("status").default("PENDING"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
})

// Transfer Items
export const transferItems = pgTable("transfer_items", {
    id: uuid("id").primaryKey().defaultRandom(),
    transferId: uuid("transfer_id").references(() => transfers.id),
    productId: uuid("product_id"),
    skuCode: text("sku_code"),
    skuName: text("sku_name"),
    quantity: integer("quantity").notNull(),
    unit: text("unit").default("Pcs"),
    createdAt: timestamp("created_at").defaultNow(),
})

// Transfer Photos - Documentation photos for transfers
export const transferPhotos = pgTable("transfer_photos", {
    id: uuid("id").primaryKey().defaultRandom(),
    transferId: uuid("transfer_id").references(() => transfers.id, { onDelete: "cascade" }).notNull(),
    photoData: text("photo_data").notNull(),
    label: text("label").notNull(),
    timestamp: timestamp("timestamp").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
})

// QC Reports
export const qcReports = pgTable("qc_reports", {
    id: uuid("id").primaryKey().defaultRandom(),
    jobOrderId: uuid("job_order_id").references(() => jobOrders.id),
    employeeId: uuid("employee_id").references(() => employees.id),
    successQty: integer("success_qty").default(0),
    rejectQty: integer("reject_qty").default(0),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
})

// Salaries
export const salaries = pgTable("salaries", {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: uuid("employee_id").references(() => employees.id),
    period: text("period").notNull(),
    baseSalary: integer("base_salary").default(0),
    totalAllowances: integer("total_allowances").default(0),
    totalDeductions: integer("total_deductions").default(0),
    totalSalary: integer("total_salary").default(0),
    status: text("status").default("PENDING"),
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
})

// Production Logs - Individual output tracking
export const productionLogs = pgTable("production_logs", {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: uuid("employee_id").references(() => employees.id),
    jobOrderId: uuid("job_order_id").references(() => jobOrders.id),
    completedQty: integer("completed_qty").notNull(),
    unit: text("unit").default("Pcs"),
    periodWeek: text("period_week").notNull(),
    periodYear: integer("period_year").notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at").defaultNow(),
})

// Salary Components (for dynamic payroll)
export const salaryComponents = pgTable("salary_components", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    calculationType: text("calculation_type").notNull(),
    amount: integer("amount"),
    percentage: decimal("percentage", { precision: 5, scale: 2 }),
    formula: text("formula"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
})

// Advances / Kasbon
export const advances = pgTable("advances", {
    id: uuid("id").primaryKey().defaultRandom(),
    kode: text("kode").unique(),
    employeeId: uuid("employee_id").references(() => employees.id),
    amount: integer("amount").notNull(),
    purpose: text("purpose"),
    status: text("status").default("PENDING"),
    paidAmount: integer("paid_amount").default(0),
    remark: text("remark"),
    paymentHistory: text("payment_history").default("[]"), // JSON array of payments
    approvedBy: text("approved_by"),
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
})

// Assets
export const assets = pgTable("assets", {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    category: text("category").default("MACHINE"),
    location: text("location"),
    purchaseDate: timestamp("purchase_date"),
    purchaseValue: integer("purchase_value").default(0),
    status: text("status").default("ACTIVE"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
})

// Asset Maintenance
export const assetMaintenance = pgTable("asset_maintenance", {
    id: uuid("id").primaryKey().defaultRandom(),
    assetId: uuid("asset_id").references(() => assets.id),
    type: text("type").notNull(),
    scheduledDate: timestamp("scheduled_date"),
    completedDate: timestamp("completed_date"),
    technician: text("technician"),
    cost: integer("cost").default(0),
    notes: text("notes"),
    status: text("status").default("PENDING"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
})

// Transactions (Finance)
export const transactions = pgTable("transactions", {
    id: uuid("id").primaryKey().defaultRandom(),
    kode: text("kode").unique(),
    date: timestamp("date").defaultNow(),
    type: text("type").notNull(),
    category: text("category").notNull(),
    amount: integer("amount").notNull(),
    description: text("description"),
    reference: text("reference"),
    jobOrderId: uuid("job_order_id").references(() => jobOrders.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
})

// Suppliers
export const suppliers = pgTable("suppliers", {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    contactPerson: text("contact_person"),
    phone: text("phone"),
    address: text("address"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
})

// Cost Categories
export const costCategories = pgTable("cost_categories", {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
})

// Job Order Costs - Estimasi & Aktual HPP per JO per Kategori Biaya
export const jobOrderCosts = pgTable("job_order_costs", {
    id: uuid("id").primaryKey().defaultRandom(),
    jobOrderId: uuid("job_order_id").references(() => jobOrders.id, { onDelete: "cascade" }).notNull(),
    costCategoryCode: text("cost_category_code").notNull(),
    costCategoryName: text("cost_category_name"),
    type: text("type").notNull(), // DIRECT / INDIRECT
    estimatedAmount: integer("estimated_amount").default(0).notNull(),
    actualAmount: integer("actual_amount").default(0).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
})

// Rejects
export const rejects = pgTable("rejects", {
    id: uuid("id").primaryKey().defaultRandom(),
    jobOrderId: uuid("job_order_id").references(() => jobOrders.id),
    productId: uuid("product_id").references(() => products.id),
    qcReportId: uuid("qc_report_id").references(() => qcReports.id),
    quantity: integer("quantity").notNull(),
    unit: text("unit").default("Pcs"),
    reason: text("reason").notNull(),
    description: text("description"),
    status: text("status").default("PENDING"),
    resolution: text("resolution"),
    resolvedBy: text("resolved_by"),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
})

// Notification Preferences
export const notificationPreferences = pgTable("notification_preferences", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    emailOrderComplete: boolean("email_order_complete").default(true),
    emailTransferIn: boolean("email_transfer_in").default(true),
    emailTransferOut: boolean("email_transfer_out").default(false),
    emailLowStock: boolean("email_low_stock").default(true),
    pushOrderComplete: boolean("push_order_complete").default(true),
    pushTransferIn: boolean("push_transfer_in").default(true),
    pushTransferOut: boolean("push_transfer_out").default(true),
    pushLowStock: boolean("push_low_stock").default(false),
    smsOrderComplete: boolean("sms_order_complete").default(false),
    smsTransferIn: boolean("sms_transfer_in").default(false),
    smsTransferOut: boolean("sms_transfer_out").default(false),
    smsLowStock: boolean("sms_low_stock").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
})

// Push Subscriptions (FCM tokens per user)
export const pushSubscriptions = pgTable("push_subscriptions", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    token: text("token").notNull().unique(),
    device: text("device").default("browser"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
})

// Notifications
export const notifications = pgTable("notifications", {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: uuid("employee_id").references(() => employees.id),
    actorId: uuid("actor_id").references(() => employees.id),
    type: text("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    reference: text("reference"),
    referenceId: text("reference_id"),
    isRead: boolean("is_read").default(false),
    createdAt: timestamp("created_at").defaultNow(),
})

// Inventory Stock - Real-time stock per product per warehouse
export const inventoryStock = pgTable("inventory_stock", {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id").references(() => products.id),
    warehouseId: uuid("warehouse_id").references(() => warehouses.id),
    quantity: integer("quantity").default(0),
    reservedQty: integer("reserved_qty").default(0),
    updatedAt: timestamp("updated_at").defaultNow(),
})

// Inventory Movements - Track all stock changes
export const inventoryMovements = pgTable("inventory_movements", {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id").references(() => products.id),
    warehouseId: uuid("warehouse_id").references(() => warehouses.id),
    type: text("type").notNull(), // IN, OUT, ADJUSTMENT, QC_COMPLETE, REJECT
    quantity: integer("quantity").notNull(),
    reference: text("reference"), // TRANSFER, QC_REPORT, REJECT, MANUAL
    referenceId: text("reference_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
})

// App Settings
export const appSettings = pgTable("app_settings", {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull().unique(),
    value: text("value"),
    updatedAt: timestamp("updated_at").defaultNow(),
})
