"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { useSessionWithRole } from "@/lib/use-session-with-role"

const printStyles = `
  @media print {
    .no-print { display: none !important; }
    .print-only { display: block !important; }
    body { font-size: 12px; }
    .card { border: 1px solid #ddd !important; box-shadow: none !important; }
  }
  .print-only { display: none; }
`
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FormattedNumberInput } from "@/components/ui/formatted-number-input"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/shared"
import { HppSheetPrint } from "@/components/shared/hpp-sheet-print"
import {
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon,
  PencilIcon,
  PrinterIcon,
  CubeIcon,
} from "@heroicons/react/24/outline"
import { JOB_ORDER_STATUS_LABELS, JOB_ORDER_STATUS_COLORS, type JobOrderStatus } from "@/types/production"
import { formatDate } from "@/lib/utils"
import { useFetch } from "@/hooks/useFetch"
import { useCurrency } from "@/hooks/useCurrency"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

interface JobOrderDetail {
  id: string
  joNumber: string
  targetQty: number
  completedQty: number
  rejectedQty: number
  acceptedQty?: number
  status: JobOrderStatus
  dueDate?: string
  notes?: string
  createdAt: string
  updatedAt?: string
  bopEstimated?: number | string
  bopActual?: number | string
  bopPerPcs?: number | string
  product?: {
    id: string
    sku: string
    name: string
  }
  team?: {
    id: string
    name: string
  }
  reports?: Array<{
    id: string
    date: string
    success: number
    reject: number
    notes?: string
    reportedBy?: string
  }>
}

interface JobOrderCost {
  id: string
  jobOrderId: string
  costCategoryCode: string
  costCategoryName: string
  type: "DIRECT" | "INDIRECT"
  estimatedAmount: number
  actualAmount: number
  notes?: string
}

interface CostCategory {
  id: string
  code: string
  name: string
  type: "DIRECT" | "INDIRECT"
}

interface Transaction {
  id: string
  date: string
  type: string
  category: string
  amount: number
  description?: string
  reference?: string
  jobOrderId?: string
}

