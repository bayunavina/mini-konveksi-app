import { NextResponse } from "next/server"
import { Pool } from 'pg'
import { sendEmail, emailTemplates } from "@/lib/email"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

interface NotificationPayload {
  type: 'ORDER_COMPLETE' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'LOW_STOCK'
  userId?: string
  data: {
    joNumber?: string
    productName?: string
    qty?: number
    transferNumber?: string
    from?: string
    to?: string
    items?: number
    currentStock?: number
    minStock?: number
  }
}

export async function POST(request: Request) {
  try {
    const body: NotificationPayload = await request.json()
    const { type, userId, data } = body

    let template: { subject: string; html: string } | null = null
    let preferenceField = ''

    switch (type) {
      case 'ORDER_COMPLETE':
        template = emailTemplates().orderComplete(
          data.joNumber || '',
          data.productName || '',
          data.qty || 0
        )
        preferenceField = 'email_order_complete'
        break
      case 'TRANSFER_IN':
        template = emailTemplates().transferIn(
          data.transferNumber || '',
          data.from || '',
          data.to || '',
          data.items || 0
        )
        preferenceField = 'email_transfer_in'
        break
      case 'TRANSFER_OUT':
        template = emailTemplates().transferOut(
          data.transferNumber || '',
          data.from || '',
          data.to || '',
          data.items || 0
        )
        preferenceField = 'email_transfer_out'
        break
      case 'LOW_STOCK':
        template = emailTemplates().lowStock(
          data.productName || '',
          data.currentStock || 0,
          data.minStock || 0
        )
        preferenceField = 'email_low_stock'
        break
      default:
        return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 })
    }

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 500 })
    }

    const recipients: string[] = []

    if (userId) {
      const userResult = await pool.query(
        'SELECT email FROM "user" WHERE id = $1',
        [userId]
      )
      if (userResult.rows.length > 0) {
        recipients.push(userResult.rows[0].email)
      }
    }

    const prefsResult = await pool.query(
      `SELECT np.user_id, np.${preferenceField} as enabled, u.email 
       FROM notification_preferences np 
       JOIN "user" u ON np.user_id = u.id 
       WHERE np.${preferenceField} = true`
    )

    for (const row of prefsResult.rows) {
      if (!recipients.includes(row.email)) {
        recipients.push(row.email)
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No recipients with email notifications enabled' 
      })
    }

    const results = []
    for (const recipient of recipients) {
      const result = await sendEmail({
        to: recipient,
        subject: template.subject,
        html: template.html
      })
      results.push({ to: recipient, ...result })
    }

    return NextResponse.json({
      success: true,
      sent: results.filter((r: { success: boolean }) => r.success).length,
      failed: results.filter((r: { success: boolean }) => !r.success).length,
      results
    })

  } catch (error: unknown) {
    const err = error as Error
    console.error('Error sending notification:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
