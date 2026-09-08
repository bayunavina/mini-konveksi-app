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
  jobOrderCosts,
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
import { eq, not, sql, inArray } from "drizzle-orm"

const SUPERADMIN_EMAIL = "erpkonveksi@gmail.com"
const CONFIRM_TEXT = "FACTORY RESET"

async function requireSuperAdmin(request: NextRequest) {
  const sessionData = await getSessionFromHeaders(request.headers)
  if (!sessionData) {
    return { authorized: false, response: NextResponse.json({ error: "Unauthorized - Silakan login terlebih dahulu" }, { status: 401 }) }
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
  return { authorized: false, response: NextResponse.json({ error: "Forbidden - Khusus Super Admin. Reset tidak bisa dilakukan karena anda bukan superadmin" }, { status: 403 }) }
}

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.authorized) return auth.response!

  try {
    const counts = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(transactions).then(r => Number(r[0]?.count || 0)),
      db.select({ count: sql<number>`count(*)` }).from(jobOrders).then(r => Number(r[0]?.count || 0)),
      db.select({ count: sql<number>`count(*)` }).from(products).then(r => Number(r[0]?.count || 0)),
      db.select({ count: sql<number>`count(*)` }).from(materialLots).then(r => Number(r[0]?.count || 0)),
      db.select({ count: sql<number>`count(*)` }).from(productionAssignments).then(r => Number(r[0]?.count || 0)),
      db.select({ count: sql<number>`count(*)` }).from(qcReports).then(r => Number(r[0]?.count || 0)),
      db.select({ count: sql<number>`count(*)` }).from(transfers).then(r => Number(r[0]?.count || 0)),
      db.select({ count: sql<number>`count(*)` }).from(employees).then(r => Number(r[0]?.count || 0)),
      db.select({ count: sql<number>`count(*)` }).from(inventoryMovements).then(r => Number(r[0]?.count || 0)),
      db.select({ count: sql<number>`count(*)` }).from(notifications).then(r => Number(r[0]?.count || 0)),
      db.select({ count: sql<number>`count(*)` }).from(salaries).then(r => Number(r[0]?.count || 0)),
      db.select({ count: sql<number>`count(*)` }).from(advances).then(r => Number(r[0]?.count || 0)),
      db.select({ count: sql<number>`count(*)` }).from(assets).then(r => Number(r[0]?.count || 0)),
      db.select({ count: sql<number>`count(*)` }).from(masterSkus).then(r => Number(r[0]?.count || 0)),
      db.select({ count: sql<number>`count(*)` }).from(suppliers).then(r => Number(r[0]?.count || 0)),
      db.select({ count: sql<number>`count(*)` }).from(costCategories).then(r => Number(r[0]?.count || 0)),
    ])

    return NextResponse.json({
      preview: {
        transactions: counts[0],
        jobOrders: counts[1],
        products: counts[2],
        materialLots: counts[3],
        productionAssignments: counts[4],
        qcReports: counts[5],
        transfers: counts[6],
        employees: counts[7],
        inventoryMovements: counts[8],
        notifications: counts[9],
        salaries: counts[10],
        advances: counts[11],
        assets: counts[12],
        // Master data - ditampilkan tapi DIJAGA (tidak dihapus)
        masterSkus: counts[13],
        suppliers: counts[14],
        costCategories: counts[15],
      },
      warning: "Factory reset akan menghapus SEMUA data bisnis (transaksi, produksi, inventory, karyawan, dll). Data Master (Bahan Baku, Supplier, Kategori Biaya) DIJAGA dan TIDAK dihapus. Akun superadmin (erpkonveksi@gmail.com) akan dipertahankan.",
      confirmText: CONFIRM_TEXT,
    })
  } catch (error) {
    console.error("Error preview factory reset:", error)
    return NextResponse.json({ error: "Failed to preview" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.authorized) return auth.response!

  try {
    const body = await request.json().catch(() => ({}))
    const { confirmText, scope = "all" } = body as { confirmText?: string; scope?: string }

    if (confirmText !== CONFIRM_TEXT) {
      return NextResponse.json({ error: `Konfirmasi salah. Ketik "${CONFIRM_TEXT}" untuk melanjutkan.` }, { status: 400 })
    }

    // For scope "all", delete everything except superadmin
    // We must delete in FK-safe order (children first)

    const deleted: Record<string, number> = {}

    const countAndDelete = async (table: any, label: string, whereClause?: any) => {
      try {
        const before = await db.select({ count: sql<number>`count(*)` }).from(table).then(r => Number(r[0]?.count || 0))
        if (whereClause) {
          await db.delete(table).where(whereClause)
        } else {
          await db.delete(table)
        }
        deleted[label] = before
      } catch (e) {
        console.error(`Failed to delete ${label}:`, e)
        deleted[label] = -1
      }
    }

    if (scope === "all" || scope === "factory") {
      // Child tables first
      await countAndDelete(productionProgress, "productionProgress")
      await countAndDelete(productionSalary, "productionSalary")
      await countAndDelete(productionLogs, "productionLogs")
      await countAndDelete(productionFromMaterials, "productionFromMaterials")
      await countAndDelete(productionAssignments, "productionAssignments")
      await countAndDelete(rejects, "rejects")
      await countAndDelete(qcReports, "qcReports")
      await countAndDelete(transferItems, "transferItems")
      await countAndDelete(transfers, "transfers")
      await countAndDelete(inventoryMovements, "inventoryMovements")
      await countAndDelete(inventoryStock, "inventoryStock")
      await countAndDelete(inventory, "inventory")
      await countAndDelete(materialLots, "materialLots")
      await countAndDelete(salaries, "salaries")
      await countAndDelete(advances, "advances")
      await countAndDelete(assetMaintenance, "assetMaintenance")
      await countAndDelete(assets, "assets")
      await countAndDelete(transactions, "transactions")
      await countAndDelete(notifications, "notifications")
      await countAndDelete(pushSubscriptions, "pushSubscriptions")
      await countAndDelete(notificationPreferences, "notificationPreferences")
      await countAndDelete(inventoryMovements, "inventoryMovements_2") // already done
      await countAndDelete(jobOrders, "jobOrders")
      await countAndDelete(products, "products")
      // MASTER DATA DIPERTAHANKAN saat factory reset (policy: data master bersifat persisten)
      // Data master hanya berubah jika: (1) user mengubah langsung, (2) restore backup dengan mode replace
      // await countAndDelete(masterSkus, "masterSkus")
      // await countAndDelete(costCategories, "costCategories")
      // await countAndDelete(suppliers, "suppliers")
      await countAndDelete(warehouses, "warehouses")
      await countAndDelete(salaryComponents, "salaryComponents")

      // Teams - delete after employees? Actually employees references teams, so delete employees first
      // Preserve superadmin employee
      const superadminEmployees = await db.select().from(employees).where(eq(employees.email, SUPERADMIN_EMAIL))
      const superadminEmployeeIds = superadminEmployees.map(e => e.id)

      // Delete employees except superadmin
      try {
        const empCount = await db.select({ count: sql<number>`count(*)` }).from(employees).then(r => Number(r[0]?.count || 0))
        if (superadminEmployeeIds.length > 0) {
          await db.delete(employees).where(not(inArray(employees.id, superadminEmployeeIds)))
        } else {
          await db.delete(employees)
        }
        deleted["employees"] = empCount - superadminEmployeeIds.length
        deleted["employees_kept"] = superadminEmployeeIds.length
      } catch (e) {
        console.error("Failed to delete employees:", e)
      }

      await countAndDelete(teams, "teams")

      // App settings - reset but keep structure (delete all)
      await countAndDelete(appSettings, "appSettings")

      // Also clear verification tokens and sessions for non-superadmin users
      // Keep superadmin user/account/session
      try {
        const superadminUsers = await db.select().from(user).where(eq(user.email, SUPERADMIN_EMAIL))
        const superadminUserIds = superadminUsers.map(u => u.id)
        
        if (superadminUserIds.length > 0) {
          // Delete sessions except superadmin
          const allSessions = await db.select().from(session)
          const sessionsToDelete = allSessions.filter(s => !superadminUserIds.includes(s.userId))
          for (const s of sessionsToDelete) {
            await db.delete(session).where(eq(session.id, s.id))
          }
          deleted["sessions"] = sessionsToDelete.length
          deleted["sessions_kept"] = allSessions.length - sessionsToDelete.length

          // Delete accounts except superadmin
          const allAccounts = await db.select().from(account)
          const accountsToDelete = allAccounts.filter(a => !superadminUserIds.includes(a.userId))
          for (const a of accountsToDelete) {
            await db.delete(account).where(eq(account.id, a.id))
          }
          deleted["accounts"] = accountsToDelete.length
          deleted["accounts_kept"] = allAccounts.length - accountsToDelete.length

          // Delete users except superadmin
          const allUsers = await db.select({ count: sql<number>`count(*)` }).from(user).then(r => Number(r[0]?.count || 0))
          await db.delete(user).where(not(inArray(user.id, superadminUserIds)))
          deleted["users"] = allUsers - superadminUserIds.length
          deleted["users_kept"] = superadminUserIds.length
        } else {
          // No superadmin user found, keep all users to avoid lockout - just clear business data
          deleted["users"] = 0
          deleted["sessions"] = 0
          deleted["accounts"] = 0
        }
        // Clear verifications
        await countAndDelete(verification, "verification")
      } catch (e) {
        console.error("Failed to clean auth tables:", e)
      }

      return NextResponse.json({
        success: true,
        message: "Factory reset berhasil. Semua data bisnis telah dihapus. Data Master (Bahan Baku, Supplier, Kategori Biaya) DIJAGA. Akun superadmin dipertahankan.",
        deleted,
        scope: "all",
      })
    }

    // Other scopes
    if (scope === "transactions") {
      await countAndDelete(transactions, "transactions")
      return NextResponse.json({ success: true, message: "Data transaksi berhasil dihapus", deleted, scope })
    }

    if (scope === "production") {
      // Kumpulkan relasi dulu sebelum dihapus (untuk restore lot + bersih notifikasi)
      const allAssignments = await db.select({ id: productionAssignments.id, materialLotId: productionAssignments.materialLotId }).from(productionAssignments)
      const affectedLotIds = [...new Set(allAssignments.map((a) => a.materialLotId).filter((v): v is string => !!v))]
      const allQc = await db.select({ id: qcReports.id }).from(qcReports)
      const qcIds = allQc.map((q) => q.id)
      const allJOs = await db.select({ id: jobOrders.id, joNumber: jobOrders.joNumber }).from(jobOrders)
      const joRefIds = [...allJOs.map((j) => j.id), ...allJOs.map((j) => j.joNumber), ...qcIds]

      await countAndDelete(productionProgress, "productionProgress")
      await countAndDelete(productionSalary, "productionSalary")
      await countAndDelete(productionAssignments, "productionAssignments")
      await countAndDelete(qcReports, "qcReports")
      await countAndDelete(rejects, "rejects")
      await countAndDelete(productionLogs, "productionLogs")
      // JO dipertahankan untuk siklus baru: kembali ke DRAFT 0/0
      await db.update(jobOrders).set({ completedQty: 0, rejectedQty: 0, status: "DRAFT", updatedAt: new Date() })
      deleted["jobOrdersReset"] = allJOs.length
      // Biaya aktual HPP di-nol-kan (estimasi dipertahankan untuk siklus baru)
      await db.update(jobOrderCosts).set({ actualAmount: 0, updatedAt: new Date() })
      // Kembalikan lot yang terpakai produksi ke stok awal (hanya yang terdampak)
      if (affectedLotIds.length > 0) {
        await db
          .update(materialLots)
          .set({
            quantity: sql`${materialLots.initialQty}`,
            status: "AVAILABLE",
            isReadyForProduction: true,
            updatedAt: new Date(),
          })
          .where(inArray(materialLots.id, affectedLotIds))
        deleted["materialLotsRestored"] = affectedLotIds.length
      }
      // Bersihkan notifikasi & movements yang merujuk JO/QC tersebut
      if (joRefIds.length > 0) {
        await db.delete(notifications).where(inArray(notifications.referenceId, joRefIds))
        await db.delete(inventoryMovements).where(inArray(inventoryMovements.referenceId, joRefIds))
      }
      return NextResponse.json({ success: true, message: "Data produksi berhasil di-reset. JO kembali ke DRAFT, lot terpakai dikembalikan ke stok awal, biaya aktual di-nol-kan.", deleted, scope })
    }

    if (scope === "inventory") {
      await countAndDelete(inventoryMovements, "inventoryMovements")
      await countAndDelete(inventoryStock, "inventoryStock")
      await countAndDelete(inventory, "inventory")
      await countAndDelete(materialLots, "materialLots")
      await countAndDelete(transfers, "transfers")
      await countAndDelete(transferItems, "transferItems")
      return NextResponse.json({ success: true, message: "Data inventory berhasil dihapus", deleted, scope })
    }

    return NextResponse.json({ error: "Scope tidak valid. Gunakan: all, transactions, production, inventory" }, { status: 400 })
  } catch (error) {
    console.error("Error factory reset:", error)
    return NextResponse.json({ error: "Failed to factory reset", details: String(error) }, { status: 500 })
  }
}
