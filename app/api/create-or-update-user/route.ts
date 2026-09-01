import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { user, account } from "@/db/schema/auth"
import { employees } from "@/db/schema/app"
import { eq } from "drizzle-orm"
import crypto from "crypto"

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
    
    const normalizedEmail = email.toLowerCase()
    
    const existingUser = await db.select().from(user).where(eq(user.email, normalizedEmail))
    
    let userId: string
    const userName = name || email.split('@')[0]
    
    if (existingUser.length > 0) {
      userId = existingUser[0].id
      
      await db.update(user)
        .set({ name: userName, updatedAt: new Date() })
        .where(eq(user.id, userId))
      
      await db.delete(account).where(eq(account.userId, userId))
    } else {
      userId = crypto.randomUUID()
      
      await db.insert(user).values({
        id: userId,
        name: userName,
        email: normalizedEmail,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }
    
    const ctx = await auth.$context
    const hashedPassword = await ctx.password.hash(password)
    
    await db.insert(account).values({
      id: crypto.randomUUID(),
      accountId: "credential",
      providerId: "credential",
      userId: userId,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    
    const existingEmployee = await db.select().from(employees).where(eq(employees.email, normalizedEmail))
    
    if (existingEmployee.length > 0) {
      await db.update(employees)
        .set({ name: userName, role: role, userId: userId })
        .where(eq(employees.id, existingEmployee[0].id))
    } else {
      await db.insert(employees).values({
        name: userName,
        email: normalizedEmail,
        role: role,
        userId: userId,
        isActive: true,
      })
    }
    
    return NextResponse.json({ success: true, message: `User ${role} created/updated` })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
