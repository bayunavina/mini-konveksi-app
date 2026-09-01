import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { user, account } from "@/db/schema/auth"
import { employees } from "@/db/schema/app"
import { eq } from "drizzle-orm"
import { randomBytes } from "crypto"

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role } = await request.json()
    
    if (!email || !password || !role) {
      return NextResponse.json({ error: "Email, password, and role are required" }, { status: 400 })
    }
    
    const validRoles = ["ADMIN", "QC", "KARYAWAN"]
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }
    
    const existingUser = await db.select().from(user).where(eq(user.email, email.toLowerCase()))
    
    if (existingUser.length > 0) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 })
    }
    
    const ctx = await auth.$context
    const hashedPassword = await ctx.password.hash(password)
    
    const userId = crypto.randomUUID()
    const userName = name || email.split('@')[0]
    
    await db.insert(user).values({
      id: userId,
      name: userName,
      email: email.toLowerCase(),
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await db.insert(account).values({
      id: randomBytes(16).toString("hex"),
      accountId: "credential",
      providerId: "credential",
      userId: userId,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    
    await db.insert(employees).values({
      name: userName,
      email: email.toLowerCase(),
      role: role,
      userId: userId,
      isActive: true,
    })
    
    return NextResponse.json({ success: true, message: `User ${role} created` })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
