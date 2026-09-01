import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    return NextResponse.json({
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: (session.user as Record<string, unknown>).role || "KARYAWAN",
      }
    })
  } catch (error) {
    console.error("Error getting session:", error)
    return NextResponse.json({ user: null, error: "Session check failed" }, { status: 200 })
  }
}
