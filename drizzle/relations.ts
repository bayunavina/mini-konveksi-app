import { relations } from "drizzle-orm/relations";
import { products, inventory, warehouses, assets, assetMaintenance, jobOrders, qcReports, employees, teams, salaries, transfers, transferItems, user, session, account, productionLogs, advances, inventoryStock, inventoryMovements, materialLots, productionFromMaterials, rejects, notifications, productionAssignments, productionProgress, productionSalary, transferPhotos } from "./schema";

export const inventoryRelations = relations(inventory, ({one}) => ({
	product: one(products, {
		fields: [inventory.productId],
		references: [products.id]
	}),
	warehouse: one(warehouses, {
		fields: [inventory.warehouseId],
		references: [warehouses.id]
	}),
}));

export const productsRelations = relations(products, ({many}) => ({
	inventories: many(inventory),
	inventoryStocks: many(inventoryStock),
	inventoryMovements: many(inventoryMovements),
	productionFromMaterials: many(productionFromMaterials),
	rejects: many(rejects),
}));

export const warehousesRelations = relations(warehouses, ({many}) => ({
	inventories: many(inventory),
	transfers_fromWarehouseId: many(transfers, {
		relationName: "transfers_fromWarehouseId_warehouses_id"
	}),
	transfers_toWarehouseId: many(transfers, {
		relationName: "transfers_toWarehouseId_warehouses_id"
	}),
	inventoryStocks: many(inventoryStock),
	inventoryMovements: many(inventoryMovements),
}));

export const assetMaintenanceRelations = relations(assetMaintenance, ({one}) => ({
	asset: one(assets, {
		fields: [assetMaintenance.assetId],
		references: [assets.id]
	}),
}));

export const assetsRelations = relations(assets, ({many}) => ({
	assetMaintenances: many(assetMaintenance),
}));

export const qcReportsRelations = relations(qcReports, ({one, many}) => ({
	jobOrder: one(jobOrders, {
		fields: [qcReports.jobOrderId],
		references: [jobOrders.id]
	}),
	employee: one(employees, {
		fields: [qcReports.employeeId],
		references: [employees.id]
	}),
	rejects: many(rejects),
}));

export const jobOrdersRelations = relations(jobOrders, ({one, many}) => ({
	qcReports: many(qcReports),
	team: one(teams, {
		fields: [jobOrders.teamId],
		references: [teams.id]
	}),
	employee: one(employees, {
		fields: [jobOrders.qcEmployeeId],
		references: [employees.id]
	}),
	productionLogs: many(productionLogs),
	rejects: many(rejects),
	productionAssignments: many(productionAssignments),
}));

export const employeesRelations = relations(employees, ({one, many}) => ({
	qcReports: many(qcReports),
	jobOrders: many(jobOrders),
	team: one(teams, {
		fields: [employees.teamId],
		references: [teams.id]
	}),
	salaries: many(salaries),
	productionLogs: many(productionLogs),
	advances: many(advances),
	notifications: many(notifications),
	productionProgresses: many(productionProgress),
	productionSalaries: many(productionSalary),
	productionAssignments: many(productionAssignments),
}));

export const teamsRelations = relations(teams, ({many}) => ({
	jobOrders: many(jobOrders),
	employees: many(employees),
}));

export const salariesRelations = relations(salaries, ({one}) => ({
	employee: one(employees, {
		fields: [salaries.employeeId],
		references: [employees.id]
	}),
}));

export const transferItemsRelations = relations(transferItems, ({one}) => ({
	transfer: one(transfers, {
		fields: [transferItems.transferId],
		references: [transfers.id]
	}),
}));

