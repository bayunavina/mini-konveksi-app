import { NextResponse } from "next/server"
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const result = await pool.query(
      'SELECT * FROM notification_preferences WHERE user_id = $1',
      [userId]
    )

    if (result.rows.length === 0) {
      const defaultPrefs = {
        emailOrderComplete: true,
        emailTransferIn: true,
        emailTransferOut: false,
        emailLowStock: true,
        pushOrderComplete: true,
        pushTransferIn: true,
        pushTransferOut: true,
        pushLowStock: false,
        smsOrderComplete: false,
        smsTransferIn: false,
        smsTransferOut: false,
        smsLowStock: false,
      }
      return NextResponse.json(defaultPrefs)
    }

    return NextResponse.json(result.rows[0])
  } catch (error: unknown) {
    const err = error as Error
    console.error('Error fetching notification preferences:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      userId,
      emailOrderComplete,
      emailTransferIn,
      emailTransferOut,
      emailLowStock,
      pushOrderComplete,
      pushTransferIn,
      pushTransferOut,
      pushLowStock,
      smsOrderComplete,
      smsTransferIn,
      smsTransferOut,
      smsLowStock,
    } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const existing = await pool.query(
      'SELECT id FROM notification_preferences WHERE user_id = $1',
      [userId]
    )

    let result
    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE notification_preferences SET 
          email_order_complete = $2,
          email_transfer_in = $3,
          email_transfer_out = $4,
          email_low_stock = $5,
          push_order_complete = $6,
          push_transfer_in = $7,
          push_transfer_out = $8,
          push_low_stock = $9,
          sms_order_complete = $10,
          sms_transfer_in = $11,
          sms_transfer_out = $12,
          sms_low_stock = $13,
          updated_at = NOW()
        WHERE user_id = $1 RETURNING *`,
        [
          userId,
          emailOrderComplete ?? true,
          emailTransferIn ?? true,
          emailTransferOut ?? false,
          emailLowStock ?? true,
          pushOrderComplete ?? true,
          pushTransferIn ?? true,
          pushTransferOut ?? true,
          pushLowStock ?? false,
          smsOrderComplete ?? false,
          smsTransferIn ?? false,
          smsTransferOut ?? false,
          smsLowStock ?? false,
        ]
      )
    } else {
      result = await pool.query(
        `INSERT INTO notification_preferences (
          user_id,
          email_order_complete,
          email_transfer_in,
          email_transfer_out,
          email_low_stock,
          push_order_complete,
          push_transfer_in,
          push_transfer_out,
          push_low_stock,
          sms_order_complete,
          sms_transfer_in,
          sms_transfer_out,
          sms_low_stock
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
        [
          userId,
          emailOrderComplete ?? true,
          emailTransferIn ?? true,
          emailTransferOut ?? false,
          emailLowStock ?? true,
          pushOrderComplete ?? true,
          pushTransferIn ?? true,
          pushTransferOut ?? true,
          pushLowStock ?? false,
          smsOrderComplete ?? false,
          smsTransferIn ?? false,
          smsTransferOut ?? false,
          smsLowStock ?? false,
        ]
      )
    }

    return NextResponse.json(result.rows[0])
  } catch (error: unknown) {
    const err = error as Error
    console.error('Error saving notification preferences:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
