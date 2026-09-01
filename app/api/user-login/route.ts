import { NextRequest, NextResponse } from "next/server"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 })
    }

    await pool.query(
      `UPDATE employees SET last_login = NOW() WHERE LOWER(email) = LOWER($1)`,
      [email]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error recording login:", error)
    return NextResponse.json({ error: "Failed to record login" }, { status: 500 })
  }
}