export const transfersRelations = relations(transfers, ({one, many}) => ({
	transferItems: many(transferItems),
	transferPhotos: many(transferPhotos),
	warehouse_fromWarehouseId: one(warehouses, {
		fields: [transfers.fromWarehouseId],
		references: [warehouses.id],
		relationName: "transfers_fromWarehouseId_warehouses_id"
	}),
	warehouse_toWarehouseId: one(warehouses, {
		fields: [transfers.toWarehouseId],
		references: [warehouses.id],
		relationName: "transfers_toWarehouseId_warehouses_id"
	}),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	sessions: many(session),
	accounts: many(account),
}));

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const productionLogsRelations = relations(productionLogs, ({one}) => ({
	employee: one(employees, {
		fields: [productionLogs.employeeId],
		references: [employees.id]
	}),
	jobOrder: one(jobOrders, {
		fields: [productionLogs.jobOrderId],
		references: [jobOrders.id]
	}),
}));

export const advancesRelations = relations(advances, ({one}) => ({
	employee: one(employees, {
		fields: [advances.employeeId],
		references: [employees.id]
	}),
}));

export const inventoryStockRelations = relations(inventoryStock, ({one}) => ({
	product: one(products, {
		fields: [inventoryStock.productId],
		references: [products.id]
	}),
	warehouse: one(warehouses, {
		fields: [inventoryStock.warehouseId],
		references: [warehouses.id]
	}),
}));

export const inventoryMovementsRelations = relations(inventoryMovements, ({one}) => ({
	product: one(products, {
		fields: [inventoryMovements.productId],
		references: [products.id]
	}),
	warehouse: one(warehouses, {
		fields: [inventoryMovements.warehouseId],
		references: [warehouses.id]
	}),
}));

export const productionFromMaterialsRelations = relations(productionFromMaterials, ({one}) => ({
	materialLot: one(materialLots, {
		fields: [productionFromMaterials.lotId],
		references: [materialLots.id]
	}),
	product: one(products, {
		fields: [productionFromMaterials.productId],
		references: [products.id]
	}),
}));

export const materialLotsRelations = relations(materialLots, ({many}) => ({
	productionFromMaterials: many(productionFromMaterials),
	productionAssignments: many(productionAssignments),
}));

export const rejectsRelations = relations(rejects, ({one}) => ({
	jobOrder: one(jobOrders, {
		fields: [rejects.jobOrderId],
		references: [jobOrders.id]
	}),
	product: one(products, {
		fields: [rejects.productId],
		references: [products.id]
	}),
	qcReport: one(qcReports, {
		fields: [rejects.qcReportId],
		references: [qcReports.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	employee: one(employees, {
		fields: [notifications.employeeId],
		references: [employees.id]
	}),
}));

export const productionProgressRelations = relations(productionProgress, ({one}) => ({
	productionAssignment: one(productionAssignments, {
		fields: [productionProgress.assignmentId],
		references: [productionAssignments.id]
	}),
	employee: one(employees, {
		fields: [productionProgress.employeeId],
		references: [employees.id]
	}),
}));

export const productionAssignmentsRelations = relations(productionAssignments, ({one, many}) => ({
	productionProgresses: many(productionProgress),
	productionSalaries: many(productionSalary),
	jobOrder: one(jobOrders, {
		fields: [productionAssignments.jobOrderId],
		references: [jobOrders.id]
	}),
	materialLot: one(materialLots, {
		fields: [productionAssignments.materialLotId],
		references: [materialLots.id]
	}),
	employee: one(employees, {
		fields: [productionAssignments.employeeId],
		references: [employees.id]
	}),
}));

export const productionSalaryRelations = relations(productionSalary, ({one}) => ({
	employee: one(employees, {
		fields: [productionSalary.employeeId],
		references: [employees.id]
	}),
	productionAssignment: one(productionAssignments, {
		fields: [productionSalary.assignmentId],
		references: [productionAssignments.id]
	}),
}));
export const transferPhotosRelations = relations(transferPhotos, ({one}) => ({
	transfer: one(transfers, {
		fields: [transferPhotos.transferId],
		references: [transfers.id]
	}),
}));
