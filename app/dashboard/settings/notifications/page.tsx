"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { PageHeader } from "@/components/shared"
import { useSessionWithRole } from "@/lib/use-session-with-role"
import { EnvelopeIcon, DevicePhoneMobileIcon, ExclamationCircleIcon, ServerStackIcon, CheckCircleIcon, XCircleIcon, BellAlertIcon, ArrowPathIcon } from "@heroicons/react/24/outline"
import { toast } from "sonner"
import { usePushNotification } from "@/hooks/usePushNotification"

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
  const [smtpEnabled, setSmtpEnabled] = useState(false)
  const [smtpLoading, setSmtpLoading] = useState(true)
  const [smtpSaving, setSmtpSaving] = useState(false)
  const [smtpTesting, setSmtpTesting] = useState(false)
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(true)
  const [pushSaving, setPushSaving] = useState(false)
  const {
    supported,
    permission,
    subscribed,
    loading: pushSubLoading,
    requestPermission,
    unsubscribe,
  } = usePushNotification(user?.id)

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
        router.push("/dashboard")
        return
      }
      fetchPreferences()
      fetchSmtpStatus()
      fetchPushStatus()
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

  const fetchSmtpStatus = async () => {
    setSmtpLoading(true)
    try {
      const response = await fetch('/api/settings/email-smtp')
      if (response.ok) {
        const data = await response.json()
        setSmtpEnabled(data.enabled ?? false)
      }
    } catch (error) {
      console.error('Error fetching email smtp status:', error)
    } finally {
      setSmtpLoading(false)
    }
  }

  const fetchPushStatus = async () => {
    setPushLoading(true)
    try {
      const response = await fetch('/api/settings/push')
      if (response.ok) {
        const data = await response.json()
        setPushEnabled(data.enabled ?? false)
      }
    } catch (error) {
      console.error('Error fetching push status:', error)
    } finally {
      setPushLoading(false)
    }
  }

  const handleSavePush = async () => {
    setPushSaving(true)
    try {
      const response = await fetch('/api/settings/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: pushEnabled })
      })
      if (response.ok) {
        toast.success(pushEnabled ? 'Push notification diaktifkan' : 'Push notification dinonaktifkan')
      } else {
        toast.error('Gagal menyimpan pengaturan push')
      }
    } catch (error) {
      console.error('Error saving push setting:', error)
      toast.error('Terjadi kesalahan saat menyimpan')
    } finally {
      setPushSaving(false)
    }
  }

  const handleEnableBrowserPush = async () => {
    await requestPermission()
  }

  const handleDisableBrowserPush = async () => {
    await unsubscribe()
    toast.success('Push browser dinonaktifkan')
  }

  const handleSmtpToggle = (enabled: boolean) => {
    setSmtpEnabled(enabled)
    setSmtpTestResult(null)
  }

  const handleSaveSmtp = async () => {
    setSmtpSaving(true)
    try {
      const response = await fetch('/api/settings/email-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: smtpEnabled })
      })
      if (response.ok) {
        toast.success(smtpEnabled ? 'Email via Gmail SMTP diaktifkan' : 'Email via Gmail SMTP dinonaktifkan')
      } else {
        toast.error('Gagal menyimpan pengaturan email SMTP')
      }
    } catch (error) {
      console.error('Error saving email smtp setting:', error)
      toast.error('Terjadi kesalahan saat menyimpan')
    } finally {
      setSmtpSaving(false)
    }
  }

  const handleTestSmtp = async () => {
    setSmtpTesting(true)
    setSmtpTestResult(null)
    try {
      const response = await fetch('/api/settings/email-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true })
      })
      const result = await response.json()
      setSmtpTestResult({ success: result.success, message: result.message || 'Koneksi SMTP gagal' })
      if (result.success) {
        toast.success('Tes koneksi SMTP berhasil')
      } else {
        toast.error(`Tes koneksi SMTP gagal: ${result.message}`)
      }
    } catch (error) {
      console.error('Error testing SMTP connection:', error)
      setSmtpTestResult({ success: false, message: 'Terjadi kesalahan saat tes koneksi' })
      toast.error('Terjadi kesalahan saat tes koneksi SMTP')
    } finally {
      setSmtpTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Notifikasi" description="Memuat..." />
        <div className="flex items-center justify-center py-12">
          <Spinner className="size-8 text-muted-foreground" />
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
                <Spinner data-icon="inline-start" />
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
        {/* Gmail SMTP Toggle */}
        <Card className={smtpEnabled ? "border-green-200" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ServerStackIcon className="h-5 w-5" />
              Email via Gmail SMTP
            </CardTitle>
            <CardDescription>
              Aktifkan/nonaktifkan pengiriman email notifikasi melalui Gmail SMTP (erpkonveksi@gmail.com)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Aktifkan Pengiriman Email</Label>
                <p className="text-sm text-muted-foreground">
                  {smtpEnabled 
                    ? "Email notifikasi akan otomatis dikirim ke admin melalui Gmail SMTP." 
                    : "Email tidak dikirim. Notifikasi hanya tampil dalam aplikasi."}
                </p>
              </div>
              {!smtpLoading && (
                <Switch 
                  checked={smtpEnabled}
                  onCheckedChange={handleSmtpToggle}
                  disabled={!user || smtpLoading}
                />
              )}
            </div>

            {smtpTestResult && (
              <div className={`flex items-center gap-2 text-sm ${smtpTestResult.success ? "text-green-600" : "text-red-600"}`}>
                {smtpTestResult.success 
                  ? <CheckCircleIcon className="h-4 w-4" /> 
                  : <XCircleIcon className="h-4 w-4" />}
                {smtpTestResult.message}
              </div>
            )}

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={handleTestSmtp}
                disabled={!user || smtpTesting}
              >
                {smtpTesting ? (
                  <>
                    <Spinner data-icon="inline-start" />
                    Menguji...
                  </>
                ) : (
                  'Tes Koneksi SMTP'
                )}
              </Button>
              <Button 
                onClick={handleSaveSmtp}
                disabled={!user || smtpSaving || smtpLoading}
              >
                {smtpSaving ? (
                  <>
                    <Spinner data-icon="inline-start" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Pengaturan SMTP'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Push Notification Browser */}
        <Card className={pushEnabled ? "border-green-200" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellAlertIcon className="h-5 w-5" />
              Push Notification Browser
            </CardTitle>
            <CardDescription>
              Aktifkan push notification ke browser (Chrome/Firefox/Edge) saat event bisnis terjadi
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Aktifkan Push Notification</Label>
                <p className="text-sm text-muted-foreground">
                  {pushEnabled 
                    ? "Push notification akan dikirim ke browser yang sudah mengizinkan notifikasi." 
                    : "Push notification browser dimatikan."}
                </p>
              </div>
              {!pushLoading && (
                <Switch 
                  checked={pushEnabled}
                  onCheckedChange={setPushEnabled}
                  disabled={!user || pushLoading}
                />
              )}
            </div>

            {!supported ? (
              <p className="text-sm text-muted-foreground">
                Browser Anda tidak mendukung push notification.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Izin Browser:</span>
                  <span className={permission === "granted" ? "text-green-600" : "text-amber-600"}>
                    {permission === "granted" ? "Diizinkan" : permission === "denied" ? "Diblokir" : "Belum diminta"}
                  </span>
                </div>
                <div className="flex gap-3">
                  {!subscribed ? (
                    <Button 
                      variant="outline" 
                      onClick={handleEnableBrowserPush}
                      disabled={!user || pushSubLoading || !pushEnabled}
                    >
                      {pushSubLoading ? (
                        <>
                          <Spinner data-icon="inline-start" />
                          Meminta Izin...
                        </>
                      ) : (
                        "Aktifkan Notifikasi Browser"
                      )}
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      onClick={handleDisableBrowserPush}
                      disabled={!user || pushSubLoading}
                    >
                      Nonaktifkan Notifikasi Browser
                    </Button>
                  )}
                </div>
                {subscribed && (
                  <p className="flex items-center gap-1.5 text-sm text-green-600">
                    <CheckCircleIcon className="h-4 w-4" />
                    Browser terdaftar untuk menerima push notification
                  </p>
                )}
                {permission === "denied" && (
                  <p className="text-sm text-red-600">
                    Izin diblokir di browser. Aktifkan lewat pengaturan situs di browser.
                  </p>
                )}
              </div>
            )}

            <div className="flex pt-2">
              <Button 
                onClick={handleSavePush}
                disabled={!user || pushSaving || pushLoading}
              >
                {pushSaving ? (
                  <>
                    <Spinner data-icon="inline-start" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Pengaturan Push'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

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
