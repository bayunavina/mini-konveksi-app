"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { Bell, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { APP_NAME } from "@/lib/constants"
import { useFetch } from "@/hooks/useFetch"
import { useSessionWithRole } from "@/lib/use-session-with-role"
import { formatDistanceToNow } from "date-fns"
import { SimpleThemeToggle } from "@/components/theme-toggle"

const NOTIFICATION_ICONS: Record<string, string> = {
  JOB_ORDER: "📋",
  QC_ACCEPTED: "✅",
  QC_REJECTED: "❌",
  SALARY_PAID: "💰",
  KASBON_APPROVED: "✅",
  KASBON_REJECTED: "❌",
  PROGRESS_UPDATE: "🔄",
  TRANSACTION_INCOME: "💰",
  TRANSACTION_EXPENSE: "💸",
  TRANSFER_IN: "📦",
  TRANSFER_OUT: "📤",
  SALARY_CLAIM: "💵",
  QC_PENDING: "🔍",
  GENERAL: "📢",
}

const breadcrumbLabels: Record<string, string> = {
  dashboard: "Dashboard",
  qc: "QC",
  produksi: "Produksi",
  inventory: "Stok",
  transfer: "Transfer",
  employees: "Karyawan",
  finance: "Keuangan",
  assets: "Assets",
  "qr-generator": "QR/Barcode",
  balance: "Balance Report",
  settings: "Settings",
  new: "Baru",
  salaries: "Penggajian",
  advances: "Kasbon",
  transactions: "Transaksi",
  reports: "Laporan",
  materials: "Bahan Baku",
  finished: "Barang Jadi",
  rejects: "Reject",
  outgoing: "Barang Keluar",
  incoming: "Barang Masuk",
  warehouses: "Master Gudang",
  maintenance: "Maintenance",
  users: "User & Role",
  master: "Data Master",
  scan: "Scan QR",
  overview: "Overview",
  karyawan: "Karyawan",
}

interface SearchResult {
  id: string
  type: "module" | "job" | "transfer" | "employee" | "product" | "warehouse"
  title: string
  subtitle: string
  href: string
  badge?: string
}

const MODULE_RESULTS = [
  { keywords: ["dashboard", "beranda", "home"], title: "Dashboard", href: "/dashboard" },
  { keywords: ["karyawan", "pekerja", "staff"], title: "Karyawan", href: "/dashboard/karyawan" },
  { keywords: ["qc", "quality control"], title: "QC", href: "/dashboard/qc" },
  { keywords: ["qc overview", "qc progress"], title: "QC Overview", href: "/dashboard/qc/overview" },
  { keywords: ["produksi", "job order", "jo", "production"], title: "Produksi", href: "/dashboard/produksi" },
  { keywords: ["barang keluar", "outgoing", "pengiriman"], title: "Transfer - Barang Keluar", href: "/dashboard/transfer/outgoing" },
  { keywords: ["barang masuk", "incoming", "penerimaan"], title: "Transfer - Barang Masuk", href: "/dashboard/transfer/incoming" },
  { keywords: ["transfer", "pindah gudang"], title: "Transfer", href: "/dashboard/transfer" },
    { keywords: ["inventory", "warehouse", "stok", "barang"], title: "Stok", href: "/dashboard/inventory" },
  { keywords: ["bahan baku", "materials"], title: "Bahan Baku", href: "/dashboard/inventory/materials" },
  { keywords: ["barang jadi", "finished"], title: "Barang Jadi", href: "/dashboard/inventory/finished" },
  { keywords: ["reject", "gagal"], title: "Reject", href: "/dashboard/inventory/rejects" },
  { keywords: ["karyawan", "employee", "staff"], title: "Karyawan", href: "/dashboard/employees" },
  { keywords: ["gaji", "salary", "penggajian"], title: "Penggajian", href: "/dashboard/employees/salaries" },
  { keywords: ["kasbon", "advance"], title: "Kasbon", href: "/dashboard/employees/advances" },
  { keywords: ["keuangan", "finance", "transaksi"], title: "Finance", href: "/overview/finance" },
  { keywords: ["laporan", "reports"], title: "Laporan", href: "/overview/finance/reports" },
  { keywords: ["asset", "aset", "mesin"], title: "Assets", href: "/dashboard/assets" },
  { keywords: ["maintenance", "perawatan"], title: "Maintenance", href: "/dashboard/assets/maintenance" },
  { keywords: ["gudang", "warehouse"], title: "Gudang", href: "/dashboard/transfer/warehouses" },
  { keywords: ["settings", "pengaturan"], title: "Settings", href: "/dashboard/settings" },
  { keywords: ["user", "pengguna", "role"], title: "User & Role", href: "/dashboard/settings/users" },
  { keywords: ["notifikasi"], title: "Notifikasi", href: "/dashboard/settings/notifications" },
  { keywords: ["qr", "barcode", "scan"], title: "QR Generator", href: "/dashboard/qr-generator" },
  { keywords: ["balance", "selisih", "reconcile", "stok opname", "deviasi", "laporan balance"], title: "Balance Report", href: "/dashboard/balance" },
]

