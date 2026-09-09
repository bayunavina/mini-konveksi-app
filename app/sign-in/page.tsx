"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Scissors } from "lucide-react"
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline"
import { Spinner } from "@/components/ui/spinner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { signIn } from "@/lib/auth-client"
import { Skeleton } from "@/components/ui/skeleton"

function getRedirectUrl(role: string | undefined): string {
  switch (role) {
    case "SUPERADMIN":
    case "ADMIN":
      return "/dashboard/admin"
    case "QC":
      return "/dashboard/qc"
    case "GUDANG":
      return "/dashboard/gudang"
    case "KARYAWAN":
      return "/dashboard/karyawan"
    default:
      return "/dashboard"
  }
}

const MAX_ATTEMPTS = 3
const LOCKOUT_DURATION_MS = 30 * 1000

const LOCAL_STORAGE_KEYS = {
  failedAttempts: "login_failed_attempts",
  lockoutUntil: "login_lockout_until",
} as const

function getStoredNumber(key: string): number {
  if (typeof window === "undefined") return 0
  const raw = window.localStorage.getItem(key)
  const parsed = raw ? Number(raw) : 0
  return Number.isFinite(parsed) ? parsed : 0
}

function clearLockoutStorage() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(LOCAL_STORAGE_KEYS.failedAttempts)
  window.localStorage.removeItem(LOCAL_STORAGE_KEYS.lockoutUntil)
}

function SignInForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const router = useRouter()

  const isLockedOut = lockoutUntil !== null && Date.now() < lockoutUntil

  useEffect(() => {
    const storedLockout = getStoredNumber(LOCAL_STORAGE_KEYS.lockoutUntil)
    if (storedLockout > Date.now()) {
      setLockoutUntil(storedLockout)
      setRemainingSeconds(Math.ceil((storedLockout - Date.now()) / 1000))
    } else {
      setFailedAttempts(getStoredNumber(LOCAL_STORAGE_KEYS.failedAttempts))
    }
  }, [])

  useEffect(() => {
    if (lockoutUntil === null) return

    const remaining = lockoutUntil - Date.now()
    if (remaining <= 0) {
      setLockoutUntil(null)
      setRemainingSeconds(0)
      setFailedAttempts(0)
      clearLockoutStorage()
      return
    }

    setRemainingSeconds(Math.ceil(remaining / 1000))

    const interval = setInterval(() => {
      const left = lockoutUntil - Date.now()
      if (left <= 0) {
        setLockoutUntil(null)
        setRemainingSeconds(0)
        setFailedAttempts(0)
        clearLockoutStorage()
        clearInterval(interval)
      } else {
        setRemainingSeconds(Math.ceil(left / 1000))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [lockoutUntil])

  const handleLockout = useCallback(() => {
    const attempts = failedAttempts + 1
    setFailedAttempts(attempts)
    window.localStorage.setItem(LOCAL_STORAGE_KEYS.failedAttempts, String(attempts))

    if (attempts >= MAX_ATTEMPTS) {
      const until = Date.now() + LOCKOUT_DURATION_MS
      setLockoutUntil(until)
      setRemainingSeconds(MAX_ATTEMPTS)
      window.localStorage.setItem(LOCAL_STORAGE_KEYS.lockoutUntil, String(until))
    }
  }, [failedAttempts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isLockedOut) return

    setIsLoading(true)
    setError("")

    try {
      const normalizedEmail = email.toLowerCase().trim()
      
      const result = await signIn.email({
        email: normalizedEmail,
        password,
      })

      if (result.error) {
        setError(result.error.message || "Sign in failed")
        setPassword("")
        handleLockout()
        setIsLoading(false)
        return
      }

      clearLockoutStorage()
      setFailedAttempts(0)

      // Reset sidebar to collapsed so the dashboard starts closed after login
      document.cookie = "sidebar_state=false; path=/; max-age=604800"

      const userEmail = (result as { user?: { email?: string } })?.user?.email || normalizedEmail
      
      await fetch("/api/user-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      }).catch(() => {})
      
      const roleResponse = await fetch(`/api/user-role?email=${encodeURIComponent(userEmail)}`)
      let role = "KARYAWAN"
      
      if (roleResponse.ok) {
        const roleData = await roleResponse.json()
        role = roleData.role || "KARYAWAN"
      }
      
      // Check maintenance mode - redirect non-admin to maintenance page
      if (role !== "ADMIN" && role !== "SUPERADMIN") {
        const maintenanceRes = await fetch("/api/settings/maintenance")
        if (maintenanceRes.ok) {
          const maintenanceData = await maintenanceRes.json()
          if (maintenanceData.maintenanceMode) {
            router.push("/maintenance")
            return
          }
        }
      }
      
      const redirectUrl = getRedirectUrl(role)
      router.push(redirectUrl)
      
    } catch (err) {
      console.error("Login error:", err)
      setError("Terjadi kesalahan")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-[420px] animate-in fade-in zoom-in-95 duration-300">
      <Card className="shadow-lg border-border dark:border-orange-500/20 dark:shadow-orange-500/10">
        <CardContent className="pt-8 pb-6 px-6 md:px-8">
          <div className="text-center mb-7">
            <div className="flex justify-center mb-4">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <div className="absolute inset-0 rounded-full border-[3px] border-primary/50 shadow-md" />
                <div className="absolute inset-[4px] rounded-full bg-primary flex items-center justify-center">
                  <Scissors className="h-7 w-7 text-primary-foreground" />
                </div>
              </div>
            </div>
            <h1 className="text-2xl md:text-[1.75rem] font-bold tracking-tight">Selamat Datang</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Masuk untuk melanjutkan
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isLockedOut && (
              <Alert variant="warning" className="py-2">
                <AlertDescription className="text-sm" role="status">
                  Terlalu banyak percobaan login. Coba lagi dalam {remainingSeconds} detik.
                </AlertDescription>
              </Alert>
            )}
            {error && !isLockedOut && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}
            {!isLockedOut && failedAttempts > 0 && failedAttempts < MAX_ATTEMPTS && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-sm">
                  Percobaan gagal {failedAttempts} dari {MAX_ATTEMPTS}. Setelah {MAX_ATTEMPTS} percobaan, login akan dikunci selama 30 detik.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading || isLockedOut}
                className="h-11 bg-transparent dark:bg-transparent border border-gray-300 dark:border-gray-700 rounded-lg transition-all duration-300 focus:bg-white/80 dark:focus:bg-white/10 focus:backdrop-blur-md focus:border-primary focus:shadow-lg focus:shadow-primary/20"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading || isLockedOut}
                  className="h-11 bg-transparent dark:bg-transparent border border-gray-300 dark:border-gray-700 rounded-lg transition-all duration-300 focus:bg-white/80 dark:focus:bg-white/10 focus:backdrop-blur-md focus:border-primary focus:shadow-lg focus:shadow-primary/20 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            
            <Button size="lg" 
              type="submit" 
              className="w-full font-semibold mt-2" 
              disabled={isLoading || isLockedOut}
            >
              {isLoading ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Memuat...
                </>
              ) : (
                "Masuk"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <p className="text-center text-xs text-muted-foreground mt-6">
        &copy; {new Date().getFullYear()} ERP Konveksi
      </p>
    </div>
  )
}

function SignInFormSkeleton() {
  return (
    <div className="w-full max-w-[420px]">
      <Card className="shadow-lg">
        <CardContent className="pt-8 pb-6 px-6 md:px-8">
          <div className="text-center mb-7">
            <div className="flex justify-center mb-4">
              <Skeleton className="h-16 w-16 rounded-full" />
            </div>
            <Skeleton className="h-8 w-40 mx-auto mb-2" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-11 w-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-11 w-full" />
            </div>
            <Skeleton className="h-11 w-full mt-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-zinc-900 dark:to-zinc-950 px-4">
      <Suspense fallback={<SignInFormSkeleton />}>
        <SignInForm />
      </Suspense>
    </main>
  )
}
