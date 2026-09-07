"use client"

import { useState, useEffect, useRef } from "react"

export type UserRole = "SUPERADMIN" | "ADMIN" | "QC" | "GUDANG" | "KARYAWAN" | "GUEST"

export interface SessionWithRole {
  user: {
    id: string
    name: string | null
    email: string | null
    image: string | null
    role: UserRole
    isAdmin: boolean
    isSuperAdmin: boolean
    isQC: boolean
    isGudang: boolean
    isKaryawan: boolean
    employeeId?: string
    isActive: boolean
  } | null
  isLoading: boolean
}

const REQUEST_TIMEOUT_MS = 10000

// Cache hanya VALID untuk email tertentu. Sesión saat ini SELALU dicek ulang,
// sehingga pergantian akun (superadmin -> karyawan, dst) tidak bisa memakai data basi.
const roleCacheByEmail = new Map<string, NonNullable<SessionWithRole["user"]>>()

let sessionPromise: Promise<SessionWithRole["user"]> | null = null

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { signal: controller.signal, cache: "no-store" })
  } finally {
    clearTimeout(timer)
  }
}

export function clearSessionCache() {
  roleCacheByEmail.clear()
  sessionPromise = null
}

function fetchSessionAndRole(): Promise<SessionWithRole["user"]> {
  if (sessionPromise) return sessionPromise

  const request = (async () => {
    const sessionResponse = await fetchWithTimeout('/api/debug-session2')
    const sessionData = await sessionResponse.json()

    if (!sessionData.user || !sessionData.user.email) {
      return null
    }

    const sessionUser = sessionData.user
    const userEmail = sessionUser.email

    // Data role boleh dipakai ulang, tapi HANYA untuk email yang sama persis.
    const cached = roleCacheByEmail.get(userEmail.toLowerCase())
    if (cached) return cached

    let role: UserRole = "GUEST"
    let isAdmin = false
    let isSuperAdmin = false
    let employeeId: string | undefined
    let isActive = false

    try {
      const roleResponse = await fetchWithTimeout(`/api/user-role?email=${encodeURIComponent(userEmail)}`)
      if (roleResponse.ok) {
        const roleData = await roleResponse.json()
        role = roleData.role || "GUEST"
        isAdmin = roleData.isAdmin || role === "SUPERADMIN" || role === "ADMIN"
        isSuperAdmin = roleData.isSuperAdmin || role === "SUPERADMIN"
        employeeId = roleData.employeeId
        isActive = roleData.isActive ?? false
      }
    } catch (error) {
      console.error("Error fetching role:", error)
    }

    const user: NonNullable<SessionWithRole["user"]> = {
      id: sessionUser.id || "",
      email: userEmail,
      name: sessionUser.name || null,
      image: sessionUser.image || null,
      role,
      isAdmin,
      isSuperAdmin,
      isQC: role === "QC",
      isGudang: role === "GUDANG",
      isKaryawan: role === "KARYAWAN",
      employeeId,
      isActive,
    }
    roleCacheByEmail.set(userEmail.toLowerCase(), user)
    return user
  })()

  sessionPromise = request.finally(() => {
    sessionPromise = null
  })

  return sessionPromise
}

export function useSessionWithRole(options?: { retryOnNull?: boolean }) {
  const [state, setState] = useState<SessionWithRole>({
    user: null,
    isLoading: true,
  })
  
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    const retryOnNull = options?.retryOnNull !== false
    const MAX_RETRIES = 3
    const RETRY_DELAY_MS = 500
    const HARD_BOUND_MS = 12000
    let settled = false

    const settle = (user: SessionWithRole["user"]) => {
      if (settled) return
      settled = true
      setState({ user, isLoading: false })
    }

    const loadSession = async (attempt = 0) => {
      try {
        const user = await fetchSessionAndRole()
        if (user === null && retryOnNull && attempt < MAX_RETRIES) {
          // Session may not be propagated yet right after login. Retry.
          setTimeout(() => loadSession(attempt + 1), RETRY_DELAY_MS)
          return
        }
        settle(user)
      } catch (error) {
        console.error("Error fetching session:", error)
        if (retryOnNull && attempt < MAX_RETRIES) {
          setTimeout(() => loadSession(attempt + 1), RETRY_DELAY_MS)
          return
        }
        settle(null)
      }
    }

    loadSession()

    // Hard bound: isLoading must never hang forever, even if a fetch stalls.
    const hardBound = setTimeout(() => settle(null), HARD_BOUND_MS)

    return () => {
      clearTimeout(hardBound)
    }
  }, [options?.retryOnNull])

  return state
}

export function useIsAdmin() {
  const { user, isLoading } = useSessionWithRole()
  return {
    isAdmin: user?.isAdmin ?? false,
    isLoading,
  }
}

export function useIsQC() {
  const { user, isLoading } = useSessionWithRole()
  return {
    isQC: user?.isQC ?? false,
    isLoading,
  }
}

export function useIsKaryawan() {
  const { user, isLoading } = useSessionWithRole()
  return {
    isKaryawan: user?.isKaryawan ?? false,
    isLoading,
  }
}

export function useUserRole() {
  const { user, isLoading } = useSessionWithRole()
  return {
    role: user?.role ?? "GUEST",
    isLoading,
  }
}

export function useCanAccess(allowedRoles: UserRole[]) {
  const { user, isLoading } = useSessionWithRole()
  return {
    canAccess: user ? allowedRoles.includes(user.role) : false,
    isLoading,
  }
}
