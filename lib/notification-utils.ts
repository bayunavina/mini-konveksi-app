import { db } from "@/db"
import { notifications, employees } from "@/db/schema"
import { eq, or } from "drizzle-orm"

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
        type,
        title,
        message,
        reference: reference || null,
        referenceId: referenceId || null,
        isRead: false,
      }))
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
  referenceId?: string
) {
  return sendNotification({
    type,
    title,
    message,
    reference,
    referenceId,
    targetRoles: [role],
  })
}

export async function sendNotificationToAdmin(
  type: NotificationType,
  title: string,
  message: string,
  reference?: string,
  referenceId?: string
) {
  return sendNotificationToRole("ADMIN", type, title, message, reference, referenceId)
}

export async function sendNotificationToGudang(
  type: NotificationType,
  title: string,
  message: string,
  reference?: string,
  referenceId?: string
) {
  return sendNotificationToRole("GUDANG", type, title, message, reference, referenceId)
}

export async function sendNotificationToQC(
  type: NotificationType,
  title: string,
  message: string,
  reference?: string,
  referenceId?: string
) {
  return sendNotificationToRole("QC", type, title, message, reference, referenceId)
}

export async function sendNotificationToKaryawan(
  employeeId: string,
  type: NotificationType,
  title: string,
  message: string,
  reference?: string,
  referenceId?: string
) {
  try {
    await db.insert(notifications).values({
      employeeId,
      type,
      title,
      message,
      reference: reference || null,
      referenceId: referenceId || null,
      isRead: false,
    })
    return { success: true, sent: 1 }
  } catch (error) {
    console.error("Error sending notification to karyawan:", error)
    return { success: false, sent: 0 }
  }
}
