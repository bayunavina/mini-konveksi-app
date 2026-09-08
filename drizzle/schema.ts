import { pgTable, unique, uuid, text, timestamp, integer, foreignKey, boolean, numeric } from "drizzle-orm/pg-core"



export const assets = pgTable("assets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	category: text().default('MACHINE'),
	location: text(),
	purchaseDate: timestamp("purchase_date", { mode: 'string' }),
	purchaseValue: integer("purchase_value").default(0),
	status: text().default('ACTIVE'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("assets_code_unique").on(table.code),
]);

export const inventory = pgTable("inventory", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id"),
	warehouseId: uuid("warehouse_id"),
	quantity: integer().default(0),
	lotNumber: text("lot_number"),
	location: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "inventory_product_id_products_id_fk"
		}),
	foreignKey({
			columns: [table.warehouseId],
			foreignColumns: [warehouses.id],
			name: "inventory_warehouse_id_warehouses_id_fk"
		}),
]);

export const costCategories = pgTable("cost_categories", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	type: text().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("cost_categories_code_unique").on(table.code),
]);

export const assetMaintenance = pgTable("asset_maintenance", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	assetId: uuid("asset_id"),
	type: text().notNull(),
	scheduledDate: timestamp("scheduled_date", { mode: 'string' }),
	completedDate: timestamp("completed_date", { mode: 'string' }),
	technician: text(),
	cost: integer().default(0),
	notes: text(),
	status: text().default('PENDING'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.assetId],
			foreignColumns: [assets.id],
			name: "asset_maintenance_asset_id_assets_id_fk"
		}),
]);

export const qcReports = pgTable("qc_reports", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	jobOrderId: uuid("job_order_id"),
	employeeId: uuid("employee_id"),
	successQty: integer("success_qty").default(0),
	rejectQty: integer("reject_qty").default(0),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.jobOrderId],
			foreignColumns: [jobOrders.id],
			name: "qc_reports_job_order_id_job_orders_id_fk"
		}),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "qc_reports_employee_id_employees_id_fk"
		}),
]);

export const jobOrders = pgTable("job_orders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	joNumber: text("jo_number").notNull(),
	productId: uuid("product_id"),
	teamId: uuid("team_id"),
	targetQty: integer("target_qty").notNull(),
	completedQty: integer("completed_qty").default(0),
	rejectedQty: integer("rejected_qty").default(0),
	status: text().default('DRAFT'),
	dueDate: timestamp("due_date", { mode: 'string' }),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	qcEmployeeId: uuid("qc_employee_id"),
}, (table) => [
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "job_orders_team_id_teams_id_fk"
		}),
	foreignKey({
			columns: [table.qcEmployeeId],
			foreignColumns: [employees.id],
			name: "job_orders_qc_employee_id_employees_id_fk"
		}),
	unique("job_orders_jo_number_unique").on(table.joNumber),
]);

export const products = pgTable("products", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sku: text().notNull(),
	name: text().notNull(),
	category: text(),
	unit: text().default('Pcs'),
	price: integer().default(0),
	minStock: integer("min_stock").default(0),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	source: text().default('MANUAL'),
	sourceId: text("source_id"),
	notes: text(),
}, (table) => [
	unique("products_sku_unique").on(table.sku),
]);

export const employees = pgTable("employees", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id"),
	name: text().notNull(),
	email: text(),
	phone: text(),
	role: text().default('KARYAWAN'),
	teamId: uuid("team_id"),
	baseSalary: integer("base_salary").default(0),
	ratePerUnit: integer("rate_per_unit").default(0),
	pin: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	lastLogin: timestamp("last_login", { mode: 'string' }),
	employmentType: text("employment_type").default('HARIAN'),
}, (table) => [
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "employees_team_id_teams_id_fk"
		}),
]);

export const suppliers = pgTable("suppliers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	contactPerson: text("contact_person"),
	phone: text(),
	address: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("suppliers_code_unique").on(table.code),
]);

export const salaries = pgTable("salaries", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id"),
	period: text().notNull(),
	baseSalary: integer("base_salary").default(0),
	totalAllowances: integer("total_allowances").default(0),
	totalDeductions: integer("total_deductions").default(0),
	totalSalary: integer("total_salary").default(0),
	status: text().default('PENDING'),
	paidAt: timestamp("paid_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "salaries_employee_id_employees_id_fk"
		}),
]);

export const teams = pgTable("teams", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	leaderName: text("leader_name"),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const transactions = pgTable("transactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	date: timestamp({ mode: 'string' }).defaultNow(),
	type: text().notNull(),
	category: text().notNull(),
	amount: integer().notNull(),
	description: text(),
	reference: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	kode: text(),
}, (table) => [
	unique("transactions_kode_unique").on(table.kode),
]);

