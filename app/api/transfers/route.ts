import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { transfers, transferItems, transferPhotos } from "@/db/schema"
import { desc, eq } from "drizzle-orm"
import { sendNotificationToGudang, sendNotificationToAdmin } from "@/lib/notification-utils"
import { getActorEmployeeId } from "@/lib/auth-utils"
import { PERMISSION } from "@/lib/constants"
import { requirePermission, requireAnyPermission } from "@/lib/rbac"

function generateTransferNumber(type: string): string {
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2)
  const month = (now.getMonth() + 1).toString().padStart(2, "0")
  const day = now.getDate().toString().padStart(2, "0")
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  const prefix = type === "INCOMING" ? "TRF-IN" : type === "OUTGOING" ? "TRF-OUT" : "TRF"
  return `${prefix}-${year}${month}${day}-${random}`
}

async function getSessionRole(headers: Headers): Promise<string> {
  try {
    const session = await fetch("/api/debug-session2", {
      headers: { "Cookie": headers.get("cookie") || "" }
    })
    const sessionData = await session.json()
    return sessionData.user?.role || "GUEST"
  } catch {
    return "GUEST"
  }
}

export async function GET(request: NextRequest) {
  try {
    const role = await getSessionRole(request.headers)
    const permCheck = requireAnyPermission(role, [PERMISSION.BARANG_MASUK_VIEW, PERMISSION.BARANG_KELUAR_VIEW])
    if (!permCheck.authorized) return permCheck.error

    const allTransfers = await db.select().from(transfers).orderBy(desc(transfers.createdAt))
    
    const transfersWithItems = await Promise.all(
      allTransfers.map(async (transfer) => {
        const items = await db
          .select({
            id: transferItems.id,
            productId: transferItems.productId,
            skuCode: transferItems.skuCode,
            skuName: transferItems.skuName,
            quantity: transferItems.quantity,
            unit: transferItems.unit,
          })
          .from(transferItems)
          .where(eq(transferItems.transferId, transfer.id))
        
        const photos = await db
          .select({
            id: transferPhotos.id,
            transferId: transferPhotos.transferId,
            photoData: transferPhotos.photoData,
            label: transferPhotos.label,
            timestamp: transferPhotos.timestamp,
            createdAt: transferPhotos.createdAt,
          })
          .from(transferPhotos)
          .where(eq(transferPhotos.transferId, transfer.id))
        
        return {
          ...transfer,
          items,
          photos,
        }
      })
    )
    
    return NextResponse.json(transfersWithItems)
  } catch (error) {
    console.error("Error fetching transfers:", error)
    return NextResponse.json({ error: "Failed to fetch transfers" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = await getSessionRole(request.headers)
    const body = await request.json()
    const { type } = body
    const requiredPermission = type === "INCOMING" ? PERMISSION.BARANG_MASUK_CREATE : PERMISSION.BARANG_KELUAR_CREATE
    const permCheck = requirePermission(role, requiredPermission)
    if (!permCheck.authorized) return permCheck.error

    const { transferNumber, type: transferType, fromWarehouseId, toWarehouseId, status, notes, items } = body

    const generatedTransferNumber = transferNumber || generateTransferNumber(transferType)

    const newTransfer = await db.insert(transfers).values({
      transferNumber: generatedTransferNumber,
      type: transferType,
      fromWarehouseId: fromWarehouseId || null,
      toWarehouseId: toWarehouseId || null,
      status: status || "PENDING",
      notes,
    }).returning()

    if (items && items.length > 0) {
      await db.insert(transferItems).values(
        items.map((item: { productId?: string; productSku?: string; productName?: string; quantity: number; unit?: string }) => ({
          transferId: newTransfer[0].id,
          productId: item.productId || null,
          skuCode: item.productSku || null,
          skuName: item.productName || null,
          quantity: item.quantity,
          unit: item.unit || "Pcs",
        }))
      )
    }

    const totalQty = items?.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0) || 0
    const transferLabel = transferType === "INCOMING" ? "Barang Masuk" : "Barang Keluar"
    const notificationType = transferType === "INCOMING" ? "TRANSFER_IN" : "TRANSFER_OUT"

    const actorId = await getActorEmployeeId(request.headers)

    await sendNotificationToGudang(
      notificationType as "TRANSFER_IN" | "TRANSFER_OUT",
      `Transfer ${transferLabel}`,
      `${generatedTransferNumber} - ${totalQty} item${items?.length ? ` (${items.length} produk)` : ""}`,
      "TRANSFER",
      newTransfer[0].id,
      { transferNumber: generatedTransferNumber, items: totalQty },
      actorId || undefined
    )

    await sendNotificationToAdmin(
      notificationType as "TRANSFER_IN" | "TRANSFER_OUT",
      `Transfer ${transferLabel}`,
      `${generatedTransferNumber} - ${totalQty} item${items?.length ? ` (${items.length} produk)` : ""}`,
      "TRANSFER",
      newTransfer[0].id,
      { transferNumber: generatedTransferNumber, items: totalQty },
      actorId || undefined
    )

    return NextResponse.json(newTransfer[0], { status: 201 })
  } catch (error) {
    console.error("Error creating transfer:", error)
    return NextResponse.json({ error: "Failed to create transfer", details: String(error) }, { status: 500 })
  }
}
