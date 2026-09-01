"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { PageHeader } from "@/components/shared"
import { useSessionWithRole } from "@/lib/use-session-with-role"
import { EnvelopeIcon, DevicePhoneMobileIcon, ArrowPathIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline"
import { toast } from "sonner"

interface NotificationSettings {
  emailOrderComplete: boolean
  emailTransferIn: boolean
  emailTransferOut: boolean
  emailLowStock: boolean
  pushOrderComplete: boolean
  pushTransferIn: boolean
  pushTransferOut: boolean
  pushLowStock: boolean
}

const defaultSettings: NotificationSettings = {
  emailOrderComplete: true,
  emailTransferIn: true,
  emailTransferOut: false,
  emailLowStock: true,
  pushOrderComplete: true,
  pushTransferIn: true,
  pushTransferOut: true,
  pushLowStock: false,
}

export default function NotificationsPage() {
  const router = useRouter()
  const { user, isLoading } = useSessionWithRole()
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testSending, setTestSending] = useState(false)

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role !== "ADMIN") {
        router.push("/dashboard")
        return
      }
      fetchPreferences()
    } else if (!isLoading && !user) {
      router.push("/")
    }
  }, [user, isLoading, router])

  const fetchPreferences = async () => {
    if (!user?.employeeId) {
      setLoading(false)
      return
    }
    try {
      const response = await fetch(`/api/notifications/preferences?userId=${user?.employeeId}`)
      if (response.ok) {
        const data = await response.json()
        setSettings({
          emailOrderComplete: data.email_order_complete ?? true,
          emailTransferIn: data.email_transfer_in ?? true,
          emailTransferOut: data.email_transfer_out ?? false,
          emailLowStock: data.email_low_stock ?? true,
          pushOrderComplete: data.push_order_complete ?? true,
          pushTransferIn: data.push_transfer_in ?? true,
          pushTransferOut: data.push_transfer_out ?? true,
          pushLowStock: data.push_low_stock ?? false,
        })
      }
    } catch (error) {
      console.error('Error fetching preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = async () => {
    if (!user?.employeeId) {
      toast.error('Silakan login terlebih dahulu')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          ...settings
        })
      })

      if (response.ok) {
        toast.success('Pengaturan notifikasi berhasil disimpan')
      } else {
        toast.error('Gagal menyimpan pengaturan')
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
      toast.error('Terjadi kesalahan saat menyimpan')
    } finally {
      setSaving(false)
    }
  }

  const handleTestEmail = async () => {
    setTestSending(true)
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ORDER_COMPLETE',
          userId: user?.employeeId,
          data: {
            joNumber: 'TEST-001',
            productName: 'Kemeja PDL Hitam',
            qty: 10
          }
        })
      })

      const result = await response.json()
      if (result.success) {
        toast.success(`Email test berhasil dikirim ke ${result.sent} penerima`)
      } else if (result.message) {
        toast.info(result.message)
      } else {
        toast.error('Gagal mengirim email test')
      }
    } catch (error) {
      console.error('Error sending test email:', error)
      toast.error('Terjadi kesalahan saat mengirim email test')
    } finally {
      setTestSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Notifikasi" description="Memuat..." />
        <div className="flex items-center justify-center py-12">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Notifikasi"
        description="Pengaturan notifikasi aplikasi"
        actions={
          <Button 
            variant="outline" 
            onClick={handleTestEmail}
            disabled={testSending || !settings.emailOrderComplete}
          >
            {testSending ? (
              <>
                <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
                Mengirim...
              </>
            ) : (
              'Kirim Email Test'
            )}
          </Button>
        }
      />

      {!user && !isLoading && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6 flex items-center gap-3">
            <ExclamationCircleIcon className="h-5 w-5 text-yellow-600" />
            <p className="text-yellow-800">
              Silakan login terlebih dahulu untuk mengatur preferensi notifikasi.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {/* Email Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <EnvelopeIcon className="h-5 w-5" />
              Notifikasi Email
            </CardTitle>
            <CardDescription>
              Pengaturan notifikasi via email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Job Order Selesai</Label>
                <p className="text-sm text-muted-foreground">
                  Kirim notifikasi saat job order selesai diproses
                </p>
              </div>
              <Switch 
                checked={settings.emailOrderComplete}
                onCheckedChange={() => handleToggle("emailOrderComplete")}
                disabled={!user}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Barang Masuk</Label>
                <p className="text-sm text-muted-foreground">
                  Kirim notifikasi saat ada transfer barang masuk
                </p>
              </div>
              <Switch 
                checked={settings.emailTransferIn}
                onCheckedChange={() => handleToggle("emailTransferIn")}
                disabled={!user}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Barang Keluar</Label>
                <p className="text-sm text-muted-foreground">
                  Kirim notifikasi saat ada transfer barang keluar
                </p>
              </div>
              <Switch 
                checked={settings.emailTransferOut}
                onCheckedChange={() => handleToggle("emailTransferOut")}
                disabled={!user}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Stok Rendah</Label>
                <p className="text-sm text-muted-foreground">
                  Kirim notifikasi saat stok produk hampir habis
                </p>
              </div>
              <Switch 
                checked={settings.emailLowStock}
                onCheckedChange={() => handleToggle("emailLowStock")}
                disabled={!user}
              />
            </div>
          </CardContent>
        </Card>

        {/* Push Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DevicePhoneMobileIcon className="h-5 w-5" />
              Push Notification
            </CardTitle>
            <CardDescription>
              Pengaturan notifikasi push di perangkat
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Job Order Selesai</Label>
                <p className="text-sm text-muted-foreground">
                  Kirim push notification saat job order selesai
                </p>
              </div>
              <Switch 
                checked={settings.pushOrderComplete}
                onCheckedChange={() => handleToggle("pushOrderComplete")}
                disabled={!user}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Barang Masuk</Label>
                <p className="text-sm text-muted-foreground">
                  Kirim push notification saat barang masuk
                </p>
              </div>
              <Switch 
                checked={settings.pushTransferIn}
                onCheckedChange={() => handleToggle("pushTransferIn")}
                disabled={!user}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Barang Keluar</Label>
                <p className="text-sm text-muted-foreground">
                  Kirim push notification saat barang keluar
                </p>
              </div>
              <Switch 
                checked={settings.pushTransferOut}
                onCheckedChange={() => handleToggle("pushTransferOut")}
                disabled={!user}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Stok Rendah</Label>
                <p className="text-sm text-muted-foreground">
                  Kirim push notification saat stok rendah
                </p>
              </div>
              <Switch 
                checked={settings.pushLowStock}
                onCheckedChange={() => handleToggle("pushLowStock")}
                disabled={!user}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <Button 
            variant="outline" 
            onClick={() => setSettings(defaultSettings)}
            disabled={!user || saving}
          >
            Reset
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!user || saving}
          >
            {saving ? (
              <>
                <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              'Simpan Pengaturan'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
