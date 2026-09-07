import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { employees } from "@/db/schema"
import { eq, or, ilike } from "drizzle-orm"

export default async function DashboardPage() {
  const h = await headers()
  const session = await auth.api.getSession({ headers: h })

  if (!session?.user?.email) {
    redirect("/sign-in")
  }

  const normalizedEmail = session.user.email.toLowerCase()

  const result = await db
    .select({ role: employees.role })
    .from(employees)
    .where(
      or(
        eq(employees.email, normalizedEmail),
        ilike(employees.email, normalizedEmail)
      )
    )
    .limit(1)

  const role = result[0]?.role ?? "GUEST"

  switch (role) {
    case "SUPERADMIN":
    case "ADMIN":
      redirect("/dashboard/admin")
      break
    case "QC":
      redirect("/dashboard/qc")
      break
    case "GUDANG":
      redirect("/dashboard/gudang")
      break
    case "KARYAWAN":
      redirect("/dashboard/karyawan")
      break
    default:
      redirect("/sign-in")
  }

  // Unreachable
  return null
}