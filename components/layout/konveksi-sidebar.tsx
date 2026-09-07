"use client"

import React, { Fragment } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { ScanModal } from "@/components/scanner"
import { toast } from "sonner"
import { useFetch } from "@/hooks/useFetch"
import { useSKUMaster } from "@/hooks/useSKUMaster"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  HomeIcon,
  BuildingOffice2Icon,
  CubeIcon,
  TruckIcon,
  UsersIcon,
  BanknotesIcon,
  WrenchIcon,
  QrCodeIcon,
  Cog6ToothIcon,
  ChevronDownIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  CheckIcon,
  ArchiveBoxIcon,
  ScaleIcon,
} from "@heroicons/react/24/outline"
import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useSessionWithRole, type UserRole } from "@/lib/use-session-with-role"

interface Transfer {
  id: string
  transferNumber: string
  type: string
  fromWarehouseId?: string
  toWarehouseId?: string
  status: string
  notes?: string
  createdAt: string
  items?: TransferItem[]
}

interface TransferItem {
  id: string
  productId?: string
  skuCode?: string
  skuName?: string
  quantity: number
  unit: string
}

interface Warehouse {
  id: string
  name: string
}

interface NavItem {
  title: string
  url: string
  icon?: React.ElementType
  submenu?: NavItem[]
  roles?: UserRole[]
  isAction?: boolean
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
}

const navigationData = {
  admin: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: HomeIcon,
    },
    {
      title: "Produksi",
      url: "/dashboard/produksi",
      icon: BuildingOffice2Icon,
      submenu: [
        { title: "Job Order", url: "/dashboard/produksi" },
        { title: "Buat JO Baru", url: "/dashboard/produksi/new" },
        { title: "QC Reports", url: "/dashboard/qc-reports" },
      ],
    },
    {
      title: "Stok",
      url: "/dashboard/inventory",
      icon: ArchiveBoxIcon,
      submenu: [
        { title: "Overview", url: "/dashboard/inventory" },
        { title: "Bahan Baku", url: "/dashboard/inventory/materials" },
        { title: "Reject", url: "/dashboard/inventory/rejects" },
        { title: "Barang Jadi", url: "/dashboard/inventory/finished" },
      ],
    },
    {
      title: "Transfer",
      url: "/dashboard/transfer",
      icon: TruckIcon,
      submenu: [
        { title: "Overview", url: "/dashboard/transfer" },
        { title: "Barang Keluar", url: "/dashboard/transfer/outgoing" },
        { title: "Barang Masuk", url: "/dashboard/transfer/incoming" },
        { title: "Master Gudang", url: "/dashboard/transfer/warehouses", roles: ["ADMIN"] as UserRole[] },
      ],
    },
    {
      title: "Karyawan",
      url: "/dashboard/employees",
      icon: UsersIcon,
      submenu: [
        { title: "Daftar Karyawan", url: "/dashboard/employees" },
        { title: "Tim Produksi", url: "/dashboard/employees/teams" },
        { title: "Penggajian", url: "/dashboard/employees/salaries" },
        { title: "Klaim Gaji", url: "/dashboard/employees/salary-claims" },
        { title: "Kasbon", url: "/dashboard/employees/advances" },
      ],
    },
    {
      title: "Finance",
      url: "/overview/finance",
      icon: BanknotesIcon,
      submenu: [
        { title: "Overview", url: "/overview/finance" },
        { title: "Transaksi", url: "/overview/finance/transactions" },
        { title: "Laporan", url: "/overview/finance/reports" },
        { title: "Dashboard HPP", url: "/overview/finance/hpp-dashboard" },
      ],
    },
    {
      title: "Assets",
      url: "/dashboard/assets",
      icon: WrenchIcon,
      submenu: [
        { title: "Overview", url: "/dashboard/assets" },
        { title: "Maintenance", url: "/dashboard/assets/maintenance" },
      ],
    },
    {
      title: "QR/Barcode",
      url: "/dashboard/qr-generator",
      icon: QrCodeIcon,
    },
    {
      title: "Balance Report",
      url: "/dashboard/balance",
      icon: ScaleIcon,
    },
    {
      title: "Log Aktivitas",
      url: "/dashboard/log-aktivitas",
      icon: ClipboardDocumentListIcon,
    },
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: Cog6ToothIcon,
      submenu: [
        { title: "Umum", url: "/dashboard/settings" },
        { title: "User & Role", url: "/dashboard/settings/users" },
        { title: "Data Master", url: "/dashboard/settings/master" },
      ],
    },
  ] as NavItem[],
  qc: [
    {
      title: "Dashboard",
      url: "/dashboard/qc",
      icon: HomeIcon,
    },
    {
      title: "QC Progress",
      url: "/dashboard/qc/overview",
      icon: BuildingOffice2Icon,
      submenu: [
        { title: "Overview", url: "/dashboard/qc/overview" },
        { title: "Report", url: "/dashboard/qc/report" },
      ],
    },
  ] as NavItem[],
  gudang: [
    {
      title: "Scan QR",
      url: "/dashboard/transfer/incoming",
      icon: QrCodeIcon,
    },
    {
      title: "Dashboard",
      url: "/dashboard/gudang",
      icon: HomeIcon,
    },
    {
      title: "Stok",
      url: "/dashboard/inventory",
      icon: ArchiveBoxIcon,
      submenu: [
        { title: "Overview", url: "/dashboard/inventory" },
        { title: "Bahan Baku", url: "/dashboard/inventory/materials" },
        { title: "Reject", url: "/dashboard/inventory/rejects" },
        { title: "Barang Jadi", url: "/dashboard/inventory/finished" },
      ],
    },
    {
      title: "Barang Masuk",
      url: "/dashboard/transfer/incoming",
      icon: ArrowDownIcon,
    },
    {
      title: "Barang Keluar",
      url: "/dashboard/transfer/outgoing",
      icon: ArrowUpIcon,
    },
  ] as NavItem[],
  karyawan: [
    {
      title: "Dashboard",
      url: "/dashboard/karyawan",
      icon: HomeIcon,
    },
    {
      title: "Produksi",
      url: "/dashboard/karyawan/produksi",
      icon: BuildingOffice2Icon,
    },
    {
      title: "QC Report",
      url: "/dashboard/karyawan/qc-report",
      icon: ClipboardDocumentCheckIcon,
    },
    {
      title: "Gaji",
      url: "/dashboard/karyawan/gaji",
      icon: BanknotesIcon,
    },
    {
      title: "Chart Gaji",
      url: "/dashboard/karyawan/chart-gaji",
      icon: CubeIcon,
    },
  ] as NavItem[],
  quickActions: [
    {
      title: "Scan QR",
      url: "/dashboard/scan",
      icon: QrCodeIcon,
      roles: ["ADMIN"],
    },
  ],
}