export default function JobOrderDetailPage({ params }: { params: Promise<{ joNumber: string }> }) {
  const { joNumber } = use(params)
  const router = useRouter()
  const { formatCurrency } = useCurrency()
  const { user } = useSessionWithRole()
  const userRole = user?.role || "GUEST"
  const isKaryawan = userRole === "KARYAWAN"
  const backUrl = isKaryawan ? "/dashboard" : "/dashboard/produksi"
  
  const handleBack = () => {
    router.push(backUrl)
  }
  
  const [jobOrder, setJobOrder] = useState<JobOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [qcDialogOpen, setQCDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [reportData, setReportData] = useState({ success: "", reject: "", notes: "" })
  const [editData, setEditData] = useState({
    targetQty: 0,
    dueDate: "",
    notes: "",
  })
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false)
  const [expenseForm, setExpenseForm] = useState({ category: "", amount: "", description: "" })

  // Fetch biaya HPP & transaksi terhubung
  const { data: costs, refetch: refetchCosts } = useFetch<JobOrderCost[]>(jobOrder ? `/api/job-orders/${jobOrder.id}/costs` : null as any)
  const { data: costCategories } = useFetch<CostCategory[]>("/api/cost-categories?all=true")
  const { data: linkedTransactions, refetch: refetchTx } = useFetch<Transaction[]>(jobOrder ? `/api/transactions?jobOrderId=${jobOrder.id}` : null as any)
  // Untuk BOP allocation: butuh semua transaksi & semua JO dalam periode yang sama
  const { data: allTransactions } = useFetch<Transaction[]>(jobOrder ? `/api/transactions` : null as any)
  const { data: allJoResponse } = useFetch<{ data: Array<{ id: string; targetQty: number; createdAt: string }> }>(jobOrder ? `/api/job-orders?limit=100` : null as any)

  useEffect(() => {
    fetchJobOrder()
  }, [joNumber])

  useEffect(() => {
    if (jobOrder?.joNumber) {
      document.title = `JO ${jobOrder.joNumber} - Mini Konveksi`
    }
  }, [jobOrder])

  useEffect(() => {
    if (costCategories && costs === null) {
      // initial load handled by useFetch
    }
  }, [costCategories])

  const fetchJobOrder = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/job-orders/${joNumber}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setJobOrder(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  const progressPercent = jobOrder 
    ? Math.round((jobOrder.completedQty / jobOrder.targetQty) * 100) 
    : 0

  // HPP Calculations
  const totalEstimated = (costs || []).filter(c => c.type === "DIRECT").reduce((sum, c) => sum + (c.estimatedAmount || 0), 0)
  const totalActual = (costs || []).filter(c => c.type === "DIRECT").reduce((sum, c) => sum + (c.actualAmount || 0), 0)
  const totalEstimatedAll = (costs || []).reduce((sum, c) => sum + (c.estimatedAmount || 0), 0)
  const totalActualAll = (costs || []).reduce((sum, c) => sum + (c.actualAmount || 0), 0)
  const hppPerPcsEst = jobOrder && jobOrder.targetQty ? Math.round(totalEstimated / jobOrder.targetQty) : 0
  const hppPerPcsActual = jobOrder && jobOrder.targetQty ? Math.round(totalActual / Math.max(1, jobOrder.acceptedQty || jobOrder.completedQty || 1)) : 0
  const variance = totalActual - totalEstimated
  const variancePct = totalEstimated > 0 ? Math.round((variance / totalEstimated) * 100) : 0

  // P2-1 BOP Allocation: total BOP periode / total pcs periode
  const joMonth = jobOrder ? new Date(jobOrder.createdAt).toISOString().slice(0, 7) : null
  const indirectSet = new Set((costCategories || []).filter(c => c.type === "INDIRECT").map(c => c.code))
  const legacyIndirect = new Set(["GTL","LST","SEWA","MTC","BPJS","KON","ADM","MKT","SALARY","RENT","UTILITY","OTHER"])
  const isIndirectCategory = (code: string) => indirectSet.has(code) || legacyIndirect.has(code)
  const totalBopMonth = joMonth ? (allTransactions || []).filter(t => t.type === "EXPENSE" && isIndirectCategory(t.category) && t.date && new Date(t.date).toISOString().slice(0,7) === joMonth).reduce((sum, t) => sum + (t.amount || 0), 0) : 0
  const totalPcsMonth = joMonth ? (allJoResponse?.data || []).filter(jo => jo.createdAt && new Date(jo.createdAt).toISOString().slice(0,7) === joMonth).reduce((sum, jo) => sum + (jo.targetQty || 0), 0) : 0
  const bopPerPcs = totalPcsMonth > 0 ? Math.round(totalBopMonth / totalPcsMonth) : 0
  const allocatedBop = bopPerPcs * (jobOrder?.targetQty || 0)
  const fullHppEst = totalEstimated + allocatedBop
  const fullHppActual = totalActual + (jobOrder ? allocatedBop : 0) // aktual + alokasi (belum ada aktual BOP per JO, pakai alokasi)
  const fullHppPerPcsEst = jobOrder?.targetQty ? Math.round(fullHppEst / jobOrder.targetQty) : 0
  const fullHppPerPcsActual = jobOrder?.targetQty ? Math.round(fullHppActual / Math.max(1, jobOrder.acceptedQty || jobOrder.completedQty || 1)) : 0

  const handleAddExpense = async () => {
    if (!jobOrder || !expenseForm.category || !expenseForm.amount) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "EXPENSE",
          category: expenseForm.category,
          amount: parseInt(expenseForm.amount) || 0,
          description: expenseForm.description || `Biaya JO ${jobOrder.joNumber}`,
          reference: jobOrder.joNumber,
          jobOrderId: jobOrder.id,
          date: new Date().toISOString(),
        }),
      })
      if (res.ok) {
        toast.success("Biaya aktual tercatat & terhubung ke JO")
        setExpenseDialogOpen(false)
        setExpenseForm({ category: "", amount: "", description: "" })
        refetchCosts()
        refetchTx()
      } else {
        toast.error("Gagal mencatat biaya")
      }
    } catch (err) {
      console.error(err)
      toast.error("Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitReport = async () => {
    if (!jobOrder) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/qc-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobOrderId: jobOrder.id,
          successQty: parseInt(reportData.success || "0"),
          rejectQty: parseInt(reportData.reject || "0"),
          notes: reportData.notes,
          rejectReason: reportData.reject && parseInt(reportData.reject) > 0 ? "Tidak lolos QC" : null,
        }),
      })
      if (res.ok) {
        await fetchJobOrder()
        setReportDialogOpen(false)
        setReportData({ success: "", reject: "", notes: "" })
      } else {
        const error = await res.json()
        console.error("Error:", error)
      }
    } catch (err) {
      console.error("Error submitting report:", err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleApproveQC = async () => {
    if (!jobOrder) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/job-orders/${jobOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      })
      if (res.ok) {
        await fetchJobOrder()
        setQCDialogOpen(false)
      }
    } catch (err) {
      console.error("Error approving QC:", err)
    } finally {
      setSubmitting(false)
    }
  }

  const openEditDialog = () => {
    if (!jobOrder) return
    setEditData({
      targetQty: jobOrder.targetQty,
      dueDate: jobOrder.dueDate || "",
      notes: jobOrder.notes || "",
    })
    setEditDialogOpen(true)
  }

  const handleEdit = async () => {
    if (!jobOrder) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/job-orders/${jobOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetQty: parseInt(editData.targetQty.toString()) || jobOrder.targetQty,
          dueDate: editData.dueDate || null,
          notes: editData.notes || null,
        }),
      })
      if (res.ok) {
        await fetchJobOrder()
        setEditDialogOpen(false)
      }
    } catch (err) {
      console.error("Error editing job order:", err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-6 px-4 md:px-6 pt-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error || !jobOrder) {
    return (
      <div className="flex-1 space-y-6 px-4 md:px-6 pt-4">
        <PageHeader
          title="Error"
          description={error || "Job order not found"}
        />
        <Button onClick={() => router.push("/dashboard/produksi")}>
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Kembali
        </Button>
      </div>
    )
  }

  return (
    <>
      <style>{printStyles}</style>
      <div className="flex-1 space-y-6 px-4 md:px-6 pt-4 no-print">
        <PageHeader
          title={jobOrder.joNumber}
          description="Detail job order produksi"
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Kembali
              </Button>
              <HppSheetPrint
                joNumber={jobOrder.joNumber}
                productName={jobOrder.product?.name || "-"}
                productSku={jobOrder.product?.sku || "-"}
                targetQty={jobOrder.targetQty || 0}
                completedQty={jobOrder.completedQty || 0}
                acceptedQty={jobOrder.acceptedQty || jobOrder.completedQty || 0}
                startDate={jobOrder.createdAt}
                endDate={jobOrder.updatedAt}
                costs={(costs || []).map(c => ({
                  costCategoryCode: c.costCategoryCode,
                  costCategoryName: c.costCategoryName || c.costCategoryCode,
                  type: c.type,
                  estimatedAmount: Number(c.estimatedAmount) || 0,
                  actualAmount: Number(c.actualAmount) || 0,
                }))}
                totalEstimated={totalEstimated}
                totalActual={totalActual}
                bopEstimated={Number(jobOrder.bopEstimated) || 0}
                bopActual={Number(jobOrder.bopActual) || 0}
                bopPerPcs={Number(jobOrder.bopPerPcs) || 0}
                hppPerPcsEst={hppPerPcsEst}
                hppPerPcsActual={hppPerPcsActual}
              />
              <Button variant="outline" onClick={() => window.print()}>
                <PrinterIcon className="mr-2 h-4 w-4" />
                Print
              </Button>
              {!isKaryawan && (
                <Button variant="outline" onClick={openEditDialog}>
                  <PencilIcon className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>
          }
        />
      </div>
      
      <div className="grid gap-6 px-4 md:px-6 pb-4 md:grid-cols-2">
        <Card className="p-0">
          <CardHeader className="pb-4 pt-5 px-5 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Informasi Job Order</CardTitle>
                <CardDescription>Detail JO #{jobOrder.joNumber}</CardDescription>
              </div>
              <Badge className={`${JOB_ORDER_STATUS_COLORS[jobOrder.status]}`}>
                {JOB_ORDER_STATUS_LABELS[jobOrder.status]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 px-5 py-5">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">SKU</p>
                <p className="font-medium">{jobOrder.product?.name || "-"}</p>
                <p className="text-xs text-muted-foreground">{jobOrder.product?.sku}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Tim Produksi</p>
                <p className="font-medium">{jobOrder.team?.name || "-"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Target</p>
                <p className="font-medium">{jobOrder.targetQty} Pcs</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Selesai</p>
                <p className="font-medium">{jobOrder.completedQty} Pcs</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Reject</p>
                <p className="font-medium">{jobOrder.rejectedQty} Pcs</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Deadline</p>
                <p className="font-medium">
                  {formatDate(jobOrder.dueDate)}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span className="font-medium">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-3" />
            </div>
          </CardContent>
        </Card>

        <Card className="p-0">
          <CardHeader className="pb-4 pt-5 px-5 border-b">
            <CardTitle>Statistik</CardTitle>
            <CardDescription>Ringkasan job order</CardDescription>
          </CardHeader>
          <CardContent className="px-5 py-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                <p className="text-sm text-green-600 font-medium">Berhasil (QC)</p>
                <p className="text-2xl font-bold text-green-700">{jobOrder.acceptedQty ?? jobOrder.completedQty}</p>
                <p className="text-xs text-green-600/70">Pcs</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                <p className="text-sm text-red-600 font-medium">Reject</p>
                <p className="text-2xl font-bold text-red-700">{jobOrder.rejectedQty}</p>
                <p className="text-xs text-red-600/70">Pcs</p>
              </div>
              <div className="p-4 bg-[var(--chart-blue)]/10 rounded-lg border border-[var(--chart-blue)]/20">
                <p className="text-sm text-[var(--chart-blue)] font-medium">Total Diproduksi</p>
                <p className="text-2xl font-bold text-[var(--chart-blue)]">
                  {(jobOrder.acceptedQty ?? jobOrder.completedQty) + jobOrder.rejectedQty}
                </p>
                <p className="text-xs text-[var(--chart-blue)]/70">Pcs</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                <p className="text-sm text-yellow-600 font-medium">Sisa Target</p>
                <p className="text-2xl font-bold text-yellow-700">
                  {Math.max(0, jobOrder.targetQty - (jobOrder.acceptedQty ?? jobOrder.completedQty) - jobOrder.rejectedQty)}
                </p>
                <p className="text-xs text-yellow-600/70">Pcs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Biaya Produksi (HPP) - Terhubung Master Kategori Biaya */}
      <Card className="mx-4 md:mx-6 mb-4 p-0 border-amber-200">
        <CardHeader className="pb-4 pt-5 px-5 border-b bg-amber-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CubeIcon className="h-5 w-5 text-amber-600" />
                Biaya Produksi (HPP)
              </CardTitle>
              <CardDescription>
                Estimasi vs Aktual • 6 DIRECT (HPP) + 8 INDIRECT • Terhubung Master `cost_categories` & transaksi keuangan
              </CardDescription>
            </div>
            {!isKaryawan && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => refetchCosts()}>
                  Refresh
                </Button>
                <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                      + Catat Biaya Aktual
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Catat Biaya Aktual untuk {jobOrder.joNumber}</DialogTitle>
                      <DialogDescription>Pilih kategori biaya & nominal, otomatis terhubung ke JO ini</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Kategori Biaya</Label>
                        <Select value={expenseForm.category} onValueChange={(v) => setExpenseForm({ ...expenseForm, category: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih kategori" />
                          </SelectTrigger>
                          <SelectContent>
                            {(costCategories || []).length > 0 ? (
                              <>
                                <div className="px-2 py-1.5 text-xs font-semibold text-green-700 bg-green-50">DIRECT - Masuk HPP</div>
                                {(costCategories || []).filter(c=>c.type==="DIRECT").map(c=>(
                                  <SelectItem key={c.code} value={c.code}>{c.code} - {c.name}</SelectItem>
                                ))}
                                <div className="px-2 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 mt-1">INDIRECT - BOP</div>
                                {(costCategories || []).filter(c=>c.type==="INDIRECT").map(c=>(
                                  <SelectItem key={c.code} value={c.code}>{c.code} - {c.name}</SelectItem>
                                ))}
                              </>
                            ) : (
                              <SelectItem value="BBL" disabled>Memuat...</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Nominal (Rp)</Label>
                        <Input type="text" placeholder="0" value={expenseForm.amount ? Number(expenseForm.amount).toLocaleString("id-ID") : ""} onChange={(e)=>{ const v=e.target.value.replace(/[^\d]/g,""); setExpenseForm({...expenseForm, amount: v}) }} />
                      </div>
                      <div className="space-y-2">
                        <Label>Deskripsi</Label>
                        <Input placeholder="Contoh: Beli kain 20m untuk JO" value={expenseForm.description} onChange={(e)=>setExpenseForm({...expenseForm, description: e.target.value})} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={()=>setExpenseDialogOpen(false)}>Batal</Button>
                      <Button onClick={handleAddExpense} disabled={!expenseForm.category || !expenseForm.amount || submitting}>
                        {submitting && <Spinner data-icon="inline-start" />}
                        Simpan Biaya
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-5 py-5 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700 font-medium">Estimasi HPP (DIRECT)</p>
              <p className="text-lg font-bold text-amber-800">{formatCurrency(totalEstimated)}</p>
              <p className="text-xs text-amber-600">{formatCurrency(hppPerPcsEst)}/pcs • {jobOrder.targetQty} pcs</p>
            </div>
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-xs text-orange-700 font-medium">Aktual HPP (DIRECT)</p>
              <p className="text-lg font-bold text-orange-800">{formatCurrency(totalActual)}</p>
              <p className="text-xs text-orange-600">{formatCurrency(hppPerPcsActual)}/pcs • aktual</p>
            </div>
            <div className={`p-3 border rounded-lg ${variance <= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
              <p className={`text-xs font-medium ${variance <= 0 ? "text-green-700" : "text-red-700"}`}>Selisih (Aktual-Est)</p>
              <p className={`text-lg font-bold ${variance <= 0 ? "text-green-800" : "text-red-800"}`}>{variance>0?"+":""}{formatCurrency(variance)}</p>
              <p className={`text-xs ${variance <= 0 ? "text-green-600" : "text-red-600"}`}>{variancePct}% {variance<=0?"hemat":"over"}</p>
            </div>
            <div className="p-3 bg-slate-50 border rounded-lg">
              <p className="text-xs text-slate-600 font-medium">Total Biaya (All)</p>
              <p className="text-lg font-bold">{formatCurrency(totalActualAll)}</p>
              <p className="text-xs text-muted-foreground">Est {formatCurrency(totalEstimatedAll)}</p>
            </div>
          </div>

          {/* P2-1 BOP Allocation */}
          <div className="p-4 bg-violet-50 border border-violet-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-violet-800">Alokasi BOP Periode ({joMonth || "-"})</h4>
              <Badge className="bg-violet-100 text-violet-800 border-violet-200">INDIRECT / 8 kategori</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-violet-600">Total BOP Bulan Ini</p>
                <p className="font-bold text-violet-800">{formatCurrency(totalBopMonth)}</p>
                <p className="text-xs text-muted-foreground">Semua INDIRECT transaksi</p>
              </div>
              <div>
                <p className="text-xs text-violet-600">Total Pcs Bulan Ini</p>
                <p className="font-bold text-violet-800">{totalPcsMonth} pcs</p>
                <p className="text-xs text-muted-foreground">{allJoResponse?.data?.length || 0} JO</p>
              </div>
              <div>
                <p className="text-xs text-violet-600">BOP / Pcs</p>
                <p className="font-bold text-violet-800">{formatCurrency(bopPerPcs)}</p>
                <p className="text-xs text-muted-foreground">Alokasi per pcs</p>
              </div>
              <div>
                <p className="text-xs text-violet-600">Alokasi BOP JO Ini</p>
                <p className="font-bold text-violet-800">{formatCurrency(allocatedBop)}</p>
                <p className="text-xs text-muted-foreground">{jobOrder.targetQty} pcs × {formatCurrency(bopPerPcs)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-violet-200">
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-xs text-amber-700 font-medium">Full HPP Est (DIRECT + BOP)</p>
                <p className="text-lg font-bold text-amber-800">{formatCurrency(fullHppEst)}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(fullHppPerPcsEst)}/pcs</p>
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-xs text-orange-700 font-medium">Full HPP Aktual (DIRECT + BOP)</p>
                <p className="text-lg font-bold text-orange-800">{formatCurrency(fullHppActual)}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(fullHppPerPcsActual)}/pcs</p>
              </div>
            </div>
            <p className="text-xs text-violet-600 mt-2">Rumus: BOP/pcs = Total BOP INDIRECT bulan {joMonth} / Total targetQty semua JO bulan itu. Full HPP = HPP DIRECT JO + Alokasi BOP. Digunakan untuk pricing & laba kotor akurat.</p>
          </div>

          {/* Breakdown Table */}
          {!costs || costs.length === 0 ? (
            <div className="text-center py-6 border rounded-lg border-dashed bg-muted/20">
              <p className="text-sm text-muted-foreground">Belum ada estimasi biaya. Isi saat buat JO baru atau tambah manual.</p>
              <p className="text-xs text-muted-foreground mt-1">Biaya aktual akan otomatis terisi dari transaksi yang di-tag ke JO ini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead className="text-right">Estimasi</TableHead>
                    <TableHead className="text-right">Aktual</TableHead>
                    <TableHead className="text-right">Selisih</TableHead>
                    <TableHead className="text-right">/pcs Est</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costs.map((c) => {
                    const diff = c.actualAmount - c.estimatedAmount
                    const perPcs = jobOrder.targetQty ? Math.round(c.estimatedAmount / jobOrder.targetQty) : 0
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs">{c.costCategoryCode}</TableCell>
                        <TableCell className="font-medium text-sm">{c.costCategoryName}</TableCell>
                        <TableCell><Badge className={`${c.type==="DIRECT" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>{c.type==="DIRECT" ? "Langsung" : "Tak Langsung"}</Badge></TableCell>
                        <TableCell className="text-right">{formatCurrency(c.estimatedAmount)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(c.actualAmount)}</TableCell>
                        <TableCell className={`text-right ${diff>0 ? "text-red-600" : diff<0 ? "text-green-600" : ""}`}>{diff>0?"+":""}{formatCurrency(diff)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(perPcs)}</TableCell>
                      </TableRow>
                    )
                  })}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell colSpan={3}>TOTAL</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalEstimatedAll)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalActualAll)}</TableCell>
                    <TableCell className={`text-right ${variance>0 ? "text-red-600" : "text-green-600"}`}>{formatCurrency(totalActualAll-totalEstimatedAll)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(hppPerPcsEst)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}

          {/* Linked Transactions */}
          <div>
            <h4 className="text-sm font-medium mb-2">Transaksi Terhubung ({(linkedTransactions||[]).length})</h4>
            {(!linkedTransactions || linkedTransactions.length===0) ? (
              <p className="text-xs text-muted-foreground">Belum ada transaksi pengeluaran yang di-tag ke JO ini. Catat biaya via tombol di atas, atau buat transaksi di Finance dengan referensi {jobOrder.joNumber}.</p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linkedTransactions.slice(0,5).map(tx=>(
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs">{formatDate(tx.date)}</TableCell>
                        <TableCell><Badge variant="outline">{tx.category}</Badge></TableCell>
                        <TableCell className="text-sm">{tx.description}</TableCell>
                        <TableCell className="text-right text-red-600">{formatCurrency(tx.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {(linkedTransactions||[]).length>5 && <p className="text-xs text-muted-foreground p-2 text-center">+ {(linkedTransactions||[]).length-5} transaksi lainnya</p>}
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/overview/finance/transactions?jobOrderId=${jobOrder.id}`}>Lihat Semua Transaksi JO</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/overview/finance/reports">Lihat Laporan HPP</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mx-4 md:mx-6 mb-4 p-0">
        <CardHeader className="pb-4 pt-5 px-5 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Laporan Produksi</CardTitle>
              <CardDescription>Riwayat laporan hasil produksi</CardDescription>
            </div>
            <div className="flex gap-2">
              {!isKaryawan && jobOrder.status === "IN_PROGRESS" && (
                <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <CubeIcon className="mr-2 h-4 w-4" />
                      Input Hasil
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Input Hasil Produksi</DialogTitle>
                      <DialogDescription>
                        Masukkan jumlah hasil produksi hari ini
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Berhasil (Pcs)</Label>
                        <FormattedNumberInput
                          placeholder="0"
                          value={reportData.success}
                          onValueChange={(v) => setReportData({ ...reportData, success: v })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Reject (Pcs)</Label>
                        <FormattedNumberInput
                          placeholder="0"
                          value={reportData.reject}
                          onValueChange={(v) => setReportData({ ...reportData, reject: v })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Catatan</Label>
                        <Textarea
                          placeholder="Tambahkan catatan jika ada..."
                          value={reportData.notes}
                          onChange={(e) => setReportData({ ...reportData, notes: e.target.value })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
                        Batal
                      </Button>
                      <Button onClick={handleSubmitReport} disabled={submitting}>
                        {submitting && <Spinner data-icon="inline-start" />}
                        Simpan
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              {jobOrder.status === "QC_PENDING" && (
                <Dialog open={qcDialogOpen} onOpenChange={setQCDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-green-600 hover:bg-green-700">
                      <CheckIcon className="mr-2 h-4 w-4" />
                      Approve QC
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Konfirmasi QC Approval</DialogTitle>
                      <DialogDescription>
                        Setujui {jobOrder.completedQty} Pcs barang jadi?
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setQCDialogOpen(false)}>
                        Batal
                      </Button>
                      <Button variant="destructive">
                        <XMarkIcon className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                      <Button onClick={handleApproveQC} disabled={submitting}>
                        {submitting && <Spinner data-icon="inline-start" />}
                        <CheckIcon className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-5 py-5">
          {!jobOrder.reports || jobOrder.reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Belum ada laporan produksi</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Berhasil</TableHead>
                  <TableHead>Reject</TableHead>
                  <TableHead>Dilaporkan Oleh</TableHead>
                  <TableHead>Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobOrder.reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      {formatDate(report.date)}
                    </TableCell>
                    <TableCell className="text-green-600 font-medium">
                      {report.success} Pcs
                    </TableCell>
                    <TableCell className="text-red-600 font-medium">
                      {report.reject} Pcs
                    </TableCell>
                    <TableCell>{report.reportedBy || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {report.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Job Order</DialogTitle>
            <DialogDescription>Perbarui detail job order</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Target Qty (Pcs)</Label>
              <FormattedNumberInput
                placeholder="0"
                value={String(editData.targetQty)}
                onValueChange={(v) => setEditData({ ...editData, targetQty: parseInt(v) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Deadline</Label>
              <DatePicker
                value={editData.dueDate ? editData.dueDate.split("T")[0] : ""}
                onChange={(date) => setEditData({ ...editData, dueDate: date })}
                placeholder="Pilih tanggal deadline"
              />
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea 
                value={editData.notes} 
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Batal</Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting && <Spinner data-icon="inline-start" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