export const transferItems = pgTable("transfer_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	transferId: uuid("transfer_id"),
	productId: uuid("product_id"),
	quantity: integer().notNull(),
	unit: text().default('Pcs'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	skuCode: text("sku_code"),
	skuName: text("sku_name"),
}, (table) => [
	foreignKey({
			columns: [table.transferId],
			foreignColumns: [transfers.id],
			name: "transfer_items_transfer_id_transfers_id_fk"
		}),
]);

export const session = pgTable("session", {
	id: text().primaryKey().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	token: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "session_user_id_user_id_fk"
		}).onDelete("cascade"),
	unique("session_token_unique").on(table.token),
]);

export const verification = pgTable("verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
});

export const warehouses = pgTable("warehouses", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	address: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("warehouses_code_unique").on(table.code),
]);

export const user = pgTable("user", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	emailVerified: boolean("email_verified").notNull(),
	image: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
}, (table) => [
	unique("user_email_unique").on(table.email),
]);

export const account = pgTable("account", {
	id: text().primaryKey().notNull(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: 'string' }),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: 'string' }),
	scope: text(),
	password: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "account_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const transfers = pgTable("transfers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	transferNumber: text("transfer_number").notNull(),
	type: text().notNull(),
	fromWarehouseId: uuid("from_warehouse_id"),
	toWarehouseId: uuid("to_warehouse_id"),
	status: text().default('PENDING'),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.fromWarehouseId],
			foreignColumns: [warehouses.id],
			name: "transfers_from_warehouse_id_warehouses_id_fk"
		}),
	foreignKey({
			columns: [table.toWarehouseId],
			foreignColumns: [warehouses.id],
			name: "transfers_to_warehouse_id_warehouses_id_fk"
		}),
	unique("transfers_transfer_number_unique").on(table.transferNumber),
]);

export const productionLogs = pgTable("production_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id"),
	jobOrderId: uuid("job_order_id"),
	completedQty: integer("completed_qty").notNull(),
	unit: text().default('Pcs'),
	periodWeek: text("period_week").notNull(),
	periodYear: integer("period_year").notNull(),
	notes: text(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "production_logs_employee_id_employees_id_fk"
		}),
	foreignKey({
			columns: [table.jobOrderId],
			foreignColumns: [jobOrders.id],
			name: "production_logs_job_order_id_job_orders_id_fk"
		}),
]);

export const advances = pgTable("advances", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id"),
	amount: integer().notNull(),
	purpose: text(),
	status: text().default('PENDING'),
	approvedBy: text("approved_by"),
	paidAt: timestamp("paid_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	kode: text(),
	paidAmount: integer("paid_amount").default(0),
	remark: text(),
	paymentHistory: text("payment_history").default('[]'),
}, (table) => [
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "advances_employee_id_employees_id_fk"
		}),
	unique("advances_kode_unique").on(table.kode),
]);

export const notificationPreferences = pgTable("notification_preferences", {
	id: uuid().defaultRandom().primaryKey().notNull(),
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
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const salaryComponents = pgTable("salary_components", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	type: text().notNull(),
	calculationType: text("calculation_type").notNull(),
	amount: integer(),
	percentage: numeric({ precision: 5, scale:  2 }),
	formula: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const inventoryStock = pgTable("inventory_stock", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id"),
	warehouseId: uuid("warehouse_id"),
	quantity: integer().default(0),
	reservedQty: integer("reserved_qty").default(0),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "inventory_stock_product_id_products_id_fk"
		}),
	foreignKey({
			columns: [table.warehouseId],
			foreignColumns: [warehouses.id],
			name: "inventory_stock_warehouse_id_warehouses_id_fk"
		}),
]);

export const inventoryMovements = pgTable("inventory_movements", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id"),
	warehouseId: uuid("warehouse_id"),
	type: text().notNull(),
	quantity: integer().notNull(),
	reference: text(),
	referenceId: text("reference_id"),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "inventory_movements_product_id_products_id_fk"
		}),
	foreignKey({
			columns: [table.warehouseId],
			foreignColumns: [warehouses.id],
			name: "inventory_movements_warehouse_id_warehouses_id_fk"
		}),
]);

export const productionFromMaterials = pgTable("production_from_materials", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	lotId: uuid("lot_id").notNull(),
	productId: uuid("product_id").notNull(),
	producedQty: integer("produced_qty").notNull(),
	usedQty: integer("used_qty").notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.lotId],
			foreignColumns: [materialLots.id],
			name: "production_from_materials_lot_id_material_lots_id_fk"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "production_from_materials_product_id_products_id_fk"
		}),
]);