function NavMenuItem({ item, isActive, userRole }: { item: NavItem; isActive: boolean; userRole: UserRole }) {
  const pathname = usePathname()
  
  // P3-1: Filter submenu items by role
  const visibleSubmenu = item.submenu
    ? item.submenu.filter(subItem => !subItem.roles || subItem.roles.includes(userRole))
    : undefined
  
  if (visibleSubmenu && visibleSubmenu.length > 0) {
    const hasActiveChild = visibleSubmenu.some(
      (sub) => pathname === sub.url || pathname.startsWith(sub.url + "/")
    )

    return (
      <Collapsible className="w-full" defaultOpen={hasActiveChild}>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={item.title}
            className={cn(
              "w-full justify-between sidebar-glass-hover",
              (isActive || hasActiveChild) && "bg-sidebar-accent"
            )}
          >
            <span className="flex items-center gap-2">
              {item.icon && <item.icon className="size-5" />}
              <span>{item.title}</span>
            </span>
            <ChevronDownIcon className="size-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {visibleSubmenu.map((subItem) => (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton
                  asChild
                  isActive={pathname === subItem.url}
                  className="sidebar-glass-hover"
                >
                  <Link href={subItem.url}>
                    <span>{subItem.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    )
  }

  if (!visibleSubmenu) {
    return (
      <SidebarMenuButton
        asChild
        tooltip={item.title}
        isActive={isActive}
        className="sidebar-glass-hover"
      >
        <Link href={item.url}>
          {item.icon && <item.icon className="size-5" />}
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    )
  }

  return null
}

export function KonveksiSidebar() {
  const pathname = usePathname()
  const { user, isLoading } = useSessionWithRole()
  const userRole = user?.role || "GUEST"
  const [scanModalOpen, setScanModalOpen] = useState(false)
  const [scanVerifyOpen, setScanVerifyOpen] = useState(false)
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null)
  const [scanProcessing, setScanProcessing] = useState(false)

  const { refetch } = useFetch<Transfer[]>("/api/transfers")
  const { data: warehouses } = useFetch<Warehouse[]>("/api/warehouses")
  const { skus: skuMaster } = useSKUMaster()

  const getWarehouseName = (id?: string) => {
    if (!id || !warehouses) return "-"
    const wh = warehouses.find(w => w.id === id)
    return wh?.name || "-"
  }

  const handleScan = async (result: string) => {
    if (!result || result.length < 5) {
      toast.error("QR Code tidak valid")
      return
    }

    const isLikelyFilename = 
      result.match(/^(IMG_|DSC_|Photo_|PXL_|VID_)/i) ||
      result.match(/\.(jpg|jpeg|png|gif|webp|mp4|mov)$/i)

    if (isLikelyFilename) {
      toast.error("QR Code tidak terbaca. Coba gunakan QR code yang jelas.")
      return
    }

    // Fetch latest data to ensure we have the most up-to-date list
    try {
      const response = await fetch("/api/transfers")
      const latestTransfers = await response.json()
      const currentIncoming = (latestTransfers || []).filter((t: Transfer) => t.type === "INCOMING")

      const found = currentIncoming.find(
        (t: Transfer) => t.transferNumber.toLowerCase() === result.toLowerCase() ||
             t.transferNumber.toLowerCase().includes(result.toLowerCase()) ||
             result.toLowerCase().includes(t.transferNumber.toLowerCase())
      )

      if (found) {
        setSelectedTransfer(found)
        setScanVerifyOpen(true)
        setScanModalOpen(false)
        refetch() // Update local state
      } else {
        toast.error(`Transfer "${result}" tidak ditemukan`)
      }
    } catch (error) {
      console.error("Error fetching transfers:", error)
      toast.error("Terjadi kesalahan saat mengambil data")
    }
  }

  const handleScanReceive = async () => {
    if (!selectedTransfer) return
    setScanProcessing(true)
    try {
      const response = await fetch(`/api/transfers/${selectedTransfer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED",
          notes: selectedTransfer.notes || "",
        }),
      })

      if (response.ok) {
        toast.success(`Transfer ${selectedTransfer.transferNumber} berhasil diterima!`)
        setScanVerifyOpen(false)
        setScanModalOpen(false)
        setSelectedTransfer(null)
        refetch()
      } else {
        toast.error("Gagal menerima transfer")
      }
    } catch (error) {
      console.error("Error receiving transfer:", error)
      toast.error("Terjadi kesalahan")
    } finally {
      setScanProcessing(false)
    }
  }

  const handleScanCancel = async () => {
    if (!selectedTransfer) return
    setScanProcessing(true)
    try {
      const response = await fetch(`/api/transfers/${selectedTransfer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CANCELLED",
          notes: selectedTransfer.notes || "",
        }),
      })

      if (response.ok) {
        toast.error(`Transfer ${selectedTransfer.transferNumber} dibatalkan`)
        setScanVerifyOpen(false)
        setScanModalOpen(false)
        setSelectedTransfer(null)
        refetch()
      } else {
        toast.error("Gagal membatalkan transfer")
      }
    } catch (error) {
      console.error("Error cancelling transfer:", error)
      toast.error("Terjadi kesalahan")
    } finally {
      setScanProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="h-10 w-full animate-pulse rounded bg-muted" />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  const roleBasedNav = userRole === "ADMIN" || userRole === "SUPERADMIN" ? navigationData.admin 
    : userRole === "QC" ? navigationData.qc 
    : userRole === "GUDANG" ? navigationData.gudang
    : navigationData.karyawan

  const filteredQuickActions = navigationData.quickActions.filter(
    (item) => !item.roles || item.roles.includes(userRole as UserRole)
  )

  return (
    <>
      {filteredQuickActions.length > 0 && (
        <SidebarGroup>
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              {filteredQuickActions.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-primary-foreground hover:from-indigo-600 hover:to-indigo-700 shadow-md hover:shadow-lg hover:shadow-indigo-500/25 transition-all duration-200"
                  >
                    <Link href={item.url}>
                      {item.icon && <item.icon className="size-5" />}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}

      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {roleBasedNav.map((item) => {
              const isActive = pathname === item.url || pathname.startsWith(item.url + "/")
              
              // Special handling for Gudang Scan QR button
              if (userRole === "GUDANG" && item.title === "Scan QR") {
                return (
                  <SidebarMenuItem key={item.title} className="mt-2 first:mt-0">
                    <SidebarMenuButton
                      tooltip={item.title}
                      className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md hover:shadow-lg hover:shadow-green-500/25 transition-all duration-200 cursor-pointer"
                      onClick={() => setScanModalOpen(true)}
                    >
                      {item.icon && <item.icon className="size-5" />}
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              }
              
              return (
                <Fragment key={item.title}>
                  {userRole === "GUDANG" && item.title === "Dashboard" && (
                    <div className="h-px bg-border/50 my-3 mx-2" />
                  )}
                  <SidebarMenuItem>
                    <NavMenuItem item={item} isActive={isActive} userRole={userRole} />
                  </SidebarMenuItem>
                </Fragment>
              )
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Scan Modal for Gudang */}
      {userRole === "GUDANG" && (
        <ScanModal
          open={scanModalOpen}
          onOpenChange={setScanModalOpen}
          onScan={handleScan}
          title="Scan QR Transfer"
          description="Scan QR code transfer untuk verifikasi barang masuk"
        />
      )}

      {/* Scan Verification Dialog */}
      {userRole === "GUDANG" && (
        <Dialog open={scanVerifyOpen} onOpenChange={(open) => { setScanVerifyOpen(open); if (!open) setSelectedTransfer(null) }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Verifikasi Transfer</DialogTitle>
              <DialogDescription>
                {selectedTransfer?.status === "PENDING" 
                  ? "Transfer ditemukan. Pilih aksi yang diinginkan." 
                  : "Transfer sudah diproses."}
              </DialogDescription>
            </DialogHeader>
            {selectedTransfer && (
              <div className="space-y-4 py-4">
                <div className="bg-muted rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">No. Transfer:</span>
                    <span className="font-mono font-bold text-lg">{selectedTransfer.transferNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Kode:</span>
                    <span className="font-mono font-medium">
                      {selectedTransfer.items?.map((item) => {
                        const sku = skuMaster?.find(s => s.id === item.productId || s.code === item.skuCode)
                        return item.skuCode || sku?.code || "-"
                      }) || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Produk:</span>
                    <span className="font-medium">
                      {selectedTransfer.items?.map((item) => {
                        const sku = skuMaster?.find(s => s.id === item.productId || s.code === item.skuCode)
                        return item.skuName || sku?.name || "-"
                      }) || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Qty:</span>
                    <span className="font-bold">
                      {selectedTransfer.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} Pcs
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Gudang:</span>
                    <span className="font-medium">{getWarehouseName(selectedTransfer.toWarehouseId)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Badge className={STATUS_COLORS[selectedTransfer.status] || "bg-gray-100"}>
                      {STATUS_LABELS[selectedTransfer.status] || selectedTransfer.status}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="flex-row gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => setScanVerifyOpen(false)} className="flex-1">
                Tutup
              </Button>
              {selectedTransfer?.status === "PENDING" && (
                <>
                  <Button 
                    variant="destructive" 
                    onClick={handleScanCancel} 
                    disabled={scanProcessing}
                    className="flex-1"
                  >
                    {scanProcessing && <Spinner data-icon="inline-start" />}
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleScanReceive} 
                    disabled={scanProcessing}
                    className="bg-green-600 hover:bg-green-700 flex-1"
                  >
                    {scanProcessing && <Spinner data-icon="inline-start" />}
                    <CheckIcon className="mr-2 h-4 w-4" />
                    Terima
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
