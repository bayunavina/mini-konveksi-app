"use client"

import { SimpleThemeToggle } from "@/components/theme-toggle"
import { AuthButtons } from "@/components/auth-buttons"
import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision"
import { 
  Scissors, 
  Shirt,
  Users,
  Package,
  ClipboardCheck,
  Warehouse,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"

const features = [
  {
    icon: Package,
    title: "Manajemen Produksi",
    description: "Kelola job order, assignment, dan progress produksi dengan mudah",
  },
  {
    icon: Users,
    title: "Kelola Karyawan",
    description: "Sistem attendance, penggajian, dan kasbon karyawan terintegrasi",
  },
  {
    icon: ClipboardCheck,
    title: "Quality Control",
    description: "QC workflow dengan barcode scanning untuk validasi produk",
  },
  {
    icon: Warehouse,
    title: "Inventory & Transfer",
    description: "Monitoring stok barang jadi, bahan baku, dan transfer antar gudang",
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[var(--brand-primary)] flex items-center justify-center">
                <Scissors className="h-5 w-5 text-white" />
              </div>
            </div>
            <span className="text-lg font-bold uppercase tracking-wider">
              ERP Konveksi
            </span>
          </div>
          <div className="flex items-center gap-3">
            <AuthButtons />
            <SimpleThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero Section with Background Beams */}
      <section className="relative">
        <BackgroundBeamsWithCollision className="relative z-10">
          <div className="container mx-auto px-4 md:px-6 py-20 md:py-32">
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border bg-card/50 px-4 py-1.5 text-sm backdrop-blur-sm mb-6">
                <Shirt className="h-4 w-4 text-[var(--brand-primary)]" />
                <span className="text-muted-foreground">Sistem Manajemen Produksi Konveksi</span>
              </div>
              
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl mb-6">
                <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/80 dark:from-white dark:via-white dark:to-white/80 bg-clip-text text-transparent">
                  Kelola Produksi
                </span>
                <br />
                <span className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)]/80 bg-clip-text text-transparent">
                  Lebih Modern
                </span>
              </h1>
              
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl mb-10">
                Tingkatkan efisiensi operasional konveksi Anda dengan sistem terintegrasi untuk 
                manajemen produksi, inventory, karyawan, dan laporan.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link 
                  href="/sign-in"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                >
                  Masuk Sekarang
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </BackgroundBeamsWithCollision>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Fitur Unggulan
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Sistem lengkap untuk kebutuhan konveksi modern dengan berbagai fitur terintegrasi
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-card rounded-2xl p-6 border border-border hover:border-[var(--brand-primary)]/50 hover:shadow-lg transition-all"
              >
                <div className="h-12 w-12 rounded-xl bg-[var(--brand-primary)]/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-[var(--brand-primary)]" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-background mt-auto">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <div className="relative flex h-8 w-8 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-[var(--brand-primary)] flex items-center justify-center p-1">
                  <Scissors className="h-full w-full text-white" />
                </div>
              </div>
              <span className="font-semibold uppercase tracking-wider">ERP Konveksi</span>
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-3 uppercase tracking-wide">
            Sistem Manajemen Produksi Konveksi &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  )
}
