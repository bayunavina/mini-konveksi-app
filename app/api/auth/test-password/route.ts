import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { user, account } from "@/db/schema/auth"
import { eq } from "drizzle-orm"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    // Find user by email
    const users = await db.select().from(user).where(eq(user.email, email.toLowerCase()))
    
    if (users.length === 0) {
      return NextResponse.json({ error: "User not found", email: email.toLowerCase() })
    }
    
    const userRecord = users[0]
    
    // Find account
    const accounts = await db.select().from(account).where(eq(account.userId, userRecord.id))
    
    if (accounts.length === 0) {
      return NextResponse.json({ error: "Account not found", userId: userRecord.id })
    }
    
    const accountRecord = accounts[0]
    
    // Test password verification using better-auth's internal function
    const ctx = await auth.$context
    const passwordMatch = await ctx.password.verify({
      password,
      hash: accountRecord.password || ""
    })
    
    return NextResponse.json({
      userId: userRecord.id,
      email: userRecord.email,
      accountId: accountRecord.id,
      providerId: accountRecord.providerId,
      passwordHash: accountRecord.password?.substring(0, 50) + "...",
      passwordMatch
    })
  } catch (error) {
    console.error("Test error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
