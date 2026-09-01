import { NextResponse } from "next/server"
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, token, device } = body

    if (!userId || !token) {
      return NextResponse.json({ error: 'userId and token are required' }, { status: 400 })
    }

    const existing = await pool.query(
      'SELECT id FROM push_subscriptions WHERE token = $1',
      [token]
    )

    if (existing.rows.length > 0) {
      await pool.query(
        'UPDATE push_subscriptions SET user_id = $1, device = $2, updated_at = NOW() WHERE id = $3',
        [userId, device || 'browser', existing.rows[0].id]
      )
    } else {
      await pool.query(
        'INSERT INTO push_subscriptions (user_id, token, device) VALUES ($1, $2, $3)',
        [userId, token, device || 'browser']
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const err = error as Error
    console.error('Error registering push subscription:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ error: 'token is required' }, { status: 400 })
    }

    await pool.query('DELETE FROM push_subscriptions WHERE token = $1', [token])

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const err = error as Error
    console.error('Error removing push subscription:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
