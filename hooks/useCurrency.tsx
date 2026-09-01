"use client"

import * as React from "react"
import {
  CURRENCY_STORAGE_KEY,
  CURRENCY_CHANGE_EVENT,
  DEFAULT_CURRENCY,
  formatCurrency as baseFormatCurrency,
  getCurrencyInfo,
  isValidCurrency,
  formatNumber as baseFormatNumber,
  type CurrencyCode,
  type CurrencyInfo,
} from "@/lib/currency"

interface CurrencyContextValue {
  currency: CurrencyCode
  currencyInfo: CurrencyInfo
  currencySymbol: string
  formatCurrency: (amount?: number | null) => string
  formatNumber: (amount?: number | null) => string
  saveCurrency: (code: string) => Promise<void>
}

const CurrencyContext = React.createContext<CurrencyContextValue | null>(null)

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = React.useState<CurrencyCode>(() => {
    if (typeof window === "undefined") return DEFAULT_CURRENCY
    const stored = window.localStorage.getItem(CURRENCY_STORAGE_KEY)
    return isValidCurrency(stored) ? stored : DEFAULT_CURRENCY
  })

  React.useEffect(() => {
    const handleChange = (e: Event) => {
      const code = (e as CustomEvent<string>).detail
      if (isValidCurrency(code)) setCurrency(code)
    }
    window.addEventListener(CURRENCY_CHANGE_EVENT, handleChange)
    return () => window.removeEventListener(CURRENCY_CHANGE_EVENT, handleChange)
  }, [])

  React.useEffect(() => {
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : Promise.resolve({})))
      .then((data: { currency?: unknown }) => {
        const code = typeof data.currency === "string" ? data.currency : null
        if (isValidCurrency(code)) {
          setCurrency(code)
          window.localStorage.setItem(CURRENCY_STORAGE_KEY, code)
        }
      })
      .catch(() => {})
  }, [])

  const value = React.useMemo<CurrencyContextValue>(() => {
    const info = getCurrencyInfo(currency)
    return {
      currency,
      currencyInfo: info,
      currencySymbol: info.symbol,
      formatCurrency: (amount?: number | null) => baseFormatCurrency(amount, currency),
      formatNumber: (amount?: number | null) => baseFormatNumber(amount, currency),
      saveCurrency: async (code: string) => {
        if (!isValidCurrency(code)) return
        setCurrency(code)
        window.localStorage.setItem(CURRENCY_STORAGE_KEY, code)
        window.dispatchEvent(new CustomEvent(CURRENCY_CHANGE_EVENT, { detail: code }))
        try {
          await fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: "currency", value: code }),
          })
        } catch {
          // ignore network errors
        }
      },
    }
  }, [currency])

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  )
}

export function useCurrency(): CurrencyContextValue {
  const ctx = React.useContext(CurrencyContext)
  if (!ctx) {
    throw new Error("useCurrency must be used within CurrencyProvider")
  }
  return ctx
}