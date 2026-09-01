import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { user, account } from "@/db/schema/auth"
import { employees } from "@/db/schema/app"
import { eq } from "drizzle-orm"
import crypto from "crypto"
import { scryptAsync } from "@noble/hashes/scrypt.js"

const SCRYPT_CONFIG = {
  N: 16384,
  r: 16,
  p: 1,
  dkLen: 64,
}

function toHex(buffer: ArrayLike<number>): string {
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function hashPassword(password: string): Promise<string> {
  const saltBytes = crypto.randomBytes(16)
  const salt = toHex(saltBytes)
  const normalizedPassword = password.normalize("NFKC")
  
  const key = await scryptAsync(normalizedPassword, salt, {
    N: SCRYPT_CONFIG.N,
    r: SCRYPT_CONFIG.r,
    p: SCRYPT_CONFIG.p,
    dkLen: SCRYPT_CONFIG.dkLen,
    maxmem: 128 * SCRYPT_CONFIG.N * SCRYPT_CONFIG.r * 2,
  })
  
  return `${salt}:${toHex(key)}`
}

export async function POST(request: NextRequest) {
  try {
    const { userId, email, password } = await request.json()

    if (!userId && !email) {
      return NextResponse.json(
        { success: false, message: "userId atau email diperlukan" },
        { status: 400 }
      )
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password minimal 6 karakter" },
        { status: 400 }
      )
    }

    let existingUser
    if (userId) {
      existingUser = await db.query.user.findFirst({
        where: eq(user.id, userId),
      })
    } else if (email) {
      existingUser = await db.query.user.findFirst({
        where: eq(user.email, email.toLowerCase()),
      })
    }

    if (!existingUser) {
      if (email) {
        const employee = await db.query.employees.findFirst({
          where: eq(employees.email, email)
        })

        if (!employee) {
          return NextResponse.json(
            { success: false, message: "User/Employee tidak ditemukan" },
            { status: 404 }
          )
        }

        const newUserId = crypto.randomUUID()
        await db.insert(user).values({
          id: newUserId,
          name: employee.name,
          email: email.toLowerCase(),
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        await db.update(employees)
          .set({ userId: newUserId })
          .where(eq(employees.id, employee.id))

        existingUser = await db.query.user.findFirst({
          where: eq(user.id, newUserId),
        })
      }
    }

    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: "User tidak ditemukan" },
        { status: 404 }
      )
    }

    const hashedPassword = await hashPassword(password)

    const existingAccount = await db.query.account.findFirst({
      where: eq(account.userId, existingUser!.id),
    })

    if (existingAccount) {
      await db.update(account)
        .set({ 
          password: hashedPassword,
          updatedAt: new Date()
        })
        .where(eq(account.id, existingAccount.id))
    } else {
      const accountId = crypto.randomUUID()
      await db.insert(account).values({
        id: accountId,
        accountId: accountId,
        providerId: "credential",
        userId: existingUser!.id,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    return NextResponse.json({
      success: true,
      message: `Password berhasil diset untuk ${existingUser!.email}`
    })

  } catch (error) {
    console.error("Set password error:", error)
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    )
  }
}
