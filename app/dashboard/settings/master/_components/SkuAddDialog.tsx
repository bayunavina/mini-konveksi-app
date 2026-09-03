"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormattedNumberInput } from "@/components/ui/formatted-number-input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PlusIcon } from "@heroicons/react/24/outline"
import { toast } from "sonner"

export function SkuAddDialog() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ code: "", name: "", category: "", price: "" })
  const queryClient = useQueryClient()

  const handleSave = async () => {
    if (!form.code || !form.name) return
    try {
      const response = await fetch("/api/master-skus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: form.code, name: form.name, category: form.category, price: parseInt(form.price) || 0, unit: "Pcs" }),
      })
      if (response.ok) {
        toast.success("SKU berhasil ditambahkan")
        queryClient.invalidateQueries({ queryKey: ["master-skus"] })
        setOpen(false)
        setForm({ code: "", name: "", category: "", price: "" })
      } else {
        const err = await response.json().catch(() => ({}))
        toast.error(err.error || "Gagal menambahkan SKU")
      }
    } catch {
      toast.error("Terjadi kesalahan")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="dark:bg-[var(--brand-primary)] dark:hover:bg-[var(--brand-primary)]/80"><PlusIcon className="mr-2 h-4 w-4" />Tambah SKU</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah SKU Baru</DialogTitle>
          <DialogDescription>Masukkan data SKU</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input placeholder="SKU-xxx" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Input placeholder="Kaos, Kemeja..." value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Produk</Label>
            <Input placeholder="Nama produk..." value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Harga</Label>
            <FormattedNumberInput placeholder="0" value={form.price} onValueChange={(v) => setForm({ ...form, price: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={handleSave} disabled={!form.code || !form.name}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}