const ROLE_MODULES: Record<string, typeof MODULE_RESULTS> = {
  KARYAWAN: [
    { keywords: ["dashboard", "beranda", "home"], title: "Dashboard", href: "/dashboard" },
    { keywords: ["karyawan", "pekerja", "staff"], title: "Job Order Saya", href: "/dashboard/karyawan" },
    { keywords: ["qc", "quality control"], title: "QC", href: "/dashboard/qc" },
    { keywords: ["qc overview", "qc progress"], title: "QC Overview", href: "/dashboard/qc/overview" },
    { keywords: ["produksi", "job order", "jo"], title: "Produksi", href: "/dashboard/produksi" },
    { keywords: ["settings", "pengaturan"], title: "Settings", href: "/dashboard/settings" },
    { keywords: ["notifikasi"], title: "Notifikasi", href: "/dashboard/settings/notifications" },
  ],
  GUDANG: [
    { keywords: ["dashboard", "beranda", "home"], title: "Dashboard", href: "/dashboard" },
    { keywords: ["barang keluar", "outgoing", "pengiriman"], title: "Transfer - Barang Keluar", href: "/dashboard/transfer/outgoing" },
    { keywords: ["barang masuk", "incoming", "penerimaan"], title: "Transfer - Barang Masuk", href: "/dashboard/transfer/incoming" },
    { keywords: ["transfer", "pindah gudang"], title: "Transfer", href: "/dashboard/transfer" },
    { keywords: ["gudang", "warehouse"], title: "Master Gudang", href: "/dashboard/transfer/warehouses" },
    { keywords: ["inventory", "warehouse", "stok", "barang"], title: "Stok", href: "/dashboard/inventory" },
    { keywords: ["bahan baku", "materials"], title: "Bahan Baku", href: "/dashboard/inventory/materials" },
    { keywords: ["barang jadi", "finished"], title: "Barang Jadi", href: "/dashboard/inventory/finished" },
    { keywords: ["reject", "gagal"], title: "Reject", href: "/dashboard/inventory/rejects" },
    { keywords: ["settings", "pengaturan"], title: "Settings", href: "/dashboard/settings" },
    { keywords: ["notifikasi"], title: "Notifikasi", href: "/dashboard/settings/notifications" },
],
  QC: [
    { keywords: ["dashboard", "beranda", "home"], title: "Dashboard", href: "/dashboard" },
    { keywords: ["qc", "quality control"], title: "QC", href: "/dashboard/qc" },
    { keywords: ["qc overview", "qc progress"], title: "QC Overview", href: "/dashboard/qc/overview" },
    { keywords: ["qc report", "laporan qc"], title: "QC Report", href: "/dashboard/qc/report" },
    { keywords: ["reject", "gagal"], title: "Reject", href: "/dashboard/inventory/rejects" },
    { keywords: ["barang jadi", "finished"], title: "Barang Jadi", href: "/dashboard/inventory/finished" },
    { keywords: ["settings", "pengaturan"], title: "Settings", href: "/dashboard/settings" },
    { keywords: ["notifikasi"], title: "Notifikasi", href: "/dashboard/settings/notifications" },
  ],
  ADMIN: MODULE_RESULTS,
}

