import { Pool } from 'pg'
import jwt from 'jsonwebtoken'

let pool: Pool | null = null

function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL })
  }
  return pool
}

function getServiceAccount(): {
  client_email: string
  private_key: string
  project_id: string
} {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT environment variable')
  }
  const parsed = JSON.parse(raw)
  return {
    client_email: parsed.client_email,
    private_key: parsed.private_key,
    project_id: parsed.project_id,
  }
}

let cachedToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30000) {
    return cachedToken.token
  }

  const sa = getServiceAccount()
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }

  const signedJwt = jwt.sign(payload, sa.private_key, { algorithm: "RS256" })

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signedJwt,
    }),
  })

  if (!tokenResponse.ok) {
    const errText = await tokenResponse.text()
    throw new Error(`Failed to obtain access token: ${errText}`)
  }

  const data = (await tokenResponse.json()) as { access_token: string; expires_in: number }
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
  return data.access_token
}

export interface PushMessageData {
  title: string
  body: string
  url?: string
  icon?: string
  [key: string]: string | undefined
}

export async function sendPushToTokens(tokens: string[], data: PushMessageData) {
  if (tokens.length === 0) return { success: true, sent: 0, failed: 0 }

  // Global push toggle gate (app_settings -> push_notification_enabled)
  try {
    const setting = await getPool().query(
      `SELECT value FROM app_settings WHERE key = 'push_notification_enabled' LIMIT 1`
    )
    if (setting.rows[0]?.value !== "true") {
      return { success: true, sent: 0, failed: 0, disabled: true }
    }
  } catch {
    return { success: true, sent: 0, failed: 0, disabled: true }
  }

  const sa = getServiceAccount()
  const accessToken = await getAccessToken()

  let sent = 0
  let failed = 0

  for (const token of tokens) {
    try {
      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: {
              token,
              notification: {
                title: data.title,
                body: data.body,
              },
              data: {
                url: data.url || "/dashboard",
                icon: data.icon || "/icon-192.png",
                ...Object.fromEntries(
                  Object.entries(data).filter(
                    ([k, v]) => !["title", "body", "url", "icon"].includes(k) && v !== undefined
                  )
                ),
              },
            },
          }),
        }
      )

      if (response.ok) {
        sent++
      } else {
        const errText = await response.text()
        // Invalid token -> remove it
        if (response.status === 404 || response.status === 400) {
          await getPool().query("DELETE FROM push_subscriptions WHERE token = $1", [token])
        }
        failed++
        console.error("FCM send error:", response.status, errText)
      }
    } catch (error) {
      failed++
      console.error("FCM send exception:", error)
    }
  }

  return { success: true, sent, failed }
}

export async function sendPushToUser(userId: string, data: PushMessageData) {
  const tokens = await getPool().query(
    "SELECT token FROM push_subscriptions WHERE user_id = $1",
    [userId]
  )
  const tokenList = tokens.rows.map((r: { token: string }) => r.token)
  return sendPushToTokens(tokenList, data)
}

export async function sendPushToAllAdmins(data: PushMessageData) {
  const result = await getPool().query(
    `SELECT ps.token FROM push_subscriptions ps
     JOIN employees e ON e.id = ps.user_id
     WHERE e.role = 'ADMIN'`
  )
  const tokenList = result.rows.map((r: { token: string }) => r.token)
  return sendPushToTokens(tokenList, data)
}
