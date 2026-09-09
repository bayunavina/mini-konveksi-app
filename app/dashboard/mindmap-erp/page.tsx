"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import mermaid from "mermaid"
import { ArrowDownTrayIcon, MinusIcon, PlusIcon, ArrowPathIcon, MapIcon } from "@heroicons/react/24/outline"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { MODULE_BRANCHES, MIND_MAP_TABS, PROCESS_FLOW, type MindMapTabId } from "@/lib/mindmap-erp"

const DIAGRAMS: Record<MindMapTabId, string> = {
  "main-flow": `flowchart LR
    classDef stage fill:#ecfdf5,stroke:#059669,color:#064e3b,stroke-width:2px,font-size:16px
    classDef decision fill:#fef3c7,stroke:#d97706,color:#78350f,stroke-width:2px,font-size:16px
    classDef external fill:#eff6ff,stroke:#2563eb,color:#1e3a8a,stroke-width:2px,font-size:16px
    classDef reject fill:#fef2f2,stroke:#dc2626,color:#7f1d1d,stroke-width:2px,font-size:16px
    order[Order Customer<br/>Customer + Admin]:::external --> approval[Approval Job Order<br/>Admin]:::stage
    approval --> stock{Stok bahan<br/>cukup?}:::decision
    stock -->|Ya| assign[Assignment Tim Produksi<br/>Admin]:::stage
    stock -->|Tidak| restock[Restock & Terima Bahan<br/>Admin + Supplier + Gudang]:::external
    restock --> assign
    assign --> production[Cutting → Sewing → Finishing<br/>Tim Produksi · Scan 1 pcs]:::stage
    production --> qc{QC Good<br/>atau Reject?}:::decision
    qc -->|Reject| rework[Rework / Catat Reject<br/>QC + Produksi]:::reject
    rework --> production
    qc -->|Good| finished[Barang Jadi<br/>Gudang]:::stage
    finished --> delivery[Transfer & Pengiriman<br/>Gudang]:::external
    delivery --> finance[Invoice & Pembayaran<br/>Finance + Customer]:::external
    finance --> done((Selesai)):::stage
    click order href "/dashboard/produksi"
    click approval href "/dashboard/produksi"
    click stock href "/dashboard/inventory"
    click restock href "/dashboard/transfer/incoming"
    click assign href "/dashboard/production/assignments"
    click production href "/dashboard/production/progress"
    click qc href "/dashboard/qc/overview"
    click rework href "/dashboard/inventory/rejects"
    click finished href "/dashboard/inventory/finished"
    click delivery href "/dashboard/transfer/outgoing"
    click finance href "/overview/finance"
    click done href "/dashboard/admin"`,
  "module-map": `flowchart TD
    app((ERP Konveksi)):::root --> master[Master Data]:::module
    app --> sales[Sales / Produksi]:::module
    app --> quality[Quality Control]:::module
    app --> inventory[Inventory]:::module
    app --> warehouse[Transfer & Warehouse]:::module
    app --> employees[Karyawan & Payroll]:::module
    app --> finance[Finance]:::module
    app --> reports[Reporting & Audit]:::module
    app --> qr[QR & Scanner]:::module
    master --> masterItems[Bahan Baku · Supplier · Kategori Biaya · User & Role]
    sales --> salesItems[Job Order · Assignment · Progress Produksi]
    quality --> qualityItems[QC Overview · QC Report · Good · Reject]
    inventory --> inventoryItems[Overview · Bahan Baku · Barang Jadi · Reject]
    warehouse --> warehouseItems[Barang Masuk · Barang Keluar · Master Gudang]
    employees --> employeeItems[Daftar Karyawan · Tim · Penggajian · Klaim · Kasbon]
    finance --> financeItems[Overview · Transaksi · Laporan · Dashboard HPP]
    reports --> reportItems[Balance Report · Log Aktivitas]
    qr --> qrItems[QR Generator · Barcode · Scan QR]
    classDef root fill:#eef2ff,stroke:#4f46e5,color:#312e81,stroke-width:3px
    classDef module fill:#ecfdf5,stroke:#059669,color:#064e3b,stroke-width:2px
    click master href "/dashboard/settings/master"
    click sales href "/dashboard/produksi"
    click quality href "/dashboard/qc-reports"
    click inventory href "/dashboard/inventory"
    click warehouse href "/dashboard/transfer"
    click employees href "/dashboard/employees"
    click finance href "/overview/finance"
    click reports href "/dashboard/balance"
    click qr href "/dashboard/qr-generator"`,
  restock: `flowchart TD
    low[Stok mencapai batas minimum]:::decision --> review[Review kebutuhan bahan<br/>Admin / Gudang]:::stage
    review --> enough{Stok cukup<br/>untuk Job Order?}:::decision
    enough -->|Ya| ready[Bahan siap dipakai]:::stage
    enough -->|Tidak| supplier[Pesan ke Supplier]:::external
    supplier --> receive[Barang Masuk & Verifikasi QR]:::external
    receive --> update[Saldo Inventory diperbarui]:::stage
    update --> ready
    ready --> production[Lanjut ke Assignment Produksi]:::stage
    click low href "/dashboard/inventory"
    click review href "/dashboard/inventory/materials"
    click supplier href "/overview/finance"
    click receive href "/dashboard/transfer/incoming"
    click update href "/dashboard/inventory"
    click production href "/dashboard/production/assignments"`,
  payroll: `flowchart TD
    assign[Assignment dengan target qty]:::stage --> scan[Operator scan QR<br/>1 scan = 1 pcs]:::stage
    scan --> progress[Progress & deviasi target real-time]:::stage
    progress --> result{Hasil QC}:::decision
    result -->|Good| accepted[Qty Good masuk perhitungan]:::stage
    result -->|Reject| rejected[Qty Reject dicatat]:::reject
    accepted --> calculate[Qty Good × rate per pcs]:::stage
    rejected --> calculate
    calculate --> review[Admin review penggajian]:::decision
    review --> slip[Slip / Klaim Gaji]:::stage
    click assign href "/dashboard/production/assignments"
    click scan href "/dashboard/scan"
    click progress href "/dashboard/production/progress"
    click result href "/dashboard/qc/overview"
    click accepted href "/dashboard/employees/salaries"
    click rejected href "/dashboard/inventory/rejects"
    click calculate href "/dashboard/employees/salaries"
    click review href "/dashboard/employees/salaries"
    click slip href "/dashboard/employees/salary-claims"`,
}

