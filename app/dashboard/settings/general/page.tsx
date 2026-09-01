"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { PageHeader } from "@/components/shared"
import { ArrowLeftIcon, BuildingOfficeIcon, BellIcon, ClockIcon, GlobeAltIcon } from "@heroicons/react/24/outline"

interface CompanyInfo {
  name: string
  address: string
  phone: string
  email: string
  taxId: string
}

interface GeneralSettings {
  dateFormat: string
  currency: string
  timezone: string
  startWorkHour: string
  endWorkHour: string
  maintenanceMode: boolean
}

const COMPANY_STORAGE_KEY = "company_info"

export default function GeneralPage() {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: "PT Konveksi Maju Jaya",
    address: "Jl. Industri No. 123, Jakarta Pusat",
    phone: "021-12345678",
    email: "info@konveksimajujaya.com",
    taxId: "01.234.567.8-999.000",
  })

  useEffect(() => {
    const stored = localStorage.getItem(COMPANY_STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setCompanyInfo(prev => ({ ...prev, ...parsed }))
      } catch (e) {
        console.error("Failed to parse company info:", e)
      }
    }
  }, [])

  const [settings, setSettings] = useState<GeneralSettings>({
    dateFormat: "DD/MM/YYYY",
    currency: "IDR",
    timezone: "Asia/Jakarta",
    startWorkHour: "08:00",
    endWorkHour: "17:00",
    maintenanceMode: false,
  })

  const [savingMaintenance, setSavingMaintenance] = useState(false)

  useEffect(() => {
    fetch("/api/settings/maintenance")
      .then(res => res.json())
      .then(data => {
        if (data.maintenanceMode !== undefined) {
          setSettings(prev => ({ ...prev, maintenanceMode: data.maintenanceMode }))
          // Set cookie so middleware can detect maintenance mode
          document.cookie = `maintenance=${data.maintenanceMode}; path=/; max-age=86400`
        }
      })
      .catch(console.error)
  }, [])

  const handleToggleMaintenance = async (enabled: boolean) => {
    setSavingMaintenance(true)
    try {
      const res = await fetch("/api/settings/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      })
      if (res.ok) {
        setSettings(prev => ({ ...prev, maintenanceMode: enabled }))
        // Set cookie for middleware to detect maintenance mode
        document.cookie = `maintenance=${enabled}; path=/; max-age=86400`
      }
    } catch (error) {
      console.error("Error toggling maintenance:", error)
    } finally {
      setSavingMaintenance(false)
    }
  }

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle")

  const handleSave = () => {
    setSaveStatus("saving")
    localStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify({
      name: companyInfo.name,
      address: companyInfo.address,
      phone: companyInfo.phone,
      email: companyInfo.email,
    }))
    setTimeout(() => {
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 2000)
    }, 500)
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Pengaturan Umum"
        description="Konfigurasi sistem dan informasi perusahaan"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/settings">
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Kembali
              </Link>
            </Button>
            <Button onClick={handleSave} disabled={saveStatus === "saving"}>
              {saveStatus === "saving" ? "Menyimpan..." : saveStatus === "saved" ? "Tersimpan!" : "Simpan Perubahan"}
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BuildingOfficeIcon className="h-5 w-5" />
            Informasi Perusahaan
          </CardTitle>
          <CardDescription>Data profil perusahaan untuk dokumen dan faktur</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nama Perusahaan</Label>
              <Input
                id="companyName"
                value={companyInfo.name}
                onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxId">NPWP</Label>
              <Input
                id="taxId"
                value={companyInfo.taxId}
                onChange={(e) => setCompanyInfo({ ...companyInfo, taxId: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Alamat</Label>
            <Input
              id="address"
              value={companyInfo.address}
              onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Telepon</Label>
              <Input
                id="phone"
                value={companyInfo.phone}
                onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={companyInfo.email}
                onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GlobeAltIcon className="h-5 w-5" />
            Regional & Locale
          </CardTitle>
          <CardDescription>Pengaturan format tanggal, mata uang, dan zona waktu</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Format Tanggal</Label>
              <Select
                value={settings.dateFormat}
                onValueChange={(v) => setSettings({ ...settings, dateFormat: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (01/03/2025)</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (03/01/2025)</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2025-03-01)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mata Uang</Label>
              <Select
                value={settings.currency}
                onValueChange={(v) => setSettings({ ...settings, currency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IDR">IDR - Rupiah Indonesia</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Zona Waktu</Label>
              <Select
                value={settings.timezone}
                onValueChange={(v) => setSettings({ ...settings, timezone: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Jakarta">Asia/Jakarta (WIB)</SelectItem>
                  <SelectItem value="Asia/Makassar">Asia/Makassar (WITA)</SelectItem>
                  <SelectItem value="Asia/Jayapura">Asia/Jayapura (WIT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5" />
            Jam Operasional
          </CardTitle>
          <CardDescription>Atur jam kerja standar perusahaan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Jam Masuk</Label>
              <Input
                type="time"
                value={settings.startWorkHour}
                onChange={(e) => setSettings({ ...settings, startWorkHour: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Jam Pulang</Label>
              <Input
                type="time"
                value={settings.endWorkHour}
                onChange={(e) => setSettings({ ...settings, endWorkHour: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellIcon className="h-5 w-5" />
            Mode Maintenance
          </CardTitle>
          <CardDescription>Aktifkan mode maintenance untuk membatasi akses pengguna</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Status Maintenance</Label>
              <p className="text-sm text-muted-foreground">
                {settings.maintenanceMode ? "Sistem sedang dalam mode maintenance" : "Sistem berjalan normal"}
              </p>
            </div>
            <Switch
              checked={settings.maintenanceMode}
              onCheckedChange={(v) => handleToggleMaintenance(v)}
              disabled={savingMaintenance}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
