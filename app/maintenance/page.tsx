import Link from "next/link"
import { Button } from "@/components/ui/button"
import { WrenchIcon } from "@heroicons/react/24/outline"

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="h-24 w-24 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
            <WrenchIcon className="h-12 w-12 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Mode Maintenance Aktif
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Sistem sedang dalam perawatan. Silakan coba lagi nanti atau hubungi administrator untuk informasi lebih lanjut.
        </p>
        <div className="pt-4">
          <Button asChild>
            <Link href="/">Kembali ke Beranda</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}