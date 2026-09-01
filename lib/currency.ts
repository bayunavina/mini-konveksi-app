export type CurrencyCode = "IDR" | "USD"

export interface CurrencyInfo {
  code: CurrencyCode
  label: string
  symbol: string
  locale: string
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  IDR: {
    code: "IDR",
    label: "IDR - Rupiah Indonesia",
    symbol: "Rp",
    locale: "id-ID",
  },
  USD: {
    code: "USD",
    label: "USD - US Dollar",
    symbol: "$",
    locale: "en-US",
  },
}

export const DEFAULT_CURRENCY: CurrencyCode = "IDR"
export const CURRENCY_STORAGE_KEY = "currency_preference"
export const CURRENCY_CHANGE_EVENT = "currency:change"

export function getCurrencyInfo(code?: string | null): CurrencyInfo {
  if (code && code in CURRENCIES) {
    return CURRENCIES[code as CurrencyCode]
  }
  return CURRENCIES[DEFAULT_CURRENCY]
}

export function isValidCurrency(code?: string | null): code is CurrencyCode {
  return !!code && code in CURRENCIES
}

export function formatNumber(amount?: number | null, code?: string | null): string {
  const value = Number(amount || 0)
  const info = getCurrencyInfo(code)
  return value.toLocaleString(info.locale, {
    maximumFractionDigits: 2,
  })
}

export function formatCurrency(amount?: number | null, code?: string | null): string {
  const info = getCurrencyInfo(code)
  return `${info.symbol} ${formatNumber(amount, info.code)}`
}

export function getCurrencySymbol(code?: string | null): string {
  return getCurrencyInfo(code).symbol
}