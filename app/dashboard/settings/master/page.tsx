"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/shared"
import { ArrowLeftIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline"
import { useFetch } from "@/hooks/useFetch"
import { toast } from "sonner"
import { useCurrency } from "@/hooks/useCurrency"

interface SKU {
  id: string
  code: string
  name: string
  category: string
  unit: string
  price: number
  isActive: boolean
}

interface Supplier {
  id: string
  code: string
  name: string
  contactPerson: string
  phone: string
  address: string
}

interface CostCategory {
  id: string
  code: string
  name: string
  type: "DIRECT" | "INDIRECT"
  description?: string
}

export default function MasterPage() {
  const { formatCurrency } = useCurrency()
  const { data: apiSkus, refetch: refetchSkus } = useFetch<SKU[]>("/api/master-skus")
  const [skus, setSkus] = useState<SKU[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [costCategories, setCostCategories] = useState<CostCategory[]>([])

  useEffect(() => {
    if (apiSkus) {
      setSkus(apiSkus)
    }
    const savedSuppliers = localStorage.getItem("master_suppliers")
    const savedCostCategories = localStorage.getItem("master_cost_categories")
    
    if (savedSuppliers) {
      setSuppliers(JSON.parse(savedSuppliers))
    }
    if (savedCostCategories) {
      setCostCategories(JSON.parse(savedCostCategories))
    }
  }, [apiSkus])

  const saveSuppliers = (data: Supplier[]) => {
    setSuppliers(data)
    localStorage.setItem("master_suppliers", JSON.stringify(data))
  }

  const saveCostCategories = (data: CostCategory[]) => {
    setCostCategories(data)
    localStorage.setItem("master_cost_categories", JSON.stringify(data))
  }

  const [skuDialogOpen, setSkuDialogOpen] = useState(false)
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false)
  const [costDialogOpen, setCostDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: "SKU" | "SUPPLIER" | "COST"; name: string } | null>(null)

  const [skuForm, setSkuForm] = useState({ code: "", name: "", category: "", price: "" })
  const [supplierForm, setSupplierForm] = useState({ code: "", name: "", contactPerson: "", phone: "", address: "" })
  const [costForm, setCostForm] = useState({ code: "", name: "", type: "DIRECT" as "DIRECT" | "INDIRECT", description: "" })

  const handleAddSKU = async () => {
    if (!skuForm.code || !skuForm.name) return
    try {
      const response = await fetch("/api/master-skus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: skuForm.code,
          name: skuForm.name,
          category: skuForm.category,
          price: parseInt(skuForm.price) || 0,
          unit: "Pcs"
        }),
      })
      if (response.ok) {
        toast.success("SKU berhasil ditambahkan")
        refetchSkus()
        setSkuDialogOpen(false)
        setSkuForm({ code: "", name: "", category: "", price: "" })
      } else {
        toast.error("Gagal menambahkan SKU")
      }
    } catch (error) {
      console.error("Error adding SKU:", error)
      toast.error("Terjadi kesalahan")
    }
  }

  const handleToggleSKU = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/master-skus/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      })
      if (response.ok) {
        toast.success("Status SKU berhasil diupdate")
        refetchSkus()
      } else {
        toast.error("Gagal mengupdate status")
      }
    } catch (error) {
      console.error("Error toggling SKU:", error)
      toast.error("Terjadi kesalahan")
    }
  }

  const handleDeleteClick = (id: string, type: "SKU" | "SUPPLIER" | "COST", name: string) => {
    setDeleteTarget({ id, type, name })
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    
    try {
      let success = false
      let errorMsg = ""
      
      if (deleteTarget.type === "SKU") {
        const response = await fetch(`/api/master-skus/${deleteTarget.id}`, { method: "DELETE" })
        if (response.ok) {
          success = true
          refetchSkus()
        } else {
          errorMsg = "Gagal menghapus SKU"
        }
      } else if (deleteTarget.type === "SUPPLIER") {
        const newSuppliers = suppliers.filter(s => s.id !== deleteTarget.id)
        saveSuppliers(newSuppliers)
        success = true
      } else if (deleteTarget.type === "COST") {
        const newCosts = costCategories.filter(c => c.id !== deleteTarget.id)
        saveCostCategories(newCosts)
        success = true
      }
      
      if (success) {
        toast.success(`${deleteTarget.type} berhasil dihapus`)
      } else {
        toast.error(errorMsg)
      }
    } catch (error) {
      console.error("Error deleting:", error)
      toast.error("Terjadi kesalahan")
    } finally {
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
    }
  }

  const handleAddSupplier = () => {
    if (!supplierForm.code || !supplierForm.name) return
    const newSupplier = { ...supplierForm, id: crypto.randomUUID() }
    saveSuppliers([...suppliers, newSupplier])
    setSupplierDialogOpen(false)
    setSupplierForm({ code: "", name: "", contactPerson: "", phone: "", address: "" })
  }

  const handleAddCost = () => {
    if (!costForm.code || !costForm.name) return
    const newCost = { ...costForm, id: crypto.randomUUID() }
    saveCostCategories([...costCategories, newCost])
    setCostDialogOpen(false)
    setCostForm({ code: "", name: "", type: "DIRECT", description: "" })
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Data Master"
        description="Kelola SKU, Supplier, dan Kategori Biaya"
        actions={
          <Button variant="outline" asChild>
            <Link href="/dashboard/settings">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Kembali
            </Link>
          </Button>
        }
      />

      <Tabs defaultValue="sku" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sku">SKU</TabsTrigger>
          <TabsTrigger value="supplier">Supplier</TabsTrigger>
          <TabsTrigger value="cost">Kategori Biaya</TabsTrigger>
        </TabsList>

        <TabsContent value="sku">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Daftar SKU</CardTitle>
                  <CardDescription>Kelola Stock Keeping Unit</CardDescription>
                </div>
                  <Dialog open={skuDialogOpen} onOpenChange={setSkuDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="dark:bg-[#304ffe] dark:hover:bg-[#304ffe]/80"><PlusIcon className="mr-2 h-4 w-4" />Tambah SKU</Button>
                    </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Tambah SKU Baru</DialogTitle>
                      <DialogDescription>Masukkan data SKU</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>SKU</Label>
                          <Input placeholder="SKU-xxx" value={skuForm.code} onChange={(e) => setSkuForm({ ...skuForm, code: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Kategori</Label>
                          <Input placeholder="Kaos, Kemeja..." value={skuForm.category} onChange={(e) => setSkuForm({ ...skuForm, category: e.target.value })} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Produk</Label>
                        <Input placeholder="Nama produk..." value={skuForm.name} onChange={(e) => setSkuForm({ ...skuForm, name: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Harga</Label>
                        <Input type="number" placeholder="0" value={skuForm.price} onChange={(e) => setSkuForm({ ...skuForm, price: e.target.value })} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setSkuDialogOpen(false)}>Batal</Button>
                      <Button onClick={handleAddSKU} disabled={!skuForm.code || !skuForm.name}>Simpan</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Produk</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Harga</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skus.map((sku) => (
                    <TableRow key={sku.id} className={!sku.isActive ? "opacity-50" : ""}>
                      <TableCell className="font-mono">{sku.code}</TableCell>
                      <TableCell className="font-medium">{sku.name}</TableCell>
                      <TableCell><Badge variant="outline">{sku.category}</Badge></TableCell>
                      <TableCell>{formatCurrency(sku.price)}</TableCell>
                      <TableCell>
                        <Badge className={sku.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                          {sku.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleToggleSKU(sku.id, sku.isActive)}
                          title={sku.isActive ? "Nonaktifkan" : "Aktifkan"}
                        >
                          {sku.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600"
                          onClick={() => handleDeleteClick(sku.id, "SKU", sku.name)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="supplier">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Daftar Supplier</CardTitle>
                  <CardDescription>Kelola data supplier bahan baku</CardDescription>
                </div>
                  <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="dark:bg-[#304ffe] dark:hover:bg-[#304ffe]/80"><PlusIcon className="mr-2 h-4 w-4" />Tambah Supplier</Button>
                    </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Tambah Supplier</DialogTitle>
                      <DialogDescription>Masukkan data supplier</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Kode</Label>
                          <Input placeholder="SUP-xxx" value={supplierForm.code} onChange={(e) => setSupplierForm({ ...supplierForm, code: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Nama</Label>
                          <Input placeholder="Nama supplier..." value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Contact Person</Label>
                          <Input placeholder="Nama CP..." value={supplierForm.contactPerson} onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Telepon</Label>
                          <Input placeholder="021-xxxxxxx" value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Alamat</Label>
                        <Input placeholder="Alamat lengkap..." value={supplierForm.address} onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setSupplierDialogOpen(false)}>Batal</Button>
                      <Button onClick={handleAddSupplier} disabled={!supplierForm.code || !supplierForm.name}>Simpan</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Telepon</TableHead>
                    <TableHead>Alamat</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-mono">{supplier.code}</TableCell>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell>{supplier.contactPerson || "-"}</TableCell>
                      <TableCell>{supplier.phone}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{supplier.address}</TableCell>
                      <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteClick(supplier.id, "SUPPLIER", supplier.name)}>
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cost">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Kategori Biaya</CardTitle>
                  <CardDescription>Kelola kategori biaya produksi</CardDescription>
                </div>
                <Dialog open={costDialogOpen} onOpenChange={setCostDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="dark:bg-[#304ffe] dark:hover:bg-[#304ffe]/80"><PlusIcon className="mr-2 h-4 w-4" />Tambah Kategori</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Tambah Kategori Biaya</DialogTitle>
                      <DialogDescription>Masukkan data kategori biaya</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Kode</Label>
                          <Input placeholder="BBL, TKN..." value={costForm.code} onChange={(e) => setCostForm({ ...costForm, code: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Jenis</Label>
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={costForm.type}
                            onChange={(e) => setCostForm({ ...costForm, type: e.target.value as "DIRECT" | "INDIRECT" })}
                          >
                            <option value="DIRECT">Langsung</option>
                            <option value="INDIRECT">Tidak Langsung</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Nama</Label>
                        <Input placeholder="Nama kategori..." value={costForm.name} onChange={(e) => setCostForm({ ...costForm, name: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Deskripsi</Label>
                        <Input placeholder="Deskripsi..." value={costForm.description} onChange={(e) => setCostForm({ ...costForm, description: e.target.value })} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCostDialogOpen(false)}>Batal</Button>
                      <Button onClick={handleAddCost} disabled={!costForm.code || !costForm.name}>Simpan</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-mono">{category.code}</TableCell>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>
                        <Badge className={category.type === "DIRECT" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}>
                          {category.type === "DIRECT" ? "Langsung" : "Tidak Langsung"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{category.description || "-"}</TableCell>
                      <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteClick(category.id, "COST", category.name)}>
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrashIcon className="h-5 w-5 text-red-600" />
              Konfirmasi Hapus
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus {deleteTarget?.type === "SKU" ? "SKU" : deleteTarget?.type === "SUPPLIER" ? "Supplier" : "Kategori Biaya"} ini?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                {deleteTarget?.name || "Item yang akan dihapus"}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              <TrashIcon className="mr-2 h-4 w-4" />
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
