"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Scissors } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { signIn } from "@/lib/auth-client"

function getRedirectUrl(role: string | undefined): string {
  switch (role) {
    case "ADMIN":
    case "QC":
    case "KARYAWAN":
    case "GUDANG":
      return "/dashboard"
    default:
      return "/dashboard"
  }
}

export function SignupForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (password !== confirmPassword) {
      setError("Password tidak cocok")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password minimal 6 karakter")
      setIsLoading(false)
      return
    }

    try {
      const normalizedEmail = email.toLowerCase().trim()
      
      const result = await signIn.email({
        email: normalizedEmail,
        password,
      })

      if (result.error) {
        setError(result.error.message || "Sign up failed")
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
      
      const redirectUrl = getRedirectUrl(role)
      router.push(redirectUrl)
      
    } catch (err) {
      console.error("Signup error:", err)
      setError("Terjadi kesalahan")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-[420px] animate-in fade-in zoom-in-95 duration-300">
      <Card className="shadow-lg border-border/50">
        <CardContent className="pt-8 pb-6 px-6 md:px-8">
          <div className="text-center mb-7">
            <div className="flex justify-center mb-4">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <div className="absolute inset-0 rounded-full border-[3px] border-primary/40 shadow-md" />
                <div className="absolute inset-[4px] rounded-full bg-primary flex items-center justify-center">
                  <Scissors className="h-7 w-7 text-primary-foreground" />
                </div>
              </div>
            </div>
            <h1 className="text-2xl md:text-[1.75rem] font-bold tracking-tight">Buat Akun</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Daftar untuk memulai
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium">Nama Lengkap</Label>
              <Input
                id="name"
                type="text"
                placeholder="Masukkan nama lengkap"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
                className="h-11"
              />
            </div>
            
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
                className="h-11"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-11"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">Konfirmasi Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Masukkan ulang password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-11"
              />
            </div>
            
            <Button size="lg" 
              type="submit" 
              className="w-full font-semibold mt-2" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Memuat...
                </>
              ) : (
                "Daftar"
              )}
            </Button>
          </form>
          
          <p className="text-center text-sm text-muted-foreground mt-6">
            Sudah punya akun?{" "}
            <Link href="/sign-in" className="text-primary font-medium hover:underline">
              Masuk
            </Link>
          </p>
        </CardContent>
      </Card>
      
      <p className="text-center text-xs text-muted-foreground mt-6">
        &copy; {new Date().getFullYear()} ERP Konveksi
      </p>
    </div>
  )
}
