"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

export function CostEditDialog({
  id,
  initialForm,
  onClose,
  open,
  onOpenChange,
}: {
  id: string
  initialForm: { code: string; name: string; type: "DIRECT" | "INDIRECT"; description: string }
  onClose: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [form, setForm] = useState(initialForm)
  const queryClient = useQueryClient()

  const handleSave = async () => {
    if (!form.code || !form.name) return
    try {
      const response = await fetch(`/api/cost-categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (response.ok) {
        toast.success("Kategori biaya berhasil diupdate")
        queryClient.invalidateQueries({ queryKey: ["master-cost-categories"] })
        setForm({ code: "", name: "", type: "DIRECT", description: "" })
        onClose()
        onOpenChange(false)
      } else {
        const err = await response.json().catch(() => ({}))
        toast.error(err.error || "Gagal mengupdate kategori biaya")
      }
    } catch {
      toast.error("Terjadi kesalahan")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Kategori Biaya</DialogTitle>
          <DialogDescription>Masukkan data kategori biaya</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kode</Label>
              <Input placeholder="BBL, TKN..." value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Jenis</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as "DIRECT" | "INDIRECT" })}
              >
                <option value="DIRECT">Langsung</option>
                <option value="INDIRECT">Tidak Langsung</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Nama</Label>
            <Input placeholder="Nama kategori..." value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Deskripsi</Label>
            <Input placeholder="Deskripsi..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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