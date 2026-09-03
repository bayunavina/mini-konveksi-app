"use client"

import { useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Scissors } from "lucide-react"
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
    case "QC":
    case "KARYAWAN":
    case "GUDANG":
      return "/dashboard"
    default:
      return "/dashboard"
  }
}

function SignInForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
        setIsLoading(false)
        return
      }

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
            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-sm">{error}</AlertDescription>
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
                disabled={isLoading}
                className="h-11 bg-transparent dark:bg-transparent border border-gray-300 dark:border-gray-700 rounded-lg transition-all duration-300 focus:bg-white/80 dark:focus:bg-white/10 focus:backdrop-blur-md focus:border-primary focus:shadow-lg focus:shadow-primary/20"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-11 bg-transparent dark:bg-transparent border border-gray-300 dark:border-gray-700 rounded-lg transition-all duration-300 focus:bg-white/80 dark:focus:bg-white/10 focus:backdrop-blur-md focus:border-primary focus:shadow-lg focus:shadow-primary/20"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-11 text-sm font-semibold mt-2" 
              disabled={isLoading}
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
