import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { transactions } from "@/db/schema"
import { desc } from "drizzle-orm"
import { getSessionFromHeaders } from "@/lib/auth-utils"
import { sendNotificationToAdmin } from "@/lib/notification-utils"
import { formatCurrencyServer } from "@/lib/server-currency"

const SUPERADMIN_EMAIL = "erpkonveksi@gmail.com"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    let allTransactions = await db.select().from(transactions).orderBy(desc(transactions.date))

    if (type && type !== "all") {
      allTransactions = allTransactions.filter(t => t.type === type)
    }

    if (startDate) {
      const start = new Date(startDate)
      allTransactions = allTransactions.filter(t => new Date(t.date!) >= start)
    }

    if (endDate) {
      const end = new Date(endDate)
      allTransactions = allTransactions.filter(t => new Date(t.date!) <= end)
    }

    return NextResponse.json(allTransactions)
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, type, category, amount, description, reference } = body

    const newTransaction = await db.insert(transactions).values({
      date: date ? new Date(date) : new Date(),
      type,
      category,
      amount,
      description,
      reference,
    }).returning()

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
        error: "Forbidden - Only superadmin (erpkonveksi@gmail.com) can reset transactions" 
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
