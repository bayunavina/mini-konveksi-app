"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { FormattedNumberInput } from "@/components/ui/formatted-number-input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/shared"
import { ArrowLeftIcon, PlusIcon, CubeIcon, TrashIcon } from "@heroicons/react/24/outline"
import { useFetch } from "@/hooks/useFetch"

interface TransferItem {
  id: string
  sku: string
  name: string
  quantity: number
  unit: string
}

interface Warehouse {
  id: string
  code: string
  name: string
}

interface Product {
  id: string
  sku: string
  name: string
  category?: string
}

export default function NewFinishedTransferPage() {
  const router = useRouter()
  const [selectedProduct, setSelectedProduct] = useState("")
  const [destinationWarehouse, setDestinationWarehouse] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<TransferItem[]>([])
  const [quantity, setQuantity] = useState("")

  const { data: warehouses } = useFetch<Warehouse[]>("/api/warehouses")
  const { data: products } = useFetch<Product[]>("/api/products")

  const handleAddItem = () => {
    if (!selectedProduct || !quantity) return

    const product = products?.find((p) => p.id === selectedProduct)
    if (!product) return

    const existingItem = items.find((i) => i.sku === product.sku)
    if (existingItem) {
      setItems(
        items.map((i) =>
          i.sku === product.sku
            ? { ...i, quantity: i.quantity + parseInt(quantity) }
            : i
        )
      )
    } else {
      const newItem: TransferItem = {
        id: Math.random().toString(36).substring(7),
        sku: product.sku,
        name: product.name,
        quantity: parseInt(quantity),
        unit: "Pcs",
      }
      setItems([...items, newItem])
    }
    setSelectedProduct("")
    setQuantity("")
  }

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const handleSubmit = async () => {
    if (!destinationWarehouse || items.length === 0) return

    try {
      const response = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "FINISHED",
          toWarehouseId: destinationWarehouse,
          notes,
          items: items.map(i => ({ productId: i.id, quantity: i.quantity, unit: i.unit })),
        }),
      })
      if (response.ok) {
        router.push("/dashboard/transfer/finished")
      }
    } catch (error) {
      console.error("Error creating transfer:", error)
    }
  }

  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Transfer Barang Jadi Baru"
        description="Transfer barang jadi dari produksi ke gudang"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/transfer/finished">
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Kembali
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Detail Transfer</CardTitle>
            <CardDescription>Isi detail transfer barang jadi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Asal</Label>
                <Input value="Produksi" disabled />
              </div>

              <div className="space-y-2">
                <Label>Gudang Tujuan</Label>
                <Select value={destinationWarehouse} onValueChange={setDestinationWarehouse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih gudang tujuan" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses?.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea
                placeholder="Tambahkan catatan jika diperlukan..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ringkasan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Item</span>
              <span className="font-medium">{items.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Qty</span>
              <span className="font-medium">{totalQty} Pcs</span>
            </div>
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={!destinationWarehouse || items.length === 0}
            >
              <CubeIcon className="mr-2 h-4 w-4" />
              Buat Transfer
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Produk</CardTitle>
          <CardDescription>Tambah produk jadi yang akan ditransfer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label>Pilih Produk</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih produk..." />
                </SelectTrigger>
                <SelectContent>
                  {products?.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.sku} - {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-32 space-y-2">
              <Label>Jumlah</Label>
              <FormattedNumberInput
                placeholder="0"
                value={quantity}
                onValueChange={(v) => setQuantity(v)}
              />
            </div>
            <Button onClick={handleAddItem} disabled={!selectedProduct || !quantity}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Tambah
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Belum ada produk. Tambahkan produk di atas.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono">{item.sku}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.quantity} {item.unit}</TableCell>
                    <TableCell className="flex justify-center">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
