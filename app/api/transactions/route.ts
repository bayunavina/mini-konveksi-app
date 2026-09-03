import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { transactions, jobOrderCosts } from "@/db/schema"
import { desc, eq, and, gte, lte, sql } from "drizzle-orm"
import { getSessionFromHeaders } from "@/lib/auth-utils"
import { sendNotificationToAdmin } from "@/lib/notification-utils"
import { formatCurrencyServer } from "@/lib/server-currency"
import { SUPERADMIN_EMAIL } from "@/lib/constants"

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const jobOrderId = searchParams.get("jobOrderId")
    const limit = Math.min(parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10), MAX_LIMIT)
    const offset = parseInt(searchParams.get("offset") || "0", 10)

    const conditions: any[] = []
    if (type && type !== "all") {
      conditions.push(eq(transactions.type, type))
    }
    if (jobOrderId) {
      conditions.push(eq(transactions.jobOrderId, jobOrderId))
    }
    if (startDate) {
      conditions.push(gte(transactions.date, new Date(startDate)))
    }
    if (endDate) {
      conditions.push(lte(transactions.date, new Date(endDate)))
    }

    const allTransactions = await db
      .select()
      .from(transactions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(transactions.date))
      .limit(limit)
      .offset(offset)

    return NextResponse.json(allTransactions)
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, type, category, amount, description, reference, jobOrderId } = body

    const newTransaction = await db.insert(transactions).values({
      date: date ? new Date(date) : new Date(),
      type,
      category,
      amount,
      description,
      reference,
      jobOrderId: jobOrderId || null,
    }).returning()

    // auto update actualAmount di job_order_costs jika terhubung JO
    if (jobOrderId && type === "EXPENSE" && category) {
      try {
        await db
          .update(jobOrderCosts)
          .set({ actualAmount: sql`${jobOrderCosts.actualAmount} + ${Number(amount) || 0}`, updatedAt: new Date() })
          .where(and(eq(jobOrderCosts.jobOrderId, jobOrderId), eq(jobOrderCosts.costCategoryCode, category)))

        // jika belum ada row, buat baru dengan actual
        const check = await db.select().from(jobOrderCosts).where(and(eq(jobOrderCosts.jobOrderId, jobOrderId), eq(jobOrderCosts.costCategoryCode, category)))
        if (check.length === 0) {
          await db.insert(jobOrderCosts).values({
            jobOrderId,
            costCategoryCode: category,
            costCategoryName: category,
            type: "DIRECT",
            estimatedAmount: 0,
            actualAmount: Number(amount) || 0,
          })
        }
      } catch (e) {
        console.error("Failed to update job_order_costs:", e)
      }
    }

    const transactionType = type === "INCOME" ? "Pemasukan" : "Pengeluaran"
    const typeIcon = type === "INCOME" ? "TRANSACTION_INCOME" : "TRANSACTION_EXPENSE"

    await sendNotificationToAdmin(
      typeIcon as "TRANSACTION_INCOME" | "TRANSACTION_EXPENSE",
      "Transaksi Baru",
      `${transactionType}: ${await formatCurrencyServer(Number(amount || 0))} - ${description || "-"}`,
      "TRANSACTION",
      newTransaction[0].id,
      { amount, description }
    )

    return NextResponse.json(newTransaction[0], { status: 201 })
  } catch (error) {
    console.error("Error creating transaction:", error)
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSessionFromHeaders(request.headers)
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Please login" }, { status: 401 })
    }

    const userEmail = session.user.email

    if (userEmail !== SUPERADMIN_EMAIL) {
      return NextResponse.json({ 
        error: "Forbidden - Only superadmin can reset transactions" 
      }, { status: 403 })
    }

    await db.delete(transactions)

    return NextResponse.json({ 
      success: true, 
      message: "All transactions have been reset" 
    })
  } catch (error) {
    console.error("Error resetting transactions:", error)
    return NextResponse.json({ error: "Failed to reset transactions" }, { status: 500 })
  }
}