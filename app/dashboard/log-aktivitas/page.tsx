"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/shared"
import { useSessionWithRole } from "@/lib/use-session-with-role"
import { useRouter } from "next/navigation"
import { BellIcon, ClipboardDocumentListIcon, MagnifyingGlassIcon, ArrowPathIcon } from "@heroicons/react/24/outline"
import { toast } from "sonner"

interface NotificationLog {
  id: string
  type: string
  title: string
  message: string
  createdAt: string
  employee?: {
    name: string
  }
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  INCOME: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400" },
  EXPENSE: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-600 dark:text-red-400" },
  TRANSFER: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400" },
  QC: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400" },
  SALARY: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400" },
  KASBON: { bg: "bg-pink-100 dark:bg-pink-900/30", text: "text-pink-600 dark:text-pink-400" },
  PROGRESS: { bg: "bg-cyan-100 dark:bg-cyan-900/30", text: "text-cyan-600 dark:text-cyan-400" },
  JOB: { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-600 dark:text-indigo-400" },
}

function getTypeColor(type: string) {
  for (const [key, value] of Object.entries(TYPE_COLORS)) {
    if (type.toUpperCase().includes(key)) {
      return value
    }
  }
  return { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-400" }
}

export default function LogAktivitasPage() {
  const router = useRouter()
  const { user, isLoading } = useSessionWithRole()
  
  const [logs, setLogs] = useState<NotificationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [showSuggestions, setShowSuggestions] = useState(false)

  const suggestions = logs
    .filter(log => 
      searchQuery && (
        log.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.message?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    )
    .slice(0, 5)
    .map(log => ({ title: log.title, type: log.type }))

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/notifications")
      if (res.ok) {
        const data = await res.json()
        setLogs(data.notifications || [])
      }
    } catch (error) {
      console.error("Error fetching logs:", error)
      toast.error("Gagal memuat log aktivitas")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchLogs, 30000)
    return () => clearInterval(interval)
  }, [fetchLogs])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (user?.role !== "ADMIN") {
    router.push("/dashboard")
    return null
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.message?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesType = typeFilter === "all" || log.type.toUpperCase().includes(typeFilter)
    
    return matchesSearch && matchesType
  })

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "-"
    const date = new Date(dateStr)
    return date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getTypeLabel = (type: string) => {
    if (type.includes("INCOME")) return "Pemasukan"
    if (type.includes("EXPENSE")) return "Pengeluaran"
    if (type.includes("TRANSFER")) return "Transfer"
    if (type.includes("QC")) return "QC"
    if (type.includes("SALARY")) return "Gaji"
    if (type.includes("KASBON")) return "Kasbon"
    if (type.includes("PROGRESS")) return "Produksi"
    if (type.includes("JOB")) return "Job Order"
    return type
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Log Aktivitas"
        description="Riwayat aktivitas sistem"
        actions={
          <Button onClick={fetchLogs} variant="outline" size="sm">
            <ArrowPathIcon className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari aktivitas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="pl-10"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg">
                  {suggestions.map((s, i) => (
                    <div
                      key={i}
                      className="px-3 py-2 text-sm hover:bg-accent cursor-pointer"
                      onClick={() => { setSearchQuery(s.title); setShowSuggestions(false) }}
                    >
                      {s.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm min-w-[150px]"
            >
              <option value="all">Semua Tipe</option>
              <option value="INCOME">Pemasukan</option>
              <option value="EXPENSE">Pengeluaran</option>
              <option value="TRANSFER">Transfer</option>
              <option value="QC">QC</option>
              <option value="SALARY">Gaji</option>
              <option value="KASBON">Kasbon</option>
              <option value="PROGRESS">Produksi</option>
              <option value="JOB">Job Order</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Activity List */}
      <Card className="border-blue-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardDocumentListIcon className="h-5 w-5 text-blue-600" />
            Daftar Aktivitas
          </CardTitle>
          <CardDescription>
            {filteredLogs.length} aktivitas ditemukan
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BellIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Belum ada aktivitas</p>
              <p className="text-sm">Aktivitas sistem akan muncul di sini</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredLogs.map((log, idx) => {
                const color = getTypeColor(log.type)
                return (
                  <div 
                    key={log.id} 
                    className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors animate-slide-up"
                    style={{ animationDelay: `${idx * 20}ms` }}
                  >
                    <div className={`p-2 rounded-lg flex-shrink-0 ${color.bg} ${color.text}`}>
                      <BellIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{log.title}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${color.bg} ${color.text}`}>
                            {getTypeLabel(log.type)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatDateTime(log.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{log.message}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
