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

export function SupplierEditDialog({
  id,
  initialForm,
  onClose,
  open,
  onOpenChange,
}: {
  id: string
  initialForm: { code: string; name: string; contactPerson: string; phone: string; address: string }
  onClose: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [form, setForm] = useState(initialForm)
  const queryClient = useQueryClient()

  const handleSave = async () => {
    if (!form.code || !form.name) return
    try {
      const response = await fetch(`/api/suppliers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (response.ok) {
        toast.success("Supplier berhasil diupdate")
        queryClient.invalidateQueries({ queryKey: ["master-suppliers"] })
        setForm({ code: "", name: "", contactPerson: "", phone: "", address: "" })
        onClose()
        onOpenChange(false)
      } else {
        const err = await response.json().catch(() => ({}))
        toast.error(err.error || "Gagal mengupdate supplier")
      }
    } catch {
      toast.error("Terjadi kesalahan")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Supplier</DialogTitle>
          <DialogDescription>Masukkan data supplier</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kode</Label>
              <Input placeholder="SUP-xxx" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input placeholder="Nama supplier..." value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Input placeholder="Nama CP..." value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Telepon</Label>
              <Input placeholder="021-xxxxxxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Alamat</Label>
            <Input placeholder="Alamat lengkap..." value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
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