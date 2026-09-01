"use client"

import { useEffect, useState } from "react"
import { authClient } from "@/lib/auth-client"

interface SessionProviderProps {
  children: React.ReactNode
}

export function SessionProvider({ children }: SessionProviderProps) {
  return (
    <>{children}</>
  )
}

export function useAuthSession() {
  const { data: session, isPending } = authClient.useSession()
  
  return {
    session,
    isLoading: isPending,
    isAuthenticated: !!session,
    user: session?.user ? {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
    } : null,
  }
}

export function useRequireAuth() {
  const { session, isLoading, isAuthenticated } = useAuthSession()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      setIsReady(true)
    }
  }, [isLoading])

  return {
    session,
    isLoading: !isReady,
    isAuthenticated,
  }
}
