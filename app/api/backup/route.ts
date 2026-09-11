import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import {
  masterSkus,
  warehouses,
  products,
  inventory,
  materialLots,
  productionFromMaterials,
  productionAssignments,
  productionProgress,
  productionSalary,
  teams,
  employees,
  jobOrders,
  transfers,
  transferItems,
  qcReports,
  salaries,
  productionLogs,
  salaryComponents,
  advances,
  assets,
  assetMaintenance,
  transactions,
  suppliers,
  costCategories,
  rejects,
  notificationPreferences,
  pushSubscriptions,
  notifications,
  inventoryStock,
  inventoryMovements,
  appSettings,
} from "@/db/schema"
import { user, session, account, verification } from "@/db/schema/auth"
import { getSessionFromHeaders } from "@/lib/auth-utils"
import { eq } from "drizzle-orm"

const SUPERADMIN_EMAIL = "erpkonveksi@gmail.com"

async function requireSuperAdmin(request: NextRequest) {
  const sessionData = await getSessionFromHeaders(request.headers)
  if (!sessionData) {
    return { authorized: false, response: NextResponse.json({ error: "Unauthorized - Please login" }, { status: 401 }) }
  }
  const email = sessionData.user.email?.toLowerCase()
  if (email === SUPERADMIN_EMAIL.toLowerCase()) {
    return { authorized: true, email }
  }
  if (email) {
    const emp = await db.select().from(employees).where(eq(employees.email, email)).limit(1)
    if (emp.length > 0 && emp[0].role === "SUPERADMIN") {
      return { authorized: true, email }
    }
  }
  return { authorized: false, response: NextResponse.json({ error: "Forbidden - Khusus Super Admin. Backup/restore tidak bisa dilakukan karena anda bukan superadmin" }, { status: 403 }) }
}

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.authorized) return auth.response!

  try {
    const [
      dataMasterSkus,
      dataWarehouses,
      dataProducts,
      dataInventory,
      dataMaterialLots,
      dataProductionFromMaterials,
      dataProductionAssignments,
      dataProductionProgress,
      dataProductionSalary,
      dataTeams,
      dataEmployees,
      dataJobOrders,
      dataTransfers,
      dataTransferItems,
      dataQcReports,
      dataSalaries,
      dataProductionLogs,
      dataSalaryComponents,
      dataAdvances,
      dataAssets,
      dataAssetMaintenance,
      dataTransactions,
      dataSuppliers,
      dataCostCategories,
      dataRejects,
      dataNotificationPreferences,
      dataPushSubscriptions,
      dataNotifications,
      dataInventoryStock,
      dataInventoryMovements,
      dataAppSettings,
      dataUsers,
      dataSessions,
      dataAccounts,
      dataVerifications,
    ] = await Promise.all([
      db.select().from(masterSkus),
      db.select().from(warehouses),
      db.select().from(products),
      db.select().from(inventory),
      db.select().from(materialLots),
      db.select().from(productionFromMaterials),
      db.select().from(productionAssignments),
      db.select().from(productionProgress),
      db.select().from(productionSalary),
      db.select().from(teams),
      db.select().from(employees),
      db.select().from(jobOrders),
      db.select().from(transfers),
      db.select().from(transferItems),
      db.select().from(qcReports),
      db.select().from(salaries),
      db.select().from(productionLogs),
      db.select().from(salaryComponents),
      db.select().from(advances),
      db.select().from(assets),
      db.select().from(assetMaintenance),
      db.select().from(transactions),
      db.select().from(suppliers),
      db.select().from(costCategories),
      db.select().from(rejects),
      db.select().from(notificationPreferences),
      db.select().from(pushSubscriptions),
      db.select().from(notifications),
      db.select().from(inventoryStock),
      db.select().from(inventoryMovements),
      db.select().from(appSettings),
      db.select().from(user),
      db.select().from(session),
      db.select().from(account),
      db.select().from(verification),
    ])

    const backup = {
      meta: {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        exportedBy: auth.email,
        app: "erp-konveksi-app",
      },
      data: {
        masterSkus: dataMasterSkus,
        warehouses: dataWarehouses,
        products: dataProducts,
        inventory: dataInventory,
        materialLots: dataMaterialLots,
        productionFromMaterials: dataProductionFromMaterials,
        productionAssignments: dataProductionAssignments,
        productionProgress: dataProductionProgress,
        productionSalary: dataProductionSalary,
        teams: dataTeams,
        employees: dataEmployees,
        jobOrders: dataJobOrders,
        transfers: dataTransfers,
        transferItems: dataTransferItems,
        qcReports: dataQcReports,
        salaries: dataSalaries,
        productionLogs: dataProductionLogs,
        salaryComponents: dataSalaryComponents,
        advances: dataAdvances,
        assets: dataAssets,
        assetMaintenance: dataAssetMaintenance,
        transactions: dataTransactions,
        suppliers: dataSuppliers,
        costCategories: dataCostCategories,
        rejects: dataRejects,
        notificationPreferences: dataNotificationPreferences,
        pushSubscriptions: dataPushSubscriptions,
        notifications: dataNotifications,
        inventoryStock: dataInventoryStock,
        inventoryMovements: dataInventoryMovements,
        appSettings: dataAppSettings,
        user: dataUsers,
        session: dataSessions,
        account: dataAccounts,
        verification: dataVerifications,
      },
      counts: {
        masterSkus: dataMasterSkus.length,
        warehouses: dataWarehouses.length,
        products: dataProducts.length,
        inventory: dataInventory.length,
        materialLots: dataMaterialLots.length,
        productionAssignments: dataProductionAssignments.length,
        teams: dataTeams.length,
        employees: dataEmployees.length,
        jobOrders: dataJobOrders.length,
        transfers: dataTransfers.length,
        qcReports: dataQcReports.length,
        transactions: dataTransactions.length,
        notifications: dataNotifications.length,
      }
    }

    // If query param download=true, return as file attachment
    const { searchParams } = new URL(request.url)
    const isDownload = searchParams.get("download") === "true"
    if (isDownload) {
      const filename = `backup-erp-konveksi-${new Date().toISOString().slice(0, 10)}.json`
      return new NextResponse(JSON.stringify(backup, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    }

    return NextResponse.json(backup)
  } catch (error) {
    console.error("Error creating backup:", error)
    return NextResponse.json({ error: "Failed to create backup", details: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.authorized) return auth.response!

  try {
    const body = await request.json()
    // Support both {data: {...}} wrapped or direct backup file payload
    const backupData = body.data || body
    if (!backupData || typeof backupData !== "object") {
      return NextResponse.json({ error: "Invalid backup file - data missing" }, { status: 400 })
    }

    // Detect if it's full backup structure (has data.*)
    const tables = backupData.data || backupData

    // Validate some known tables exist
    const knownKeys = ["employees", "transactions", "jobOrders", "products"]
    const hasAny = knownKeys.some(k => Array.isArray(tables[k]))
    if (!hasAny && !tables.masterSkus) {
      return NextResponse.json({ error: "Invalid backup file - no recognizable tables" }, { status: 400 })
    }

    const mode = body.mode || "merge" // merge or replace

    // If replace, clear existing business data first (but keep admin user if not in backup)
    if (mode === "replace") {
      // Delete in FK-safe order
      await db.delete(productionProgress)
      await db.delete(productionSalary)
      await db.delete(productionAssignments)
      await db.delete(productionFromMaterials)
      await db.delete(productionLogs)
      await db.delete(rejects)
      await db.delete(qcReports)
      await db.delete(transferItems)
      await db.delete(transfers)
      await db.delete(inventoryMovements)
      await db.delete(inventoryStock)
      await db.delete(inventory)
      await db.delete(materialLots)
      await db.delete(salaries)
      await db.delete(advances)
      await db.delete(assetMaintenance)
      await db.delete(assets)
      await db.delete(transactions)
      await db.delete(notifications)
      await db.delete(jobOrders)
      await db.delete(products)
      await db.delete(masterSkus)
      await db.delete(costCategories)
      await db.delete(suppliers)
      await db.delete(warehouses)
      await db.delete(salaryComponents)
      // teams & employees last before appSettings
      // For employees/users, we handle separately to not lock out admin
    }

    // Helper to insert with ignore duplicate (onConflictDoNothing)
    // For simplicity, we do insert with onConflictDoNothing for primary key
    // We'll try batch insert; if fails due to duplicate, we skip

    const restored: Record<string, number> = {}

    // Known timestamp/date fields that should be converted from ISO string to Date
    const dateFields = new Set([
      "date", "createdAt", "updatedAt", "dueDate", "purchaseDate", "scheduledDate", "completedDate",
      "assignedAt", "startedAt", "completedAt", "qcRequestedAt", "periodStart", "periodEnd", "paidAt",
      "lastLogin", "resolvedAt", "expiresAt", "accessTokenExpiresAt", "refreshTokenExpiresAt",
      "created_at", "updated_at", "expires_at", "due_date", "purchase_date", "scheduled_date",
      "completed_date", "assigned_at", "started_at", "completed_at", "qc_requested_at",
      "period_start", "period_end", "paid_at", "last_login", "resolved_at",
    ])

    const normalizeRow = (row: Record<string, any>) => {
      const normalized: Record<string, any> = {}
      for (const [key, value] of Object.entries(row)) {
        if (value === null || value === undefined) {
          normalized[key] = value
        } else if (typeof value === "string" && dateFields.has(key)) {
          // Convert ISO date strings to Date objects for timestamp columns
          const d = new Date(value)
          normalized[key] = isNaN(d.getTime()) ? value : d
        } else {
          normalized[key] = value
        }
      }
      return normalized
    }

    const tryInsert = async (table: any, rows: any[], label: string) => {
      if (!Array.isArray(rows) || rows.length === 0) {
        restored[label] = 0
        return
      }
      try {
        let inserted = 0
        for (const rawRow of rows) {
          const row = normalizeRow(rawRow)
          try {
            await db.insert(table).values(row).onConflictDoNothing()
            inserted++
          } catch (err) {
            console.error(`Insert failed for ${label}:`, err)
            try {
              await db.insert(table).values(row)
              inserted++
            } catch (err2) {
              console.error(`Fallback insert also failed for ${label}:`, err2)
            }
          }
        }
        restored[label] = inserted
      } catch (e) {
        console.error(`Failed to restore ${label}:`, e)
        restored[label] = 0
      }
    }

    // Insert in parent-first order
    if (tables.teams) await tryInsert(teams, tables.teams, "teams")
    if (tables.warehouses) await tryInsert(warehouses, tables.warehouses, "warehouses")
    if (tables.suppliers) await tryInsert(suppliers, tables.suppliers, "suppliers")
    if (tables.costCategories) await tryInsert(costCategories, tables.costCategories, "costCategories")
    if (tables.masterSkus) await tryInsert(masterSkus, tables.masterSkus, "masterSkus")
    if (tables.products) await tryInsert(products, tables.products, "products")
    if (tables.salaryComponents) await tryInsert(salaryComponents, tables.salaryComponents, "salaryComponents")
    if (tables.assets) await tryInsert(assets, tables.assets, "assets")
    if (tables.employees) {
      // Don't overwrite existing superadmin? allow merge
      await tryInsert(employees, tables.employees, "employees")
    }
    if (tables.jobOrders) await tryInsert(jobOrders, tables.jobOrders, "jobOrders")
    if (tables.materialLots) await tryInsert(materialLots, tables.materialLots, "materialLots")
    if (tables.inventory) await tryInsert(inventory, tables.inventory, "inventory")
    if (tables.inventoryStock) await tryInsert(inventoryStock, tables.inventoryStock, "inventoryStock")
    if (tables.transfers) await tryInsert(transfers, tables.transfers, "transfers")
    if (tables.transferItems) await tryInsert(transferItems, tables.transferItems, "transferItems")
    if (tables.qcReports) await tryInsert(qcReports, tables.qcReports, "qcReports")
    if (tables.rejects) await tryInsert(rejects, tables.rejects, "rejects")
    if (tables.productionAssignments) await tryInsert(productionAssignments, tables.productionAssignments, "productionAssignments")
    if (tables.productionProgress) await tryInsert(productionProgress, tables.productionProgress, "productionProgress")
    if (tables.productionFromMaterials) await tryInsert(productionFromMaterials, tables.productionFromMaterials, "productionFromMaterials")
    if (tables.productionLogs) await tryInsert(productionLogs, tables.productionLogs, "productionLogs")
    if (tables.productionSalary) await tryInsert(productionSalary, tables.productionSalary, "productionSalary")
    if (tables.salaries) await tryInsert(salaries, tables.salaries, "salaries")
    if (tables.advances) await tryInsert(advances, tables.advances, "advances")
    if (tables.assetMaintenance) await tryInsert(assetMaintenance, tables.assetMaintenance, "assetMaintenance")
    if (tables.transactions) await tryInsert(transactions, tables.transactions, "transactions")
    if (tables.inventoryMovements) await tryInsert(inventoryMovements, tables.inventoryMovements, "inventoryMovements")
    if (tables.notifications) await tryInsert(notifications, tables.notifications, "notifications")
    if (tables.notificationPreferences) await tryInsert(notificationPreferences, tables.notificationPreferences, "notificationPreferences")
    if (tables.pushSubscriptions) await tryInsert(pushSubscriptions, tables.pushSubscriptions, "pushSubscriptions")
    if (tables.appSettings) await tryInsert(appSettings, tables.appSettings, "appSettings")

    // For auth tables, only restore if explicitly requested and not to break current session
    if (tables.user && mode === "replace") {
      await tryInsert(user, tables.user, "user")
    }
    if (tables.account && mode === "replace") {
      await tryInsert(account, tables.account, "account")
    }

    return NextResponse.json({
      success: true,
      message: `Restore selesai (mode: ${mode})`,
      restored,
    })
  } catch (error) {
    console.error("Error restoring backup:", error)
    return NextResponse.json({ error: "Failed to restore backup", details: String(error) }, { status: 500 })
  }
}
