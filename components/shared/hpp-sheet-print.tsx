"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { PrinterIcon } from "@heroicons/react/24/outline"

interface HppCostItem {
  costCategoryCode: string
  costCategoryName: string
  type: string
  estimatedAmount: number
  actualAmount: number
}

interface HppSheetProps {
  joNumber: string
  productName: string
  productSku: string
  targetQty: number
  completedQty: number
  acceptedQty: number
  startDate?: string
  endDate?: string
  costs: HppCostItem[]
  totalEstimated: number
  totalActual: number
  bopEstimated?: number
  bopActual?: number
  bopPerPcs?: number
  hppPerPcsEst?: number
  hppPerPcsActual?: number
}

interface CompanyInfo {
  name: string
  address: string
  phone: string
  email: string
}

const STORAGE_KEY = "company_info"

const defaultCompanyInfo: CompanyInfo = {
  name: "PT Konveksi Maju Jaya",
  address: "Jl. Industri No. 123, Jakarta Pusat",
  phone: "021-12345678",
  email: "info@konveksimajujaya.com",
}

function formatCurrency(num: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

export function HppSheetPrint({
  joNumber,
  productName,
  productSku,
  targetQty,
  completedQty,
  acceptedQty,
  startDate,
  endDate,
  costs,
  totalEstimated,
  totalActual,
  bopEstimated = 0,
  bopActual = 0,
  bopPerPcs = 0,
  hppPerPcsEst = 0,
  hppPerPcsActual = 0,
}: HppSheetProps) {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(defaultCompanyInfo)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setCompanyInfo(JSON.parse(stored))
      } catch (e) {
        console.error("Failed to parse company info:", e)
      }
    }
  }, [])

  const directCosts = costs.filter(c => c.type === "DIRECT")
  const indirectCosts = costs.filter(c => c.type === "INDIRECT")

  const selisihHpp = totalActual - totalEstimated
  const selisihHppPerPcs = hppPerPcsActual - hppPerPcsEst
  const selisihBop = bopActual - bopEstimated
  const selisihTotal = (totalActual + bopActual) - (totalEstimated + bopEstimated)
  const rejectQty = completedQty - acceptedQty

  const handlePrint = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>HPP Sheet - ${joNumber}</title>
          <style>
            * { box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              padding: 15px; 
              font-size: 11px;
              line-height: 1.4;
            }
            .company-header { 
              text-align: center; 
              margin-bottom: 15px; 
              border-bottom: 2px solid #333; 
              padding-bottom: 10px; 
            }
            .company-header h1 { font-size: 16px; margin: 0 0 3px 0; font-weight: bold; }
            .company-header p { font-size: 10px; margin: 1px 0; color: #555; }
            h1 { font-size: 14px; margin: 0 0 5px 0; font-weight: bold; }
            h2 { font-size: 12px; margin: 10px 0 5px 0; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
            .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            .meta-table td { padding: 3px 5px; vertical-align: top; }
            .meta-table .label { width: 120px; font-weight: bold; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10px; }
            th, td { border: 1px solid #ccc; padding: 5px 6px; text-align: left; vertical-align: middle; }
            th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
            .text-right { text-align: right !important; }
            .text-center { text-align: center !important; }
            .bg-direct { background-color: #e8f5e9; }
            .bg-indirect { background-color: #fff3e0; }
            .bg-summary { background-color: #e3f2fd; font-weight: bold; }
            .bg-grand { background-color: #f5f5f5; font-weight: bold; }
            .total-row td { font-weight: bold; }
            .negative { color: #d32f2f; }
            .positive { color: #388e3c; }
            .section-divider { margin: 8px 0; border: 0; border-top: 1px dashed #ccc; }
            .info-box { 
              background: #f5f5f5; 
              border: 1px solid #ddd; 
              padding: 8px; 
              margin-bottom: 10px; 
              font-size: 10px;
            }
            .info-box h3 { margin: 0 0 5px 0; font-size: 11px; }
            .info-box p { margin: 2px 0; }
            .footer { 
              margin-top: 15px; 
              font-size: 9px; 
              color: #999; 
              text-align: center; 
              border-top: 1px solid #ddd; 
              padding-top: 8px; 
            }
            @media print { 
              body { padding: 5px; } 
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="company-header">
            <h1>${companyInfo.name}</h1>
            <p>${companyInfo.address}</p>
            <p>Telp: ${companyInfo.phone} | Email: ${companyInfo.email}</p>
          </div>

          <h1>LAPORAN HPP (HARGA POKOK PRODUKSI)</h1>
          <p>Dicetak: ${new Date().toLocaleString("id-ID")}</p>

          <div class="info-box">
            <h3>INFO JOB ORDER</h3>
            <table class="meta-table" style="width: auto; margin: 0;">
              <tr>
                <td class="label">No. JO</td>
                <td><strong>${joNumber}</strong></td>
                <td class="label">Produk</td>
                <td>${productName}</td>
              </tr>
              <tr>
                <td class="label">SKU</td>
                <td>${productSku}</td>
                <td class="label">Tanggal</td>
                <td>${startDate ? formatDate(startDate) : "-"} ${endDate ? " - " + formatDate(endDate) : ""}</td>
              </tr>
              <tr>
                <td class="label">Target Qty</td>
                <td><strong>${targetQty} pcs</strong></td>
                <td class="label">Completed</td>
                <td>${completedQty} pcs</td>
              </tr>
              <tr>
                <td class="label">Accepted (QC OK)</td>
                <td>${acceptedQty} pcs</td>
                <td class="label">Rejected</td>
                <td>${rejectQty} pcs</td>
              </tr>
            </table>
          </div>

          <h2>BIAYA LANGSUNG (DIRECT) - HPP</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 15%">Kode</th>
                <th style="width: 35%">Kategori Biaya</th>
                <th style="width: 20%" class="text-right">Estimasi (Rp)</th>
                <th style="width: 20%" class="text-right">Aktual (Rp)</th>
                <th style="width: 10%" class="text-right">Selisih</th>
              </tr>
            </thead>
            <tbody>
              ${directCosts.map(c => {
                const selisih = c.actualAmount - c.estimatedAmount
                const selisihClass = selisih > 0 ? "negative" : selisih < 0 ? "positive" : ""
                return `
                  <tr>
                    <td class="text-center">${c.costCategoryCode}</td>
                    <td>${c.costCategoryName}</td>
                    <td class="text-right">${formatCurrency(c.estimatedAmount)}</td>
                    <td class="text-right">${formatCurrency(c.actualAmount)}</td>
                    <td class="text-right ${selisihClass}">${selisih >= 0 ? "+" : ""}${formatCurrency(selisih)}</td>
                  </tr>
                `
              }).join("")}
              <tr class="total-row bg-direct">
                <td colspan="2"><strong>SUBTOTAL HPP (DIRECT)</strong></td>
                <td class="text-right"><strong>${formatCurrency(totalEstimated)}</strong></td>
                <td class="text-right"><strong>${formatCurrency(totalActual)}</strong></td>
                <td class="text-right ${selisihHpp >= 0 ? "negative" : "positive"}"><strong>${selisihHpp >= 0 ? "+" : ""}${formatCurrency(selisihHpp)}</strong></td>
              </tr>
            </tbody>
          </table>

          <hr class="section-divider" />

          <h2>BIAYA TIDAK LANGSUNG (INDIRECT) - BOP</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 15%">Kode</th>
                <th style="width: 35%">Kategori Biaya</th>
                <th style="width: 20%" class="text-right">Estimasi (Rp)</th>
                <th style="width: 20%" class="text-right">Aktual (Rp)</th>
                <th style="width: 10%" class="text-right">Selisih</th>
              </tr>
            </thead>
            <tbody>
              ${indirectCosts.length === 0 ? `
                <tr>
                  <td colspan="5" class="text-center" style="color: #999;">Belum ada biaya indirect</td>
                </tr>
              ` : indirectCosts.map(c => {
                const selisih = c.actualAmount - c.estimatedAmount
                const selisihClass = selisih > 0 ? "negative" : selisih < 0 ? "positive" : ""
                return `
                  <tr>
                    <td class="text-center">${c.costCategoryCode}</td>
                    <td>${c.costCategoryName}</td>
                    <td class="text-right">${formatCurrency(c.estimatedAmount)}</td>
                    <td class="text-right">${formatCurrency(c.actualAmount)}</td>
                    <td class="text-right ${selisihClass}">${selisih >= 0 ? "+" : ""}${formatCurrency(selisih)}</td>
                  </tr>
                `
              }).join("")}
              <tr class="total-row bg-indirect">
                <td colspan="2"><strong>SUBTOTAL BOP (INDIRECT)</strong></td>
                <td class="text-right"><strong>${formatCurrency(bopEstimated)}</strong></td>
                <td class="text-right"><strong>${formatCurrency(bopActual)}</strong></td>
                <td class="text-right ${selisihBop >= 0 ? "negative" : "positive"}"><strong>${selisihBop >= 0 ? "+" : ""}${formatCurrency(selisihBop)}</strong></td>
              </tr>
            </tbody>
          </table>

          <hr class="section-divider" />

          <h2>RINGKASAN HPP FULL</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 50%">Deskripsi</th>
                <th style="width: 15%" class="text-right">Estimasi</th>
                <th style="width: 15%" class="text-right">Aktual</th>
                <th style="width: 20%" class="text-right">Selisih</th>
              </tr>
            </thead>
            <tbody>
              <tr class="bg-summary">
                <td>HPP per pcs (DIRECT)</td>
                <td class="text-right">${formatCurrency(hppPerPcsEst)}/pcs</td>
                <td class="text-right">${formatCurrency(hppPerPcsActual)}/pcs</td>
                <td class="text-right ${selisihHppPerPcs >= 0 ? "negative" : "positive"}">${selisihHppPerPcs >= 0 ? "+" : ""}${formatCurrency(selisihHppPerPcs)}/pcs</td>
              </tr>
              <tr class="bg-summary">
                <td>BOP per pcs (alokasi)</td>
                <td class="text-right">${formatCurrency(bopPerPcs)}/pcs</td>
                <td class="text-right">${formatCurrency(bopPerPcs)}/pcs</td>
                <td class="text-right">-</td>
              </tr>
              <tr class="total-row bg-grand">
                <td><strong>FULL HPP per pcs (HPP + BOP)</strong></td>
                <td class="text-right"><strong>${formatCurrency(hppPerPcsEst + bopPerPcs)}/pcs</strong></td>
                <td class="text-right"><strong>${formatCurrency(hppPerPcsActual + bopPerPcs)}/pcs</strong></td>
                <td class="text-right ${selisihTotal >= 0 ? "negative" : "positive"}"><strong>${selisihTotal >= 0 ? "+" : ""}${formatCurrency(Math.round(selisihTotal / Math.max(1, acceptedQty)))}/pcs</strong></td>
              </tr>
              <tr class="bg-grand">
                <td><strong>TOTAL HPP FULL (HPP + BOP)</strong></td>
                <td class="text-right"><strong>${formatCurrency(totalEstimated + bopEstimated)}</strong></td>
                <td class="text-right"><strong>${formatCurrency(totalActual + bopActual)}</strong></td>
                <td class="text-right ${selisihTotal >= 0 ? "negative" : "positive"}"><strong>${selisihTotal >= 0 ? "+" : ""}${formatCurrency(selisihTotal)}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <p>HPP Sheet - Job Order ${joNumber} - ${companyInfo.name}</p>
            <p>Dicetak dari ERP Konveksi pada ${new Date().toLocaleString("id-ID")}</p>
          </div>

          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `

    const printWindow = window.open("", "_blank", "width=900,height=700")
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handlePrint}
      className="no-print"
    >
      <PrinterIcon className="mr-2 h-4 w-4" />
      Cetak HPP Sheet
    </Button>
  )
}
