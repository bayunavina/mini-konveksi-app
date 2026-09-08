import { db } from "@/db"
import { notifications, employees, pushSubscriptions } from "@/db/schema"
import { eq, or, inArray } from "drizzle-orm"
import { Pool } from 'pg'
import { sendEmail, emailTemplates } from "@/lib/email"
import { sendPushToTokens } from "@/lib/firebase/server"
import { getServerCurrency } from "@/lib/server-currency"

export type NotificationType = 
  | "TRANSACTION_INCOME"
  | "TRANSACTION_EXPENSE"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "QC_PENDING"
  | "QC_ACCEPTED"
  | "QC_REJECTED"
  | "SALARY_CLAIM"
  | "SALARY_PAID"
  | "KASBON_REQUESTED"
  | "KASBON_APPROVED"
  | "KASBON_REJECTED"
  | "KASBON_PAID"
  | "JOB_ORDER"
  | "PROGRESS_UPDATE"

export interface CreateNotificationParams {
  type: NotificationType
  title: string
  message: string
  reference?: string
  referenceId?: string
  targetRoles?: string[]
  targetEmails?: string[]
  excludeEmail?: string
  emailData?: Record<string, string | number>
  actorId?: string
}

async function getAdminEmails(): Promise<string[]> {
  try {
    const admins = await db
      .select({ email: employees.email })
      .from(employees)
      .where(eq(employees.role, "ADMIN"))
    return admins.map((a) => a.email).filter((e): e is string => !!e)
  } catch {
    return []
  }
}

async function buildEmailContent(
  type: NotificationType,
  title: string,
  message: string,
  emailData?: Record<string, string | number>
): Promise<{ subject: string; html: string } | null> {
  const currency = await getServerCurrency()
  const templates = emailTemplates(currency)

  switch (type) {
    case "TRANSFER_IN":
      return templates.transferIn(
        String(emailData?.transferNumber || emailData?.reference || title),
        String(emailData?.from || ""),
        String(emailData?.to || ""),
        Number(emailData?.items || 0)
      )
    case "TRANSFER_OUT":
      return templates.transferOut(
        String(emailData?.transferNumber || emailData?.reference || title),
        String(emailData?.from || ""),
        String(emailData?.to || ""),
        Number(emailData?.items || 0)
      )
    case "TRANSACTION_INCOME":
      return templates.transaction("INCOME", Number(emailData?.amount || 0), String(emailData?.description || message))
    case "TRANSACTION_EXPENSE":
      return templates.transaction("EXPENSE", Number(emailData?.amount || 0), String(emailData?.description || message))
    case "SALARY_CLAIM":
      return templates.salaryClaim(String(emailData?.employeeName || ""), Number(emailData?.amount || 0))
    case "SALARY_PAID":
      return templates.salaryPaid(String(emailData?.employeeName || ""), Number(emailData?.amount || 0))
    case "KASBON_REQUESTED":
      return templates.advanceRequest(String(emailData?.employeeName || ""), Number(emailData?.amount || 0))
    case "KASBON_APPROVED":
      return templates.advanceApproved(String(emailData?.employeeName || ""), Number(emailData?.amount || 0))
    case "KASBON_REJECTED":
      return templates.advanceRejected(String(emailData?.employeeName || ""), Number(emailData?.amount || 0))
    case "QC_PENDING":
      return templates.qcPending(
        String(emailData?.joNumber || ""),
        String(emailData?.productName || ""),
        Number(emailData?.qty || 0)
      )
    case "QC_ACCEPTED":
    case "QC_REJECTED":
      return templates.qcResult(String(emailData?.joNumber || ""), type === "QC_ACCEPTED" ? "Diterima" : "Ditolak")
    case "JOB_ORDER":
      return templates.orderComplete(
        String(emailData?.joNumber || ""),
        String(emailData?.productName || ""),
        Number(emailData?.qty || 0)
      )
    default:
      return { subject: title, html: `<h1>${title}</h1><p>${message}</p>` }
  }
}

async function sendEmailToAdmins(
  subject: string,
  html: string,
  excludeEmail?: string
) {
  const emails = await getAdminEmails()
  const recipients = emails.filter((e) => e !== excludeEmail)
  for (const email of recipients) {
    await sendEmail({ to: email, subject, html })
  }
}

function pushPreferenceField(type: NotificationType): string | null {
  switch (type) {
    case "JOB_ORDER":
      return "push_order_complete"
    case "TRANSFER_IN":
      return "push_transfer_in"
    case "TRANSFER_OUT":
      return "push_transfer_out"
    default:
      return null
  }
}

