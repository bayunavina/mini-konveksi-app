import { or, eq } from "drizzle-orm"
import { db } from "@/db"
import { masterSkus, products } from "@/db/schema"

// Menyamakan katalog `master_skus` dengan kolom inventory (products.id).
// Stok (inventory_stock / inventory_movements) ter-FK ke `products`,
// sedangkan picker produk di modul transfer & penyesuaian stok memakai `master_skus`.
// Helper ini memastikan SKU dari katalog punya baris padanannya di `products`
// (source "SKU", source_id = id master_skus) lalu mengembalikan `products.id`.
// Jika id yang diberikan sudah merupakan `products.id`, dikembalikan apa adanya.
export async function resolveCatalogItemToProductId(productId: string | null | undefined): Promise<string | null> {
  if (!productId) return null

  const existingProduct = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1)
  if (existingProduct.length > 0) return existingProduct[0].id

  const skuRows = await db
    .select()
    .from(masterSkus)
    .where(eq(masterSkus.id, productId))
    .limit(1)
  const sku = skuRows[0]
  if (!sku) return null

  const existingMirror = await db
    .select({ id: products.id })
    .from(products)
    .where(or(eq(products.sourceId, sku.id), eq(products.sku, sku.code)))
    .limit(1)
  if (existingMirror.length > 0) return existingMirror[0].id

  const price = Math.round((parseFloat(String(sku.price ?? "0")) || 0))
  const created = await db
    .insert(products)
    .values({
      sku: sku.code,
      name: sku.name,
      category: sku.category || null,
      unit: sku.unit || "Pcs",
      price,
      minStock: 0,
      isActive: sku.isActive ?? true,
      source: "SKU",
      sourceId: sku.id,
    })
    .onConflictDoNothing()
    .returning({ id: products.id })

  if (created.length > 0) return created[0].id

  const afterConflict = await db
    .select({ id: products.id })
    .from(products)
    .where(or(eq(products.sourceId, sku.id), eq(products.sku, sku.code)))
    .limit(1)
  return afterConflict[0]?.id ?? null
}