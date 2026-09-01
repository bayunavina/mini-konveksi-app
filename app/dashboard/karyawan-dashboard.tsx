"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  BanknotesIcon,
  FlagIcon,
  CreditCardIcon,
  CheckIcon,
  PlusIcon,
  ArrowRightIcon,
  ChartBarIcon,
  TrophyIcon,
  ClockIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useSessionWithRole } from "@/lib/use-session-with-role"
import { toast } from "sonner"
import { useCurrency } from "@/hooks/useCurrency"

interface Assignment {
  id: string
  jobOrderId: string | null
  targetQty: number
  completedQty: number
  rejectedQty: number
  acceptedQty: number
  pendingQty: number
  qcRequestedAt: string | null
  ratePerUnit: number
  status: string
  notes: string | null
  assignedAt: string
  startedAt: string | null
  completedAt: string | null
  jobOrder: {
    id: string
    joNumber: string
    status?: string
  } | null
  product: {
    id: string
    name: string
    sku: string
  } | null
}

interface SalaryCalculation {
  employeeId: string
  employeeName: string
  periodWeek: string
  periodYear: number
  ratePerUnit: number
  totalCompletedQty: number
  estimatedSalary: number
}

interface SalaryClaim {
  id: string
  employeeId: string
  assignmentId: string
  totalSalary: number
  status: string
  createdAt: string
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

function getCurrentWeekPeriod(): { week: string; year: number } {
  const now = new Date()
  const week = `W${getWeekNumber(now)}`
  const year = now.getFullYear()
  return { week, year }
}

function getClaimPeriod(claim: SalaryClaim): { week: string; year: number } {
  const claimDate = new Date(claim.createdAt)
  return {
    week: `W${getWeekNumber(claimDate)}`,
    year: claimDate.getFullYear()
  }
}

function formatDateDMY(): string {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, "0")
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const year = now.getFullYear()
  return `${day}/${month}/${year}`
}

