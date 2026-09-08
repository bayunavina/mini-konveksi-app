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
} from "@/components/ui/dialog"
import { toast } from "sonner"

export function SkuEditDialog({
  id,
  initialForm,
  onClose,
  open,
  onOpenChange,
}: {
  id: string
  initialForm: { code: string; name: string; category: string; price: string }
  onClose: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [form, setForm] = useState(initialForm)
  const queryClient = useQueryClient()

  const handleSave = async () => {
    if (!form.code || !form.name) return
    try {
      const response = await fetch(`/api/master-skus/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: form.code, name: form.name, category: form.category, price: parseInt(form.price) || 0, unit: "Pcs" }),
      })
      if (response.ok) {
        toast.success("Bahan baku berhasil diupdate")
        queryClient.invalidateQueries({ queryKey: ["master-skus"] })
        setForm({ code: "", name: "", category: "", price: "" })
        onClose()
        onOpenChange(false)
      } else {
        const err = await response.json().catch(() => ({}))
        toast.error(err.error || "Gagal mengupdate bahan baku")
      }
    } catch {
      toast.error("Terjadi kesalahan")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Bahan Baku</DialogTitle>
          <DialogDescription>Masukkan data bahan baku</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kode Bahan Baku</Label>
              <Input placeholder="KAIN-KATUN-001" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Input placeholder="Kaos, Kemeja..." value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Nama Bahan Baku</Label>
            <Input placeholder="Nama bahan baku..." value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Harga</Label>
            <FormattedNumberInput placeholder="0" value={form.price} onValueChange={(v) => setForm({ ...form, price: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSave} disabled={!form.code || !form.name}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}