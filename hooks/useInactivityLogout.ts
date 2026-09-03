"use client"

import { useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "@/lib/auth-client"
import { toast } from "sonner"

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000 // 5 menit
const WARNING_BEFORE_MS = 30 * 1000 // peringatan 30 detik sebelum logout

export function useInactivityLogout(options?: {
  timeoutMs?: number
  enabled?: boolean
}) {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const enabled = options?.enabled ?? true
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLoggingOutRef = useRef(false)

  const doLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return
    isLoggingOutRef.current = true
    try {
      toast.error("Sesi berakhir", { description: "Tidak ada aktivitas selama 5 menit. Silakan login kembali." })
      await signOut()
    } catch {
      // fallback: clear local storage/session anyway
    } finally {
      router.push("/sign-in")
      // hard reload to clear stale state
      setTimeout(() => window.location.href = "/sign-in", 500)
    }
  }, [router])

  const resetTimer = useCallback(() => {
    if (!enabled) return
    if (timerRef.current) clearTimeout(timerRef.current)
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)

    // Warning toast 30s before
    if (timeoutMs > WARNING_BEFORE_MS) {
      warningTimerRef.current = setTimeout(() => {
        toast.warning("Sesi akan berakhir", { description: "Tidak ada aktivitas. Anda akan logout otomatis dalam 30 detik." })
      }, timeoutMs - WARNING_BEFORE_MS)
    }

    timerRef.current = setTimeout(() => {
      doLogout()
    }, timeoutMs)
  }, [enabled, timeoutMs, doLogout])

  useEffect(() => {
    if (!enabled) return

    const events: (keyof WindowEventMap)[] = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"]
    const handler = () => resetTimer()

    // initial start
    resetTimer()

    events.forEach(ev => window.addEventListener(ev, handler, { passive: true }))
    // Also reset on visibility change (user kembali ke tab)
    const onVisibility = () => {
      if (document.visibilityState === "visible") resetTimer()
    }
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      events.forEach(ev => window.removeEventListener(ev, handler))
      document.removeEventListener("visibilitychange", onVisibility)
      if (timerRef.current) clearTimeout(timerRef.current)
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    }
  }, [enabled, resetTimer])

  return { resetTimer }
}