function getStatusColor(status: string) {
  switch (status) {
    case "ASSIGNED":
      return "bg-[var(--chart-blue)]/10 text-[var(--chart-blue)] dark:text-[var(--chart-blue)]"
    case "IN_PROGRESS":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
    case "QC_REQUESTED":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
    case "REJECTED":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
    default:
      return "bg-muted text-muted-foreground"
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "ASSIGNED":
      return "Ditugaskan"
    case "IN_PROGRESS":
      return "Sedang Dikerjakan"
    case "QC_REQUESTED":
      return "Menunggu QC"
    case "COMPLETED":
      return "Selesai"
    case "REJECTED":
      return "Ditolak"
    default:
      return status
  }
}

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: IconComponent, 
  trend,
}: { 
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  trend?: "up" | "down" | "neutral"
}) {
  return (
    <Card className="hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30 transition-all duration-300 animate-slide-up">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 px-4">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <IconComponent className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:scale-110" />
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex items-end gap-2">
          <div className="text-xl sm:text-2xl font-bold">{value}</div>
          {trend && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              trend === "up" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : 
              trend === "down" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : 
              "bg-muted text-muted-foreground"
            }`}>
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground/70 mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

function AssignmentCard({ assignment, onInputClick, onConfirmClick, onRequestQC }: { assignment: Assignment; onInputClick: (assignment: Assignment) => void; onConfirmClick: (assignment: Assignment) => void; onRequestQC: (assignment: Assignment) => void }) {
  const { formatCurrency } = useCurrency()
  const completedProgress = Math.round((assignment.acceptedQty / assignment.targetQty) * 100)
  const remaining = assignment.targetQty - assignment.acceptedQty
  
  return (
    <Card className="group relative hover:shadow-lg hover:border-primary/30 transition-all duration-300 animate-slide-up">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-foreground">
                {assignment.jobOrder?.joNumber || "Manual"}
              </h4>
              <Badge className={`${getStatusColor(assignment.status)} text-xs font-medium`}>
                {getStatusLabel(assignment.status)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {assignment.product?.name || "Produk tidak ditemukan"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Rate</p>
            <p className="text-sm font-semibold text-primary">
              {formatCurrency(Number(assignment.ratePerUnit || 0))}/pcs
            </p>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold text-foreground">{completedProgress}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden flex">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(completedProgress, 100)}%` }}
            />
          </div>
          
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="rounded-xl p-2 border border-[var(--chart-blue)]/30 dark:border-[var(--chart-blue)] shadow-sm">
              <p className="text-xs text-[var(--chart-blue)] dark:text-[var(--chart-blue)] mb-0.5">Target</p>
              <p className="font-bold text-[var(--chart-blue)] dark:text-[var(--chart-blue)]">{assignment.targetQty}</p>
            </div>
            <div className="rounded-xl p-2 border border-amber-300 dark:border-amber-600 shadow-sm">
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-0.5">Pending</p>
              <p className="font-bold text-amber-700 dark:text-amber-300">{assignment.pendingQty || 0}</p>
            </div>
            <div className="rounded-xl p-2 border border-emerald-300 dark:border-emerald-600 shadow-sm">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-0.5">Lolos QC</p>
              <p className="font-bold text-emerald-700 dark:text-emerald-300">{assignment.acceptedQty || 0}</p>
            </div>
            <div className="rounded-xl p-2 border border-red-300 dark:border-red-600 shadow-sm">
              <p className="text-xs text-red-600 dark:text-red-400 mb-0.5">Sisa</p>
              <p className="font-bold text-red-700 dark:text-red-300">{remaining > 0 ? remaining : 0}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              {new Date(assignment.assignedAt).toLocaleDateString("id-ID", { 
                day: "numeric", 
                month: "short" 
              })}
            </p>
            <div className="flex gap-2">
              {(assignment.status === "IN_PROGRESS" || assignment.status === "ASSIGNED") && assignment.pendingQty > 0 && !assignment.qcRequestedAt && (
                <Button 
                  size="sm" 
                  className="h-8 text-xs bg-orange-500 hover:bg-orange-600"
                  onClick={() => onRequestQC(assignment)}
                >
                  Request QC
                </Button>
              )}
              {assignment.status === "ASSIGNED" && !assignment.qcRequestedAt && (
                <Button 
                  size="sm" 
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => onConfirmClick(assignment)}
                >
                  ✓ Terima
                </Button>
              )}
              {assignment.status === "IN_PROGRESS" && !assignment.qcRequestedAt && (
                <Button size="sm" className="h-8 text-xs" onClick={() => onInputClick(assignment)}>
                  Input Hasil
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function KaryawanDashboard() {
  const { user } = useSessionWithRole()
  const { formatCurrency, formatNumber, currencySymbol } = useCurrency()
  const [isLoading, setIsLoading] = useState(true)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [salaryCalc, setSalaryCalc] = useState<SalaryCalculation | null>(null)
  const [salaryClaims, setSalaryClaims] = useState<SalaryClaim[]>([])
  const [kasbonBalance, setKasbonBalance] = useState(0)
  const [kasbonCount, setKasbonCount] = useState(0)
  const [totalGaji, setTotalGaji] = useState(0)
  const [showHistory, setShowHistory] = useState(false)

  const [klaimModalOpen, setKlaimModalOpen] = useState(false)
  const [kasbonModalOpen, setKasbonModalOpen] = useState(false)
  const [slipModalOpen, setSlipModalOpen] = useState(false)
  const [inputModalOpen, setInputModalOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)

  const [kasbonAmount, setKasbonAmount] = useState("")
  const [kasbonPurpose, setKasbonPurpose] = useState("")
  const [inputQty, setInputQty] = useState("")
  const [inputNotes, setInputNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { week, year } = getCurrentWeekPeriod()
  const fetchingRef = useRef(false)

  const fetchData = useCallback(async () => {
    if (!user?.employeeId || fetchingRef.current) return
    
    fetchingRef.current = true
    setIsLoading(true)
    try {
      const currentWeek = getCurrentWeekPeriod()
      const [assignRes, calcRes, kasbonRes, salaryRes] = await Promise.all([
        fetch(`/api/production/assign?employeeId=${user.employeeId}`),
        fetch(`/api/production-logs/calculate?employeeId=${user.employeeId}&periodWeek=${currentWeek.week}&periodYear=${currentWeek.year}`),
        fetch(`/api/advances?employeeId=${user.employeeId}`),
        fetch(`/api/admin/salary-claims?employeeId=${user.employeeId}`),
      ])

      if (assignRes.ok) {
        const data = await assignRes.json()
        setAssignments(Array.isArray(data) ? data : [])
      }

      if (calcRes.ok) {
        const calc = await calcRes.json()
        if (calc.error) {
          console.error("Salary calculation error:", calc.error)
          setSalaryCalc({
            employeeId: user.employeeId,
            employeeName: user.name || "Karyawan",
            periodWeek: currentWeek.week,
            periodYear: currentWeek.year,
            ratePerUnit: 0,
            totalCompletedQty: 0,
            estimatedSalary: 0,
          })
        } else {
          setSalaryCalc(calc)
        }
      } else {
        setSalaryCalc({
          employeeId: user.employeeId,
          employeeName: user.name || "Karyawan",
          periodWeek: currentWeek.week,
          periodYear: currentWeek.year,
          ratePerUnit: 0,
          totalCompletedQty: 0,
          estimatedSalary: 0,
        })
      }

      if (kasbonRes.ok) {
        const kasbonData = await kasbonRes.json()
        // Sisa kasbon = PENDING (belum lunas)
        const unpaidKasbon = (kasbonData || []).filter((k: { status: string }) => k.status === "PENDING" || k.status === "APPROVED")
        const kasbonBalanceAmount = unpaidKasbon.reduce((sum: number, k: { amount: number; paidAmount?: number }) => {
          const remaining = (k.amount || 0) - (k.paidAmount || 0)
          return sum + Math.max(0, remaining)
        }, 0)
        setKasbonBalance(kasbonBalanceAmount)
        setKasbonCount(unpaidKasbon.length)
      }

      // Process salary claims
      if (salaryRes.ok) {
        const salaryData = await salaryRes.json()
        // Total Gaji = sum of all PAID salary claims
        const totalGajiAmount = (salaryData || []).reduce((sum: number, s: { totalSalary?: number | string }) => {
          const val = typeof s.totalSalary === 'string' ? parseFloat(s.totalSalary) || 0 : s.totalSalary || 0
          return sum + val
        }, 0)
        setTotalGaji(Math.round(totalGajiAmount))
        setSalaryClaims(Array.isArray(salaryData) ? salaryData : [])
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
      fetchingRef.current = false
    }
  }, [user?.employeeId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const assignedAssignments = assignments.filter(a => a.status === "ASSIGNED")
  const inProgressAssignments = assignments.filter(a => a.status === "IN_PROGRESS")
  const qcRequestedAssignments = assignments.filter(a => a.status === "QC_REQUESTED")
  const activeAssignments = [...assignedAssignments, ...inProgressAssignments, ...qcRequestedAssignments]
  const completedAssignments = assignments.filter(a => a.status === "COMPLETED" || a.status === "REJECTED")
  const hasAnyAssignments = assignments.length > 0
  const allCompleted = completedAssignments.length > 0 && activeAssignments.length === 0
  const totalTarget = assignments.reduce((sum, a) => sum + a.targetQty, 0)
  const totalAccepted = assignments.reduce((sum, a) => sum + (a.acceptedQty || 0), 0)
  const totalRejected = assignments.reduce((sum, a) => sum + (a.rejectedQty || 0), 0)

  const canClaimThisPeriod = () => {
    const periodClaim = salaryClaims.find(c => {
      const claimPeriod = getClaimPeriod(c)
      return claimPeriod.week === week && claimPeriod.year === year
    })
    return !periodClaim || periodClaim.status === "PENDING" || periodClaim.status === "CLAIMED"
  }

  const getClaimStatus = () => {
    const periodClaim = salaryClaims.find(c => {
      const claimPeriod = getClaimPeriod(c)
      return claimPeriod.week === week && claimPeriod.year === year
    })
    if (!periodClaim) return null
    return periodClaim.status
  }

  const claimStatus = getClaimStatus()

  const progressPercent = totalTarget > 0 ? Math.round((totalAccepted / totalTarget) * 100) : 0

  const handleKlaimGaji = async () => {
    if (!user?.employeeId || !salaryCalc) return
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/karyawan/gaji/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: user.employeeId,
          periodWeek: week,
          periodYear: year,
        }),
      })
      const isJson = response.headers.get("content-type")?.includes("application/json")
      if (response.ok) {
        setKlaimModalOpen(false)
        toast.success("Klaim gaji berhasil!", {
          description: "Permintaan akan diproses oleh admin.",
          duration: 4000,
        })
      } else {
        let errorMessage = "Terjadi kesalahan"
        if (isJson) {
          try {
            const error = await response.json()
            errorMessage = error.message || error.error || "Terjadi kesalahan"
          } catch {
            errorMessage = `Error ${response.status}`
          }
        } else {
          errorMessage = `Server error: ${response.status}`
        }
        toast.error("Gagal klaim gaji", {
          description: errorMessage,
        })
      }
    } catch (error) {
      console.error("Error claiming salary:", error)
      toast.error("Terjadi kesalahan", {
        description: "Tidak dapat terhubung ke server",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAjukanKasbon = async () => {
    if (!user?.employeeId || !kasbonAmount) return
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/advances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: user.employeeId,
          amount: parseInt(kasbonAmount),
          purpose: kasbonPurpose,
        }),
      })
      const isJson = response.headers.get("content-type")?.includes("application/json")
      if (response.ok) {
        setKasbonModalOpen(false)
        setKasbonAmount("")
        setKasbonPurpose("")
        toast.success("Kasbon berhasil diajukan!", {
          description: "Menunggu persetujuan admin.",
          duration: 4000,
        })
      } else {
        let errorMessage = "Terjadi kesalahan"
        if (isJson) {
          try {
            const error = await response.json()
            errorMessage = error.message || error.error || "Terjadi kesalahan"
          } catch {
            errorMessage = `Error ${response.status}`
          }
        } else {
          errorMessage = `Server error: ${response.status}`
        }
        toast.error("Gagal mengajukan kasbon", {
          description: errorMessage,
        })
      }
    } catch (error) {
      console.error("Error submitting kasbon:", error)
      toast.error("Terjadi kesalahan", {
        description: "Tidak dapat terhubung ke server",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputClick = (assignment: Assignment) => {
    setSelectedAssignment(assignment)
    setInputQty("")
    setInputNotes("")
    setInputModalOpen(true)
  }

  const handleConfirmClick = async (assignment: Assignment) => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/production/assign/${assignment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      })
      
      if (response.ok) {
        toast.success("Job Order diterima", {
          description: "Sekarang Anda dapat memulai input hasil produksi",
        })
        setAssignments(assignments.map(a => 
          a.id === assignment.id ? { ...a, status: "IN_PROGRESS" } : a
        ))
      } else {
        const data = await response.json()
        toast.error("Gagal menerima Job Order", {
          description: data.error || "Terjadi kesalahan",
        })
      }
    } catch (error) {
      console.error("Error confirming assignment:", error)
      toast.error("Terjadi kesalahan", {
        description: "Tidak dapat terhubung ke server",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRequestQC = async (assignment: Assignment) => {
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/production/request-qc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          assignmentId: assignment.id,
          employeeId: user?.id,
        }),
      })
      
      if (response.ok) {
        toast.success("Request QC berhasil!", {
          description: `${assignment.pendingQty} pcs menunggu verifikasi QC`,
        })
        setAssignments(assignments.map(a => 
          a.id === assignment.id ? { ...a, status: "QC_REQUESTED", qcRequestedAt: new Date().toISOString() } : a
        ))
      } else {
        const data = await response.json()
        toast.error(data.error || "Gagal Request QC", {
          description: data.message,
        })
      }
    } catch (error) {
      console.error("Error requesting QC:", error)
      toast.error("Terjadi kesalahan", {
        description: "Tidak dapat terhubung ke server",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitInput = async () => {
    if (!selectedAssignment || !inputQty) return

    if (selectedAssignment.jobOrder?.status === "HOLD") {
      toast.error("Job Order sedang di-hold, tidak bisa input progress")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/production/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: selectedAssignment.id,
          employeeId: user?.employeeId,
          qtyCompleted: parseInt(inputQty),
          qtyRejected: 0,
          notes: inputNotes,
        }),
      })
      const contentType = response.headers.get("content-type")
      const isJson = contentType?.includes("application/json")
      
      if (response.ok) {
        const data = isJson ? await response.json() : {}
        setInputModalOpen(false)
        setSelectedAssignment(null)
        toast.success("Hasil produksi berhasil disimpan!", {
          description: `${inputQty} pcs ditambahkan. Total: ${data.acceptedQty || 0} pcs diterima.`,
          duration: 4000,
        })
        fetchData()
      } else {
        let errorMessage = "Terjadi kesalahan"
        if (isJson) {
          try {
            const error = await response.json()
            errorMessage = error.message || error.error || "Terjadi kesalahan"
          } catch {
            errorMessage = `Error ${response.status}`
          }
        } else {
          errorMessage = `Server error: ${response.status}`
        }
        toast.error("Gagal menyimpan hasil", {
          description: errorMessage,
        })
      }
    } catch (error) {
      console.error("Error submitting input:", error)
      toast.error("Terjadi kesalahan", {
        description: "Tidak dapat terhubung ke server",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Memuat data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-3 md:p-6 pt-4">
      {/* Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 rounded-2xl p-5 text-primary-foreground shadow-xl shadow-indigo-500/20 animate-slide-up">
        <div className="absolute top-0 right-0 opacity-10">
          <ChartBarIcon className="h-40 w-40 -translate-y-8 translate-x-8" />
        </div>
          <div className="relative z-10">
            <p className="text-xs font-medium opacity-80 mb-1">{formatDateDMY()}</p>
            <h2 className="text-xl font-bold mb-1">Selamat Datang, {user?.name || "Karyawan"}!</h2>
            <p className="text-sm opacity-80">
              {assignedAssignments.length} job order aktif menunggumu
            </p>
          </div>
      </div>

      {/* Quick Actions - Mobile */}
      <div className="flex gap-2 md:hidden">
        <Button className="flex-1 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 h-12 rounded-xl shadow-lg shadow-indigo-500/25" disabled>
          <PlusIcon className="h-5 w-5 mr-2" />
          Input Produksi
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <StatCard
          title="Total Gaji"
          value={formatCurrency(Math.round(totalGaji))}
          subtitle="Sudah diklaim"
          icon={BanknotesIcon}
          trend="up"
        />
        <StatCard
          title="Estimasi Gaji"
          value={formatCurrency(Math.round(salaryCalc?.estimatedSalary || 0))}
          subtitle={`Rate: ${formatCurrency(salaryCalc?.ratePerUnit || 0)}/pcs`}
          icon={BanknotesIcon}
          trend="up"
        />
        <StatCard
          title="JO QC OK"
          value={totalAccepted}
          subtitle={`${totalRejected} pcs ditolak`}
          icon={CheckIcon}
          trend="up"
        />
        <StatCard
          title="Sisa Kasbon"
          value={formatCurrency(kasbonBalance)}
          subtitle={kasbonBalance > 0 ? "Belum lunas" : "Lunas"}
          icon={CreditCardIcon}
          trend={kasbonBalance > 0 ? "down" : "neutral"}
        />
        <StatCard
          title="Jumlah Kasbon"
          value={kasbonCount}
          subtitle="Belum lunas"
          icon={CreditCardIcon}
          trend={kasbonCount > 0 ? "down" : "neutral"}
        />
      </div>

      {/* Job Order Aktif Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-card-foreground">
            {showHistory ? "Riwayat Job Order" : "Job Order Aktif"}
          </h3>
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm text-primary font-medium flex items-center gap-1"
          >
            {showHistory ? "Lihat Aktif" : "Lihat Riwayat"}
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>

        {showHistory ? (
          completedAssignments.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-2xl border border-border">
              <ClockIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">Belum ada riwayat job order</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedAssignments.map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} onInputClick={handleInputClick} onConfirmClick={handleConfirmClick} onRequestQC={handleRequestQC} />
              ))}
            </div>
          )
        ) : (
          !hasAnyAssignments ? (
            <div className="text-center py-12 bg-card rounded-2xl border border-border">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <ClipboardDocumentListIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <h4 className="font-semibold text-card-foreground mb-1">Belum Ada Job Order</h4>
              <p className="text-sm text-muted-foreground mb-4">Anda belum mendapatkan tugas job order</p>
            </div>
          ) : allCompleted ? (
            <div className="text-center py-12 bg-card rounded-2xl border border-border">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckIcon className="h-8 w-8 text-emerald-600" />
              </div>
              <h4 className="font-semibold text-card-foreground mb-1">Semua Job Order Selesai!</h4>
              <p className="text-sm text-muted-foreground mb-4">Tidak ada job order aktif saat ini</p>
              <Button variant="outline" className="rounded-xl" disabled>
                Input Produksi Manual
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeAssignments.map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} onInputClick={handleInputClick} onConfirmClick={handleConfirmClick} onRequestQC={handleRequestQC} />
              ))}
            </div>
          )
        )}
      </div>

      {/* Target Minggu - Progress Card */}
      <Card className="animate-slide-up" style={{ animationDelay: '100ms' }}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-violet-500/10 dark:bg-violet-500/20">
                <FlagIcon className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Target Minggu Ini</h3>
                <p className="text-xs text-muted-foreground">Progress target periode</p>
              </div>
            </div>
            {progressPercent >= 100 && (
              <div className="flex items-center gap-1 text-amber-500">
                <TrophyIcon className="h-5 w-5" />
                <span className="text-sm font-semibold">Target Tercapai!</span>
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{totalAccepted} dari {totalTarget} pcs</span>
              <span className="font-bold text-violet-600 dark:text-violet-400">{progressPercent}%</span>
            </div>
            <div className="h-4 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ 
                  width: `${Math.min(progressPercent, 100)}%`,
                  background: progressPercent < 30 
                    ? "#304ffe" 
                    : progressPercent < 70 
                      ? "linear-gradient(90deg, #304ffe 0%, #22c55e 100%)"
                      : "#22c55e"
                }}
              />
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl p-3 border-2 border-violet-300 dark:border-violet-600 shadow-sm">
                <p className="text-xs text-violet-600 dark:text-violet-400 mb-1">Target</p>
                <p className="text-lg font-bold text-violet-700 dark:text-violet-300">{totalTarget}</p>
              </div>
              <div className="rounded-xl p-3 border-2 border-emerald-300 dark:border-emerald-600 shadow-sm">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Diterima QC</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{totalAccepted}</p>
              </div>
              <div className="rounded-xl p-3 border-2 border-red-300 dark:border-red-600 shadow-sm">
                <p className="text-xs text-red-600 dark:text-red-400 mb-1">Ditolak</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{totalRejected}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-3 animate-slide-up" style={{ animationDelay: '100ms' }}>
        <Button 
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-1 hover:border-primary/30 transition-all duration-200"
          onClick={() => setKlaimModalOpen(true)}
          disabled={!canClaimThisPeriod()}
        >
          <BanknotesIcon className="h-5 w-5" />
          <span className="text-xs font-medium">
            {claimStatus === "PENDING" || claimStatus === "CLAIMED" ? "Sudah Diklaim" : "Klaim Gaji"}
          </span>
        </Button>
        <Button 
          variant="outline" 
          className="h-auto py-4 flex flex-col items-center gap-1 hover:border-primary/30 transition-all duration-200"
          onClick={() => setKasbonModalOpen(true)}
        >
          <CreditCardIcon className="h-5 w-5" />
          <span className="text-xs font-medium">Ajukan Kasbon</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-auto py-4 flex flex-col items-center gap-1 hover:border-primary/30 transition-all duration-200"
          onClick={() => setSlipModalOpen(true)}
        >
          <ChartBarIcon className="h-5 w-5" />
          <span className="text-xs font-medium">Slip Gaji</span>
        </Button>
      </div>

      {/* Bottom Spacing for Mobile Nav */}
      <div className="h-8 md:hidden" />

      {/* Klaim Gaji Modal */}
      <Dialog open={klaimModalOpen} onOpenChange={setKlaimModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {claimStatus === "PENDING" || claimStatus === "CLAIMED" ? "Klaim Gaji - Sudah Dikirim" : "Klaim Gaji"}
            </DialogTitle>
            <DialogDescription>
              Klaim gaji untuk periode {week}/{year}
              {claimStatus === "PENDING" && <span className="block text-yellow-600 mt-1">Status: Menunggu Persetujuan Admin</span>}
              {claimStatus === "CLAIMED" && <span className="block text-blue-600 mt-1">Status: Sudah Dikirim</span>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Produksi</span>
                <span className="font-medium">{salaryCalc?.totalCompletedQty || totalAccepted} pcs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Rate per Unit</span>
                <span className="font-medium">{formatCurrency(salaryCalc?.ratePerUnit || 0)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-sm font-medium">Estimasi Gaji</span>
                <span className="font-bold text-primary">{formatCurrency(salaryCalc?.estimatedSalary || 0)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold">
                <span>Total Diterima</span>
                <span className="text-emerald-600">{formatCurrency(salaryCalc?.estimatedSalary || 0)}</span>
              </div>
            </div>
            {claimStatus === "PENDING" || claimStatus === "CLAIMED" ? (
              <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
                * Klaim gaji Anda sudah dikirim dan menunggu persetujuan admin.
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                * Gaji akan diproses oleh admin dan transfer ke rekening Anda.
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setKlaimModalOpen(false)}>
              {claimStatus === "PENDING" || claimStatus === "CLAIMED" ? "Tutup" : "Batal"}
            </Button>
            {!(claimStatus === "PENDING" || claimStatus === "CLAIMED") && (
              <Button 
                className="bg-gradient-to-r from-emerald-500 to-emerald-600"
                onClick={handleKlaimGaji}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Memproses..." : "Klaim Sekarang"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Ajukan Kasbon Modal */}
      <Dialog open={kasbonModalOpen} onOpenChange={setKasbonModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ajukan Kasbon</DialogTitle>
            <DialogDescription>
              Ajukan kasbon untuk kebutuhan pribadi
            </DialogDescription>
          </DialogHeader>
            <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="kasbon-amount">Jumlah ({currencySymbol})</Label>
              <Input
                id="kasbon-amount"
                type="text"
                placeholder="Masukkan jumlah kasbon"
                value={kasbonAmount ? formatNumber(parseInt(kasbonAmount)) : ""}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d]/g, "")
                  setKasbonAmount(value)
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kasbon-purpose">Keperluan</Label>
              <Textarea
                id="kasbon-purpose"
                placeholder="Jelaskan keperluan kasbon..."
                value={kasbonPurpose}
                onChange={(e) => setKasbonPurpose(e.target.value)}
                rows={3}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              * Kasbon akan dipotong dari gaji Anda. Requires persetujuan admin.
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setKasbonModalOpen(false)}>
              Batal
            </Button>
            <Button 
              onClick={handleAjukanKasbon}
              disabled={isSubmitting || !kasbonAmount}
            >
              {isSubmitting ? "Mengirim..." : "Ajukan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Slip Gaji Modal */}
      <Dialog open={slipModalOpen} onOpenChange={setSlipModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Slip Gaji</DialogTitle>
            <DialogDescription>
              Slip Gaji Periode {week}/{year}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div id="slip-gaji-content" className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-sm text-muted-foreground">Nama Karyawan</span>
                <span className="font-medium">{user?.name || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Periode</span>
                <span className="font-medium">{week}/{year}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Produksi</span>
                <span className="font-medium">{salaryCalc?.totalCompletedQty || 0} pcs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Rate/Unit</span>
                <span className="font-medium">{formatCurrency(salaryCalc?.ratePerUnit || 0)}</span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="text-sm font-medium">Subtotal Gaji</span>
                <span className="font-medium">{formatCurrency(salaryCalc?.estimatedSalary || 0)}</span>
              </div>
              <div className="flex justify-between border-t pt-3 font-bold">
                <span>Total Diterima</span>
                <span className="text-lg text-emerald-600">{formatCurrency(salaryCalc?.estimatedSalary || 0)}</span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              * Slip ini adalah estimasi. Total aktual dapat berbeda setelah konfirmasi admin.
            </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSlipModalOpen(false)}>
                Tutup
              </Button>
            </div>
        </DialogContent>
      </Dialog>

      {/* Input Hasil Produksi Modal */}
      <Dialog open={inputModalOpen} onOpenChange={setInputModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Input Hasil Produksi</DialogTitle>
            <DialogDescription>
              Masukkan jumlah produksi untuk job order {selectedAssignment?.jobOrder?.joNumber || "Manual"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedAssignment && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Produk</span>
                  <span className="font-medium">{selectedAssignment.product?.name || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Target</span>
                  <span className="font-medium">{selectedAssignment.targetQty} pcs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Sudah Dibuat</span>
                  <span className="font-medium">{selectedAssignment.completedQty} pcs</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm text-muted-foreground">Sisa Target</span>
                  <span className="font-bold text-primary">
                    {selectedAssignment.targetQty - selectedAssignment.completedQty} pcs
                  </span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="input-qty">Jumlah Hasil (pcs)</Label>
              <Input
                id="input-qty"
                type="number"
                placeholder="Masukkan jumlah hasil produksi"
                value={inputQty}
                onChange={(e) => setInputQty(e.target.value)}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="input-notes">Catatan (Opsional)</Label>
              <Textarea
                id="input-notes"
                placeholder="Tambahkan catatan jika ada..."
                value={inputNotes}
                onChange={(e) => setInputNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setInputModalOpen(false)}>
              Batal
            </Button>
            <Button 
              onClick={handleSubmitInput}
              disabled={isSubmitting || !inputQty}
            >
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