async function sendPushToEmployees(
    employeeIds: string[],
    data: { title: string; body: string; url?: string },
    prefField?: string | null
  ) {
  try {
    if (employeeIds.length === 0) return
    const empRows = await db
      .select({ userId: employees.userId })
      .from(employees)
      .where(inArray(employees.id, employeeIds))
    const userIds = empRows.map((e) => e.userId).filter((u): u is string => !!u)
    if (userIds.length === 0) return

    let enabledUserIds = userIds
    if (prefField) {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL })
      const prefs = await pool.query(
        `SELECT user_id, ${prefField} as val FROM notification_preferences WHERE user_id = ANY($1::text[])`,
        [userIds]
      )
      const enabledMap = new Set(prefs.rows.filter((p) => p.val).map((p) => p.user_id))
      enabledUserIds = userIds.filter((u) => enabledMap.has(u))
      await pool.end()
      if (enabledUserIds.length === 0) return
    }

    const subs = await db
      .select({ token: pushSubscriptions.token })
      .from(pushSubscriptions)
      .where(inArray(pushSubscriptions.userId, enabledUserIds))
    const tokens = subs.map((s) => s.token)
    if (tokens.length > 0) {
      await sendPushToTokens(tokens, { title: data.title, body: data.body, url: data.url || "/dashboard" })
    }
  } catch (error) {
    console.error("Error sending push notification:", error)
  }
}

export async function sendNotification(params: CreateNotificationParams) {
  const {
    type,
    title,
    message,
    reference,
    referenceId,
    targetRoles = [],
    excludeEmail,
    emailData,
    actorId,
  } = params

  try {
    let targetEmployees: { id: string; email: string | null }[] = []

    if (targetRoles.length > 0) {
      const roleConditions = targetRoles.map((role) => eq(employees.role, role))
      targetEmployees = await db
        .select({ id: employees.id, email: employees.email })
        .from(employees)
        .where(or(...roleConditions)!)
    } else {
      targetEmployees = await db
        .select({ id: employees.id, email: employees.email })
        .from(employees)
    }

    const filteredEmployees = targetEmployees.filter((emp) => {
      if (excludeEmail && emp.email === excludeEmail) return false
      return true
    })

    if (filteredEmployees.length === 0) {
      console.log(`No target employees found for notification: ${type}`)
      return { success: true, sent: 0 }
    }

    await db.insert(notifications).values(
      filteredEmployees.map((emp) => ({
        employeeId: emp.id,
        actorId: actorId || null,
        type,
        title,
        message,
        reference: reference || null,
        referenceId: referenceId || null,
        isRead: false,
      }))
    )

    const emailContent = await buildEmailContent(type, title, message, emailData)
    if (emailContent) {
      await sendEmailToAdmins(emailContent.subject, emailContent.html, excludeEmail)
    }

    await sendPushToEmployees(
      filteredEmployees.map((e) => e.id),
      {
        title,
        body: message,
        url: reference ? `/dashboard/log-aktivitas` : "/dashboard",
      },
      pushPreferenceField(type)
    )

    return { success: true, sent: filteredEmployees.length }
  } catch (error) {
    console.error("Error sending notification:", error)
    return { success: false, sent: 0 }
  }
}

export async function sendNotificationToRole(
  role: string,
  type: NotificationType,
  title: string,
  message: string,
  reference?: string,
  referenceId?: string,
  emailData?: Record<string, string | number>,
  actorId?: string
) {
  return sendNotification({
    type,
    title,
    message,
    reference,
    referenceId,
    targetRoles: [role],
    emailData,
    actorId,
  })
}

export async function sendNotificationToAdmin(
  type: NotificationType,
  title: string,
  message: string,
  reference?: string,
  referenceId?: string,
  emailData?: Record<string, string | number>,
  actorId?: string
) {
  return sendNotificationToRole("ADMIN", type, title, message, reference, referenceId, emailData, actorId)
}

export async function sendNotificationToGudang(
  type: NotificationType,
  title: string,
  message: string,
  reference?: string,
  referenceId?: string,
  emailData?: Record<string, string | number>,
  actorId?: string
) {
  return sendNotificationToRole("GUDANG", type, title, message, reference, referenceId, emailData, actorId)
}

export async function sendNotificationToQC(
  type: NotificationType,
  title: string,
  message: string,
  reference?: string,
  referenceId?: string,
  emailData?: Record<string, string | number>,
  actorId?: string
) {
  return sendNotificationToRole("QC", type, title, message, reference, referenceId, emailData, actorId)
}

export async function sendNotificationToKaryawan(
  employeeId: string,
  type: NotificationType,
  title: string,
  message: string,
  reference?: string,
  referenceId?: string,
  emailData?: Record<string, string | number>,
  actorId?: string
) {
  try {
    await db.insert(notifications).values({
      employeeId,
      actorId: actorId || null,
      type,
      title,
      message,
      reference: reference || null,
      referenceId: referenceId || null,
      isRead: false,
    })

    const emailContent = await buildEmailContent(type, title, message, emailData)
    if (emailContent) {
      await sendEmailToAdmins(emailContent.subject, emailContent.html)
    }

    return { success: true, sent: 1 }
  } catch (error) {
    console.error("Error sending notification to karyawan:", error)
    return { success: false, sent: 0 }
  }
}
