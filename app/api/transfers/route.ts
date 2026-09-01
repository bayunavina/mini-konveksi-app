import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { transfers, transferItems } from "@/db/schema"
import { desc, eq } from "drizzle-orm"
import { sendNotificationToGudang, sendNotificationToAdmin } from "@/lib/notification-utils"

function generateTransferNumber(type: string): string {
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2)
  const month = (now.getMonth() + 1).toString().padStart(2, "0")
  const day = now.getDate().toString().padStart(2, "0")
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  const prefix = type === "INCOMING" ? "TRF-IN" : type === "OUTGOING" ? "TRF-OUT" : "TRF"
  return `${prefix}-${year}${month}${day}-${random}`
}

export async function GET() {
  try {
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
        
        return {
          ...transfer,
          items,
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
    const body = await request.json()
    const { transferNumber, type, fromWarehouseId, toWarehouseId, status, notes, items } = body

    const generatedTransferNumber = transferNumber || generateTransferNumber(type)

    const newTransfer = await db.insert(transfers).values({
      transferNumber: generatedTransferNumber,
      type,
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
    const transferLabel = type === "INCOMING" ? "Barang Masuk" : "Barang Keluar"
    const notificationType = type === "INCOMING" ? "TRANSFER_IN" : "TRANSFER_OUT"

    await sendNotificationToGudang(
      notificationType as "TRANSFER_IN" | "TRANSFER_OUT",
      `Transfer ${transferLabel}`,
      `${generatedTransferNumber} - ${totalQty} item${items?.length ? ` (${items.length} produk)` : ""}`,
      "TRANSFER",
      newTransfer[0].id
    )

    await sendNotificationToAdmin(
      notificationType as "TRANSFER_IN" | "TRANSFER_OUT",
      `Transfer ${transferLabel}`,
      `${generatedTransferNumber} - ${totalQty} item${items?.length ? ` (${items.length} produk)` : ""}`,
      "TRANSFER",
      newTransfer[0].id
    )

    return NextResponse.json(newTransfer[0], { status: 201 })
  } catch (error) {
    console.error("Error creating transfer:", error)
    return NextResponse.json({ error: "Failed to create transfer", details: String(error) }, { status: 500 })
  }
}
