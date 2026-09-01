"use client"

import * as React from "react"
import Link from "next/link"
import { Scissors } from "lucide-react"
import { useSessionWithRole } from "@/lib/use-session-with-role"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { KonveksiSidebar } from "@/components/layout/konveksi-sidebar"
import { NavUser } from "@/components/nav-user"
import { APP_NAME } from "@/lib/constants"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, isLoading } = useSessionWithRole()
  
  const userData = {
    name: user?.name || user?.email || "",
    email: user?.email || "",
    avatar: user?.image || "/codeguide-logo.png",
    role: user?.role,
    isAdmin: user?.isAdmin || false,
  }

  return (
    <Sidebar collapsible="offcanvas" className="border-r-0 bg-gradient-to-br from-background via-background to-indigo-50/30 dark:to-indigo-950/10 shadow-xl shadow-black/20 dark:shadow-black/40" {...props}>
      <SidebarHeader className="border-b border-border/50 py-4 px-3">
        <div className="flex items-center gap-3 overflow-visible">
          <div className="relative flex h-12 w-12 min-w-[48px] items-center justify-center p-1 overflow-visible">
            <div className="absolute inset-0 rounded-full border-2 border-[#304ffe]/50" />
            <div className="absolute inset-[2px] rounded-full bg-[#304ffe] flex items-center justify-center p-2">
              <Scissors className="h-full w-full text-white" />
            </div>
          </div>
          <Link href="/dashboard" className="hover:opacity-80 transition-opacity">
            <span className="text-sm sm:text-base font-bold uppercase tracking-wider whitespace-nowrap">{APP_NAME}</span>
          </Link>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <KonveksiSidebar />
      </SidebarContent>
      <SidebarFooter className="border-t border-border/50">
        {isLoading ? (
          <div className="h-16 flex items-center justify-center px-4">
            <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          </div>
        ) : (
          <NavUser user={userData} />
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
