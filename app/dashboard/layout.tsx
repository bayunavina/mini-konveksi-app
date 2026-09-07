import { cookies } from "next/headers"

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/layout/dashboard-header"
import { MaintenanceGuard } from "@/components/maintenance-guard"
import { InactivityProvider } from "@/components/inactivity-provider"
import { RoleGuard } from "@/components/role-guard"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true"

  return (
    <MaintenanceGuard>
      <InactivityProvider>
        <RoleGuard>
          <SidebarProvider
            defaultOpen={defaultOpen}
            style={
              {
                "--sidebar-width": "calc(var(--spacing) * 72)",
              } as React.CSSProperties
            }
          >
            <AppSidebar variant="floating" />
            <SidebarInset>
              <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 mobile-safe-header">
                <DashboardHeader />
              </div>
              <div className="flex flex-1 flex-col bg-background min-w-0 max-w-full">
                <main className="flex-1 animate-fade-in overflow-y-auto overflow-x-clip">
                  {children}
                </main>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </RoleGuard>
      </InactivityProvider>
    </MaintenanceGuard>
  )
}