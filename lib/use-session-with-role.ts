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
  } | null
  isLoading: boolean
}

let sessionPromise: Promise<SessionWithRole["user"]> | null = null
let cachedSessionUser: SessionWithRole["user"] | undefined

function fetchSessionAndRole(): Promise<SessionWithRole["user"]> {
  if (cachedSessionUser !== undefined) return Promise.resolve(cachedSessionUser)
  if (sessionPromise) return sessionPromise

  const request = (async () => {
    const sessionResponse = await fetch('/api/debug-session2')
    const sessionData = await sessionResponse.json()

    if (!sessionData.user || !sessionData.user.email) {
      return null
    }

    const sessionUser = sessionData.user
    const userEmail = sessionUser.email
    let role: UserRole = "GUEST"
    let isAdmin = false
    let isSuperAdmin = false
    let employeeId: string | undefined

    try {
      const roleResponse = await fetch(`/api/user-role?email=${encodeURIComponent(userEmail)}`)
      if (roleResponse.ok) {
        const roleData = await roleResponse.json()
        role = roleData.role || "GUEST"
        isAdmin = roleData.isAdmin || role === "SUPERADMIN" || role === "ADMIN"
        isSuperAdmin = roleData.isSuperAdmin || role === "SUPERADMIN"
        employeeId = roleData.employeeId
      }
    } catch (error) {
      console.error("Error fetching role:", error)
    }

    return {
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
    }
  })()
  sessionPromise = request.then((user) => {
    cachedSessionUser = user
    return user
  }).finally(() => {
    sessionPromise = null
  })

  return sessionPromise
}

export function useSessionWithRole() {
  const [state, setState] = useState<SessionWithRole>({
    user: null,
    isLoading: true,
  })
  
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    
    const loadSession = async () => {
      try {
        setState({ user: await fetchSessionAndRole(), isLoading: false })
      } catch (error) {
        console.error("Error fetching session:", error)
        setState({ user: null, isLoading: false })
      }
    }

    loadSession()

    return () => {
      // cleanup
    }
  }, [])

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
