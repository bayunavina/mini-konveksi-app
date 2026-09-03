"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { signOut } from "@/lib/auth-client"
import {
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  BellIcon,
  ShieldCheckIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: "Super Admin",
  ADMIN: "Admin",
  QC: "QC",
  KARYAWAN: "Karyawan",
  GUDANG: "Gudang",
  GUEST: "Guest",
}

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
    role?: string
    isAdmin?: boolean
  }
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
      router.push("/")
    } catch (error) {
      console.error("Sign out error:", error)
    } finally {
      setIsSigningOut(false)
    }
  }

  const handleNavigate = (path: string) => {
    router.push(path)
  }

  const role = user.role || "GUEST"
  const roleLabel = ROLE_LABELS[role] || ROLE_LABELS.GUEST

  return (
    <SidebarMenu>
      <SidebarMenuItem className="p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground w-full h-auto py-3 px-3 rounded-lg hover:bg-accent transition-colors"
            >
              <div className="relative flex h-10 w-10 items-center justify-center shrink-0">
                <div className="absolute inset-0 rounded-full border-2 border-[var(--brand-primary)]/50" />
                <div className="absolute inset-[2px] rounded-full bg-[var(--brand-primary)]" />
                <span className="relative z-10 text-brand-primary-foreground font-semibold text-sm">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </span>
              </div>
              <div className="grid flex-1 text-left min-w-0">
                <span className="truncate font-semibold text-sm">{user.name || "User"}</span>
                <span className="truncate text-muted-foreground text-xs">{roleLabel}</span>
              </div>
              <ChevronDownIcon className="ml-auto h-3 w-3 shrink-0 opacity-50 transition-transform group-data-[state=open]/menu:rotate-180" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64 rounded-lg border shadow-lg"
            side={isMobile ? "bottom" : "top"}
            align="end"
            sideOffset={8}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-3 px-4 py-4 border-b">
                <div className="relative flex h-12 w-12 items-center justify-center shrink-0">
                  <div className="absolute inset-0 rounded-full border-2 border-[var(--brand-primary)]/50" />
                  <div className="absolute inset-[2px] rounded-full bg-[var(--brand-primary)]" />
                  <span className="relative z-10 text-brand-primary-foreground font-bold text-base">
                    {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </span>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                  <span className="truncate font-semibold">{user.name || "User"}</span>
                  <span className="truncate text-muted-foreground text-xs">
                    {user.email}
                  </span>
                </div>
              </div>
              <div className="px-4 py-3">
                <Badge variant="secondary" className="text-xs font-medium px-3 py-1 rounded-full">
                  {user.isAdmin && <ShieldCheckIcon className="h-3 w-3 mr-1 inline" />}
                  {roleLabel}
                </Badge>
              </div>
            </DropdownMenuLabel>
            {(user.role === "ADMIN" || user.role === "SUPERADMIN") && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => handleNavigate("/dashboard/settings/users")} className="cursor-pointer">
                    <UserCircleIcon className="mr-2 h-4 w-4" />
                    <span>Profil Saya</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigate("/dashboard/settings/general")} className="cursor-pointer">
                    <Cog6ToothIcon className="mr-2 h-4 w-4" />
                    <span>Pengaturan</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigate("/dashboard/settings/notifications")} className="cursor-pointer">
                    <BellIcon className="mr-2 h-4 w-4" />
                    <span>Notifikasi</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} disabled={isSigningOut} className="text-destructive focus:text-destructive cursor-pointer">
              <ArrowRightOnRectangleIcon className="mr-2 h-4 w-4" />
              <span>{isSigningOut ? "Signing out..." : "Keluar"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