const MERMAID_THEME = `%%{init: {'theme':'base','flowchart': {'nodeSpacing': 90,'rankSpacing': 110,'padding': 20,'htmlLabels': true},'themeVariables': {'fontFamily':'ui-sans-serif, system-ui, sans-serif','fontSize':'16px','primaryColor':'#ecfdf5','primaryTextColor':'#172033','lineColor':'#64748b','clusterBkg':'#f8fafc','clusterBorder':'#cbd5e1'}}}%%`

export default function MindMapErpPage() {
  const [activeTab, setActiveTab] = useState<MindMapTabId>("main-flow")
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const diagramRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)

  const fitToView = () => {
    const viewport = viewportRef.current
    const svg = diagramRef.current?.querySelector("svg")
    if (!viewport || !svg) return

    const svgWidth = svg.clientWidth
    const svgHeight = svg.clientHeight
    if (!svgWidth || !svgHeight) return

    const availableWidth = Math.max(viewport.clientWidth - 64, 320)
    const availableHeight = Math.max(viewport.clientHeight - 64, 420)
    const fittedScale = Math.min(1.5, availableWidth / svgWidth, availableHeight / svgHeight)
    setScale(Number(Math.max(0.75, fittedScale).toFixed(2)))
    setOffset({ x: 0, y: 0 })
  }

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, securityLevel: "loose", theme: "base" })
    let mounted = true
    const renderDiagram = async () => {
      const result = await mermaid.render(`mindmap-erp-${activeTab}`, MERMAID_THEME + DIAGRAMS[activeTab])
      if (mounted && diagramRef.current) {
        diagramRef.current.innerHTML = result.svg
        requestAnimationFrame(() => requestAnimationFrame(fitToView))
      }
    }
    renderDiagram()
    return () => { mounted = false }
  }, [activeTab])

  const resetView = () => fitToView()
  const zoom = (delta: number) => setScale((current) => Math.min(5, Math.max(0.45, Number((current + delta).toFixed(2)))))
  const onPointerDown = (event: React.PointerEvent) => { setDragging(true); setDragStart({ x: event.clientX - offset.x, y: event.clientY - offset.y }); viewportRef.current?.setPointerCapture(event.pointerId) }
  const onPointerMove = (event: React.PointerEvent) => { if (dragging) setOffset({ x: event.clientX - dragStart.x, y: event.clientY - dragStart.y }) }
  const stopDragging = () => setDragging(false)

  const exportSvg = () => {
    const svg = diagramRef.current?.querySelector("svg")
    if (!svg) return
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url; link.download = `mind-map-erp-${activeTab}.svg`; link.click(); URL.revokeObjectURL(url)
  }

  const exportPng = () => {
    const svg = diagramRef.current?.querySelector("svg")
    if (!svg) return
    const source = new XMLSerializer().serializeToString(svg)
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = image.width * 2; canvas.height = image.height * 2
      const context = canvas.getContext("2d")
      if (!context) return
      context.scale(2, 2); context.drawImage(image, 0, 0)
      const link = document.createElement("a")
      link.download = `mind-map-erp-${activeTab}.png`; link.href = canvas.toDataURL("image/png"); link.click()
    }
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`
  }

  return (
    <div className="min-h-full space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3"><div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-brand-primary text-primary-foreground"><MapIcon className="h-6 w-6" /></div><div><h1 className="text-2xl font-bold tracking-tight">Mind Map ERP</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Peta visual proses bisnis, gate verifikasi, role penanggung jawab, dan shortcut modul ERP Konveksi.</p></div></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={exportSvg}><ArrowDownTrayIcon className="h-4 w-4" />Export SVG</Button><Button variant="outline" size="sm" onClick={exportPng}><ArrowDownTrayIcon className="h-4 w-4" />Export PNG</Button></div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-3">{MIND_MAP_TABS.map((tab) => <button key={tab.id} type="button" onClick={() => { setActiveTab(tab.id); resetView() }} className={cn("rounded-lg px-3 py-2 text-sm font-medium transition-colors", activeTab === tab.id ? "bg-brand-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>{tab.label}</button>)}</div>
      <p className="text-sm text-muted-foreground">{MIND_MAP_TABS.find((tab) => tab.id === activeTab)?.description}</p>

      <Card className="overflow-hidden shadow-sm"><CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border"><CardTitle className="text-base">Visualisasi Diagram</CardTitle><div className="flex items-center gap-1"><Button variant="outline" size="icon" aria-label="Perkecil diagram" onClick={() => zoom(-0.1)}><MinusIcon className="h-4 w-4" /></Button><span className="min-w-14 text-center text-xs text-muted-foreground">{Math.round(scale * 100)}%</span><Button variant="outline" size="icon" aria-label="Perbesar diagram" onClick={() => zoom(0.1)}><PlusIcon className="h-4 w-4" /></Button><Button variant="outline" size="icon" aria-label="Reset diagram" onClick={resetView}><ArrowPathIcon className="h-4 w-4" /></Button></div></CardHeader><CardContent className="p-0"><div ref={viewportRef} className={cn("min-h-[560px] h-[min(72vh,760px)] w-full overflow-hidden bg-slate-50/70 dark:bg-slate-950/40", dragging ? "cursor-grabbing" : "cursor-grab")} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stopDragging} onPointerCancel={stopDragging}><div className="flex min-h-full min-w-full items-center justify-center p-8" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: "center center" }}><div ref={diagramRef} className="mindmap-diagram w-full max-w-none" /></div></div></CardContent></Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]"><Card><CardHeader><CardTitle className="text-base">Keterangan Visual</CardTitle></CardHeader><CardContent className="grid gap-2 text-sm sm:grid-cols-2"><div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-500" />Proses internal / otomatis</div><div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-500" />Approval atau decision gate</div><div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-blue-500" />Customer, supplier, atau pihak luar</div><div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-red-500" />Reject atau rework</div><p className="col-span-full text-xs text-muted-foreground">Klik node diagram untuk membuka modul terkait. Diagram dapat digeser dengan drag dan diubah skalanya dengan kontrol zoom.</p><div className="col-span-full mt-2 border-t border-border pt-3"><div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shortcut Modul</div><div className="flex flex-wrap gap-2">{MODULE_BRANCHES.map((branch) => <Link key={branch.id} href={branch.href} className="rounded-md border border-border px-2 py-1 text-xs text-brand-primary transition-colors hover:bg-accent">{branch.label}</Link>)}</div></div></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Tahap dan Gate Utama</CardTitle></CardHeader><CardContent className="space-y-2">{PROCESS_FLOW.slice(0, activeTab === "main-flow" ? PROCESS_FLOW.length : 4).map((node, index) => <div key={node.id} className="flex gap-3 border-b border-border/60 pb-2 last:border-0"><Badge variant="outline" className="h-fit">{index + 1}</Badge><div className="min-w-0"><div className="text-sm font-medium">{node.label}</div><div className="text-xs text-muted-foreground">{node.role} · Gate: {node.gate}</div>{node.href && <Link href={node.href} className="text-xs text-brand-primary hover:underline">Buka {node.module}</Link>}</div></div>)}</CardContent></Card></div>
    </div>
  )
}