export const rejects = pgTable("rejects", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	jobOrderId: uuid("job_order_id"),
	productId: uuid("product_id"),
	qcReportId: uuid("qc_report_id"),
	quantity: integer().notNull(),
	unit: text().default('Pcs'),
	reason: text().notNull(),
	description: text(),
	status: text().default('PENDING'),
	resolution: text(),
	resolvedBy: text("resolved_by"),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.jobOrderId],
			foreignColumns: [jobOrders.id],
			name: "rejects_job_order_id_job_orders_id_fk"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "rejects_product_id_products_id_fk"
		}),
	foreignKey({
			columns: [table.qcReportId],
			foreignColumns: [qcReports.id],
			name: "rejects_qc_report_id_qc_reports_id_fk"
		}),
]);

export const materialLots = pgTable("material_lots", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id").notNull(),
	lotNumber: text("lot_number").notNull(),
	qrCode: text("qr_code").notNull(),
	quantity: integer().default(0).notNull(),
	initialQty: integer("initial_qty").default(0).notNull(),
	status: text().default('AVAILABLE'),
	notes: text(),
	supplier: text("supplier"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	isReadyForProduction: boolean("is_ready_for_production").default(false),
}, (table) => [
	unique("material_lots_lot_number_unique").on(table.lotNumber),
	unique("material_lots_qr_code_unique").on(table.qrCode),
]);

export const notifications = pgTable("notifications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id"),
	type: text().notNull(),
	title: text().notNull(),
	message: text().notNull(),
	reference: text(),
	referenceId: text("reference_id"),
	isRead: boolean("is_read").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "notifications_employee_id_employees_id_fk"
		}),
]);

export const productionProgress = pgTable("production_progress", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	assignmentId: uuid("assignment_id").notNull(),
	employeeId: uuid("employee_id").notNull(),
	qtyCompleted: integer("qty_completed").notNull(),
	qtyRejected: integer("qty_rejected").default(0),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.assignmentId],
			foreignColumns: [productionAssignments.id],
			name: "production_progress_assignment_id_production_assignments_id_fk"
		}),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "production_progress_employee_id_employees_id_fk"
		}),
]);

export const productionSalary = pgTable("production_salary", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id").notNull(),
	assignmentId: uuid("assignment_id"),
	ratePerUnit: numeric("rate_per_unit", { precision: 10, scale:  2 }).default('0'),
	totalSalary: numeric("total_salary", { precision: 12, scale:  2 }).default('0'),
	status: text().default('PENDING'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	totalCompleted: integer("total_completed").default(0),
	totalRejected: integer("total_rejected").default(0),
	totalAccepted: integer("total_accepted").default(0),
	periodStart: timestamp("period_start", { mode: 'string' }),
	periodEnd: timestamp("period_end", { mode: 'string' }),
	paidAt: timestamp("paid_at", { mode: 'string' }),
	kode: text(),
}, (table) => [
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "production_salary_employee_id_employees_id_fk"
		}),
	foreignKey({
			columns: [table.assignmentId],
			foreignColumns: [productionAssignments.id],
			name: "production_salary_assignment_id_production_assignments_id_fk"
		}),
	unique("production_salary_kode_unique").on(table.kode),
]);

export const masterSkus = pgTable("master_skus", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	category: text(),
	unit: text().default('Pcs'),
	price: numeric({ precision: 12, scale:  2 }).default('0'),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("master_skus_code_unique").on(table.code),
]);

export const appSettings = pgTable("app_settings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	key: text().notNull(),
	value: text(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("app_settings_key_unique").on(table.key),
]);

export const productionAssignments = pgTable("production_assignments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	jobOrderId: uuid("job_order_id"),
	materialLotId: uuid("material_lot_id"),
	employeeId: uuid("employee_id").notNull(),
	targetQty: integer("target_qty").notNull(),
	completedQty: integer("completed_qty").default(0),
	rejectedQty: integer("rejected_qty").default(0),
	ratePerUnit: numeric("rate_per_unit", { precision: 10, scale:  2 }).default('0'),
	status: text().default('ASSIGNED'),
	notes: text(),
	assignedAt: timestamp("assigned_at", { mode: 'string' }).defaultNow(),
	startedAt: timestamp("started_at", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	acceptedQty: integer("accepted_qty").default(0),
	pendingQty: integer("pending_qty").default(0),
	qcRequestedAt: timestamp("qc_requested_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.jobOrderId],
			foreignColumns: [jobOrders.id],
			name: "production_assignments_job_order_id_job_orders_id_fk"
		}),
	foreignKey({
			columns: [table.materialLotId],
			foreignColumns: [materialLots.id],
			name: "production_assignments_material_lot_id_material_lots_id_fk"
		}),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "production_assignments_employee_id_employees_id_fk"
		}),
]);

export const transferPhotos = pgTable("transfer_photos", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	transferId: uuid("transfer_id").notNull(),
	photoData: text("photo_data").notNull(),
	label: text().notNull(),
	timestamp: timestamp("timestamp", { mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.transferId],
			foreignColumns: [transfers.id],
			name: "transfer_photos_transfer_id_transfers_id_fk"
		}).onDelete("cascade"),
]);