interface JobOrder {
  id: string
  joNumber: string
  status: string
  product?: { name: string }
}

interface Transfer {
  id: string
  transferNumber: string
  status: string
  type: string
}

interface DbNotification {
  id: string
  type: string
  title: string
  message: string
  reference?: string
  referenceId?: string
  isRead: boolean
  createdAt: string
  employeeId?: string | null
}

interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  time: string
  isRead: boolean
  href: string
  icon: string
}

export function DashboardHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const employeeIdRef = useRef<string | undefined>(undefined)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const prevUnreadCountRef = useRef(0)
  
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [searchPosition, setSearchPosition] = useState({ top: 0, left: 0, width: 0 })
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const { user } = useSessionWithRole()
  const userRole = user?.role || "GUEST"
  const employeeId = user?.employeeId

  // Initialize audio for notification sound using Web Audio API
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQkANZW6xp5bFwA5mMjat3oXADeXyNq4fhgANpvK27yBHQM4nc3bv4QiADmez9zBhCQFN5zQ4MSHIwQ4oNTixYooBDql1uPJiycEOanY5cuNKQQ7rdvnzI4pBD2v3ejNkCwEP7Dh6tGRLgRBsOHq0pMuBEKy4e3Uky8EQrPj79aVMQRDtuXv1pYyBEW36PDYmjQERrrq8dqcNgRHuuzy3KA4BEi97vLdoToESL/v896jOwRJvu/03qM8BEq/8PTdpD0ETL/x9d6lPgRMv/L236U+BE2g9Pfgpz8ETqH1+OGpPwRQofX64qo/BFKi9vrjq0AEUqP2++WtQARS5Pf85q5BBFPm+P3nr0IFVOn5/umuQwVV6/v/6q9DBVbs/P7qr0QFV+z9/+uvRQRX7f3/669EBVju/v/sr0QEWQ==")
      audioRef.current.volume = 0.5
    }
  }, [])

  // Play sound when new notification arrives
  useEffect(() => {
    if (unreadCount > prevUnreadCountRef.current && audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
    }
    prevUnreadCountRef.current = unreadCount
  }, [unreadCount])

  useEffect(() => {
    employeeIdRef.current = employeeId
  }, [employeeId])

  const { data: jobOrdersResponse } = useFetch<{ data: JobOrder[]; pagination: { limit: number; offset: number; hasMore: boolean } }>("/api/job-orders?limit=10")
  const jobOrders = jobOrdersResponse?.data || []
  const { data: transfers } = useFetch<Transfer[]>("/api/transfers")
  const { data: qcPendingResponse } = useFetch<{ data: { id: string; joNumber: string }[]; pagination: { limit: number; offset: number; hasMore: boolean } }>(
    userRole === "QC" ? "/api/job-orders?status=QC_PENDING&limit=20" : null
  )
  const qcPendingJobs = qcPendingResponse?.data || []

  // Check if reference exists
  const checkReferenceExists = async (reference: string, referenceId: string): Promise<boolean> => {
    try {
      if (reference === "JOB_ORDER") {
        const res = await fetch(`/api/job-orders/by-jo/${referenceId}`)
        return res.ok
      }
      return true
    } catch {
      return false
    }
  }

  // Delete invalid notification
  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" })
    } catch (error) {
      console.error("Error deleting notification:", error)
    }
  }

  // Fetch notifications with real-time polling
  useEffect(() => {
    // Admin with null employeeId still needs to fetch system notifications
    if (employeeId === undefined || employeeId === null) return

    const fetchNotifications = async () => {
      try {
        let allNotifications: DbNotification[] = []

        // For ADMIN, fetch both personal notifications and system-wide notifications
        if (userRole === "ADMIN" || userRole === "SUPERADMIN") {
          const [personalRes, systemRes] = await Promise.all([
            employeeId ? fetch(`/api/notifications?employeeId=${employeeId}`) : Promise.resolve(null),
            fetch(`/api/notifications`) // Fetch all notifications (no employeeId filter = system-wide)
          ])

          if (personalRes?.ok) {
            const personalData = await personalRes.json()
            allNotifications = [...(personalData.notifications || [])]
          }

          if (systemRes?.ok) {
            const systemData = await systemRes.json()
            // Merge system notifications (those with null employeeId)
            const systemNotifs = (systemData.notifications || []).filter((n: DbNotification) => n.employeeId === null)
            allNotifications = [...allNotifications, ...systemNotifs]
          }
        } else {
          // For other roles, fetch by employeeId only
          const res = await fetch(`/api/notifications?employeeId=${employeeId}`)
          if (res.ok) {
            const data = await res.json()
            allNotifications = data.notifications || []
          }
        }

        const validNotifs: NotificationItem[] = []
        
        for (const n of allNotifications) {
          if (n.reference && n.referenceId) {
            const exists = await checkReferenceExists(n.reference, n.referenceId)
            if (!exists) {
              await deleteNotification(n.id)
              continue
            }
          }
          
          let href = "/dashboard"
          
          // Dynamic href based on notification type
          if (n.reference === "JOB_ORDER" && n.referenceId) {
            href = `/dashboard/produksi/${encodeURIComponent(n.referenceId)}`
          } else if (n.type.includes("TRANSFER_IN") || n.type.includes("INCOMING")) {
            href = "/dashboard/transfer/incoming"
          } else if (n.type.includes("TRANSFER_OUT") || n.type.includes("OUTGOING")) {
            href = "/dashboard/transfer/outgoing"
          } else if (n.type.includes("QC")) {
            href = "/dashboard/qc/report"
          } else if (n.type.includes("KASBON")) {
            href = "/dashboard/employees/advances"
          } else if (n.type.includes("SALARY") || n.type.includes("Gaji")) {
            href = "/dashboard/employees/salary-claims"
          } else if (n.type.includes("INCOME") || n.type.includes("EXPENSE") || n.type.includes("Transaksi")) {
            href = "/overview/finance/transactions"
          } else if (n.type.includes("PROGRESS")) {
            href = "/dashboard/produksi"
          }
          
          validNotifs.push({
            id: n.id,
            type: n.type,
            title: n.title,
            message: n.message,
            time: formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }),
            isRead: n.isRead,
            href,
            icon: NOTIFICATION_ICONS[n.type] || NOTIFICATION_ICONS.GENERAL,
          })
        }
        
        // Filter only unread notifications
        const unreadNotifs = validNotifs.filter(n => !n.isRead)
        setNotifications(unreadNotifs)
        setUnreadCount(unreadNotifs.length)
      } catch (error) {
        console.error("Error fetching notifications:", error)
      }
    }

    fetchNotifications()
    
    // Real-time polling every 10 seconds
    const interval = setInterval(fetchNotifications, 10000)
    return () => clearInterval(interval)
  }, [employeeId, userRole])

  // ADMIN gets additional system notifications (always shown)
  useEffect(() => {
    if (userRole !== "ADMIN") return

    const pendingJO = jobOrders?.filter(jo => jo.status === "IN_PROGRESS" || jo.status === "QC_PENDING").length || 0
    const pendingQC = jobOrders?.filter(jo => jo.status === "QC_PENDING").length || 0
    const pendingTransfers = transfers?.filter(t => t.status === "PENDING").length || 0
    
    const adminNotifs: NotificationItem[] = []
    
    if (pendingQC > 0) {
      adminNotifs.push({
        id: "notif-qc-pending",
        type: "QC_PENDING",
        title: "QC Pending",
        message: `${pendingQC} job order perlu quality control`,
        time: "Baru saja",
        isRead: false,
        href: "/dashboard/qc/overview",
        icon: "🔍",
      })
    }
    
    if (pendingJO > 0) {
      adminNotifs.push({
        id: "notif-jo-pending",
        type: "JO_PENDING",
        title: "Job Order Active",
        message: `${pendingJO} job order sedang diproses`,
        time: "Baru saja",
        isRead: false, // System notifications always show
        href: "/dashboard/produksi",
        icon: "📋",
      })
    }
    
    if (pendingTransfers > 0) {
      adminNotifs.push({
        id: "notif-transfer-pending",
        type: "TRANSFER_PENDING",
        title: "Transfer Pending",
        message: `${pendingTransfers} transfer menunggu konfirmasi`,
        time: "Baru saja",
        isRead: false, // System notifications always show
        href: "/dashboard/transfer",
        icon: "🚚",
      })
    }
    
    // Keep system notifications, prepend to user notifications
    setNotifications(prev => {
      const userNotifs = prev.filter(n => !n.id.startsWith("notif-"))
      return [...adminNotifs, ...userNotifs]
    })
  }, [jobOrders, transfers, userRole])

  // QC gets progress update notifications + pending QC jobs
  useEffect(() => {
    if (userRole !== "QC") return

    const fetchQCNotifications = async () => {
      const qcNotifs: NotificationItem[] = []

      // Add pending QC jobs as notifications
      if (qcPendingJobs && qcPendingJobs.length > 0) {
        qcPendingJobs.forEach((jo: { id: string; joNumber: string }) => {
          qcNotifs.push({
            id: `qc-pending-${jo.id}`,
            type: "QC_PENDING",
            title: "Job Order Perlu QC",
            message: `${jo.joNumber} menunggu quality control`,
            time: "Baru saja",
            isRead: false,
            href: "/dashboard/qc/overview",
            icon: NOTIFICATION_ICONS.GENERAL,
          })
        })
      }

      // Add progress update notifications
      try {
        const res = await fetch("/api/notifications?type=PROGRESS_UPDATE")
        if (res.ok) {
          const data = await res.json()
          const progressNotifs: NotificationItem[] = data.notifications.map((n: DbNotification) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            message: n.message,
            time: formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }),
            isRead: n.isRead,
            href: "/dashboard/qc/overview",
            icon: NOTIFICATION_ICONS[n.type] || NOTIFICATION_ICONS.GENERAL,
          }))
          qcNotifs.push(...progressNotifs)
        }
      } catch (err) {
        console.error("Error fetching progress notifications:", err)
      }

      setNotifications(qcNotifs)
      setUnreadCount(qcNotifs.filter(n => !n.isRead).length)
    }

    fetchQCNotifications()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchQCNotifications, 30000)
    return () => clearInterval(interval)
  }, [userRole, qcPendingJobs])

  // KARYAWAN gets QC result notifications
  useEffect(() => {
    if (userRole !== "KARYAWAN") return

    const fetchQCNotifs = async () => {
      const empId = employeeIdRef.current
      if (!empId) return
      
      try {
        const res = await fetch(`/api/notifications?employeeId=${empId}`)
        if (res.ok) {
          const data = await res.json()
          const qcNotifs: NotificationItem[] = data.notifications
            .filter((n: DbNotification) => n.type === "QC_ACCEPTED" || n.type === "QC_REJECTED")
            .map((n: DbNotification) => ({
              id: n.id,
              type: n.type,
              title: n.title,
              message: n.message,
              time: formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }),
              isRead: n.isRead,
              href: "/dashboard/karyawan",
              icon: NOTIFICATION_ICONS[n.type] || NOTIFICATION_ICONS.GENERAL,
            }))
          setNotifications(prev => {
            const filtered = prev.filter(n => n.type !== "QC_ACCEPTED" && n.type !== "QC_REJECTED")
            return [...filtered, ...qcNotifs]
          })
          setUnreadCount(prev => {
            const otherCount = (typeof prev === 'number' ? prev : 0)
            return otherCount + qcNotifs.filter((n: NotificationItem) => !n.isRead).length
          })
        }
      } catch (err) {
        console.error("Error fetching QC notifications:", err)
      }
    }

    fetchQCNotifs()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchQCNotifs, 30000)
    return () => clearInterval(interval)
  }, [userRole])

  // GUDANG gets transfer notifications
  useEffect(() => {
    if (userRole !== "GUDANG") return

    const fetchGudangNotifs = async () => {
      const empId = employeeIdRef.current
      if (!empId) return
      
      try {
        const res = await fetch(`/api/notifications?employeeId=${empId}`)
        if (res.ok) {
          const data = await res.json()
          const transferNotifs: NotificationItem[] = data.notifications
            .filter((n: DbNotification) => n.type === "TRANSFER_IN" || n.type === "TRANSFER_OUT")
            .map((n: DbNotification) => ({
              id: n.id,
              type: n.type,
              title: n.title,
              message: n.message,
              time: formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }),
              isRead: n.isRead,
              href: n.type === "TRANSFER_IN" ? "/dashboard/transfer/incoming" : "/dashboard/transfer/outgoing",
              icon: NOTIFICATION_ICONS[n.type] || NOTIFICATION_ICONS.GENERAL,
            }))
          setNotifications(prev => {
            const filtered = prev.filter(n => n.type !== "TRANSFER_IN" && n.type !== "TRANSFER_OUT")
            return [...filtered, ...transferNotifs]
          })
        }
      } catch (err) {
        console.error("Error fetching GUDANG notifications:", err)
      }
    }

    fetchGudangNotifs()
    
    // Refresh every 15 seconds
    const interval = setInterval(fetchGudangNotifs, 15000)
    return () => clearInterval(interval)
  }, [userRole])

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      setShowSearch(false)
      return
    }

    const query = searchQuery.toLowerCase()
    const results: SearchResult[] = []
    
    const role = userRole || "ADMIN"
    const availableModules = ROLE_MODULES[role] || ROLE_MODULES.ADMIN

    availableModules.forEach((module) => {
      const matches = module.keywords.some(kw => kw.includes(query) || query.includes(kw))
      if (matches) {
        results.push({
          id: `module-${module.href}`,
          type: "module",
          title: module.title,
          subtitle: role !== "ADMIN" ? "Menu Role" : "Menu",
          href: module.href,
        })
      }
    })

    setSearchResults(results.slice(0, 10))
    setShowSearch(true)
  }, [searchQuery, userRole])

  const handleSearchSelect = (result: SearchResult) => {
    setSearchQuery("")
    setShowSearch(false)
    router.push(result.href)
  }

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      })
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const handleNotificationClick = async (notif: NotificationItem) => {
    // Mark as read
    if (!notif.isRead) {
      await markAsRead(notif.id)
      setNotifications(prev =>
        prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    }

    // Auto-delete after 2 seconds
    setTimeout(async () => {
      try {
        await fetch(`/api/notifications/${notif.id}`, { method: "DELETE" })
        setNotifications(prev => prev.filter(n => n.id !== notif.id))
      } catch (error) {
        console.error("Error deleting notification:", error)
      }
    }, 2000)

    router.push(notif.href)
  }

  const markAllAsRead = async () => {
    if (employeeId) {
      try {
        await fetch("/api/notifications/mark-all-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeId }),
        })
        // Update local state
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
        setUnreadCount(0)
      } catch (error) {
        console.error("Error marking all as read:", error)
      }
    }
  }

  const pathParts = pathname.split("/").filter(Boolean)
  const breadcrumbs = pathParts.map((part, index) => {
    const label = breadcrumbLabels[part] || part
    const href = "/" + pathParts.slice(0, index + 1).join("/")
    return { label, href }
  })

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "module": return "📂"
      case "job": return "📋"
      case "transfer": return "🚚"
      case "employee": return "👤"
      case "product": return "📦"
      case "warehouse": return "🏭"
      default: return "📄"
    }
  }

  const updateSearchPosition = () => {
    if (searchInputRef.current) {
      const rect = searchInputRef.current.getBoundingClientRect()
      setSearchPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      })
    }
  }

  const handleSearchFocus = () => {
    if (searchQuery.length >= 2) {
      updateSearchPosition()
      setShowSearch(true)
    }
  }

  return (
    <header className="flex min-h-[clamp(3rem,8vw,4rem)] items-center gap-1.5 sm:gap-2 bg-background/80 backdrop-blur-xl px-2 sm:px-4">
      <SidebarTrigger className="-ml-1 shrink-0 touch-target" />
      
      <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground min-w-0 overflow-hidden">
        <Link href="/dashboard" className="hover:text-foreground font-medium shrink-0 hidden sm:inline">
          {APP_NAME}
        </Link>
        <span className="hidden sm:inline">/</span>
        {breadcrumbs.map((crumb, index) => (
          <span key={crumb.href} className="flex items-center gap-1 sm:gap-2 min-w-0">
            {index === 0 && <span className="sm:hidden">/</span>}
            {index > 0 && <span>/</span>}
            {index < breadcrumbs.length - 1 ? (
              <Link href={crumb.href} className="hover:text-foreground shrink-0">
                {crumb.label}
              </Link>
            ) : (
              <span className="font-medium text-foreground truncate max-w-[120px] sm:max-w-none">{crumb.label}</span>
            )}
          </span>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3 shrink-0">
        {(userRole === "ADMIN" || userRole === "SUPERADMIN") && (
          <>
            <div ref={searchContainerRef} className="relative hidden md:flex">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={searchInputRef}
                type="search"
                placeholder="Cari menu, JO, karyawan..."
                className="w-72 pl-10 rounded-xl"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  if (e.target.value.length >= 2) {
                    updateSearchPosition()
                    setShowSearch(true)
                  } else {
                    setShowSearch(false)
                  }
                }}
                onFocus={handleSearchFocus}
                onBlur={() => setTimeout(() => setShowSearch(false), 200)}
              />
            </div>

            {/* Search Results Portal - Always on top */}
            {showSearch && searchResults.length > 0 && typeof document !== 'undefined' && createPortal(
              <div 
                className="fixed inset-0 z-[2147483647] pointer-events-none"
                onClick={() => setShowSearch(false)}
              >
                <div 
                  className="absolute bg-background rounded-xl shadow-2xl overflow-hidden animate-scale-in pointer-events-auto"
                  style={{
                    top: `${searchPosition.top}px`,
                    left: `${searchPosition.left}px`,
                    width: `${searchPosition.width}px`,
                    maxWidth: '400px',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="max-h-96 overflow-y-auto">
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        className="w-full text-left px-4 py-3 hover:bg-accent/50 flex items-center gap-3 transition-colors"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          handleSearchSelect(result)
                          setShowSearch(false)
                        }}
                      >
                        <span className="text-lg">{getTypeIcon(result.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{result.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                        </div>
                        {result.badge && (
                          <Badge variant="outline" className="text-xs shrink-0">{result.badge}</Badge>
                        )}
                        <span className="text-xs text-muted-foreground capitalize shrink-0">{result.type}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>,
              document.body
            )}
          </>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Link
              href="/dashboard/settings/notifications"
              className="relative rounded-md outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              suppressHydrationWarning
            >
              <Button
                variant="ghost"
                size="icon"
                className="touch-target border-transparent transition-colors hover:bg-accent/50 focus:border-transparent focus:ring-0 focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-r from-red-500 to-red-600 text-[10px] font-medium text-white flex items-center justify-center animate-pulse-glow">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </Link>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[min(20rem,calc(100vw-2rem))] rounded-lg shadow-xl" align="end">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifikasi</span>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-auto p-0 text-xs hover:bg-accent/50" onClick={markAllAsRead}>
                  Tandai semua dibaca
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <p className="text-sm">Tidak ada notifikasi</p>
              </div>
            ) : (
              <>
                {notifications.slice(0, 6).map((notif) => (
                  <DropdownMenuItem 
                    key={notif.id} 
                    className="p-3 cursor-pointer flex items-start gap-3 rounded-lg mx-2 my-1 hover:bg-accent/50 transition-colors"
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <span className="text-lg mt-0.5">{notif.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{notif.title}</p>
                        {!notif.isRead && (
                          <span className="h-2 w-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{notif.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{notif.time}</p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0 capitalize">
                      {notif.type === "job" ? "JO" : notif.type === "transfer" ? "Transfer" : notif.type}
                    </Badge>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                {(userRole === "ADMIN" || userRole === "SUPERADMIN") && (
                  <DropdownMenuItem asChild className="text-center justify-center text-primary">
                    <Link href="/dashboard/log-aktivitas">
                      Lihat semua notifikasi
                    </Link>
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <SimpleThemeToggle />
      </div>
    </header>
  )
}
