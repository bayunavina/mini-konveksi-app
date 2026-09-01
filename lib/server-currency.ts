import { db } from "@/db"
import { appSettings } from "@/db/schema"
import { eq } from "drizzle-orm"
import {
  DEFAULT_CURRENCY,
  formatCurrency,
  getCurrencySymbol,
  isValidCurrency,
  type CurrencyCode,
} from "@/lib/currency"

export async function getServerCurrency(): Promise<CurrencyCode> {
  try {
    const rows = await db
      .select({ value: appSettings.value })
      .from(appSettings)
      .where(eq(appSettings.key, "currency"))
      .limit(1)
    const value = rows[0]?.value
    if (isValidCurrency(value)) return value
  } catch {
    // fall through to default
  }
  return DEFAULT_CURRENCY
}

export async function formatCurrencyServer(amount?: number | null): Promise<string> {
  return formatCurrency(amount, await getServerCurrency())
}

export async function getServerCurrencySymbol(): Promise<string> {
  return getCurrencySymbol(await getServerCurrency())
}