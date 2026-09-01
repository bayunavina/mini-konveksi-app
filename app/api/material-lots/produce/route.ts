import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { materialLots, products, productionFromMaterials } from "@/db/schema"
import { eq } from "drizzle-orm"

function generateSku(): string {
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `PRD-${timestamp}-${random}`
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { lotId, producedQty, notes } = body

        if (!lotId || !producedQty) {
            return NextResponse.json({ error: "lotId and producedQty are required" }, { status: 400 })
        }

        const qtyToProduce = parseInt(producedQty)

        const lot = await db
            .select()
            .from(materialLots)
            .where(eq(materialLots.id, lotId))

        if (lot.length === 0) {
            return NextResponse.json({ error: "Lot not found" }, { status: 404 })
        }

        const currentLot = lot[0]

        if (currentLot.quantity < qtyToProduce) {
            return NextResponse.json({
                error: "Insufficient stock",
                available: currentLot.quantity,
                requested: qtyToProduce
            }, { status: 400 })
        }

        const newQuantity = currentLot.quantity - qtyToProduce
        const newStatus = newQuantity === 0 ? "EMPTY" : "AVAILABLE"

        await db
            .update(materialLots)
            .set({
                quantity: newQuantity,
                status: newStatus,
                isReadyForProduction: true,
                updatedAt: new Date(),
            })
            .where(eq(materialLots.id, lotId))

        const product = await db
            .select()
            .from(products)
            .where(eq(products.id, currentLot.productId))

        const newProduct = await db.insert(products).values({
            sku: generateSku(),
            name: `${product[0]?.name || "Produk"} - Lot ${currentLot.lotNumber}`,
            category: product[0]?.category || "Otomatis",
            unit: product[0]?.unit || "Pcs",
            price: 0,
            minStock: 0,
            source: "AUTO",
            sourceId: currentLot.id,
            notes: `Produksi dari Lot ${currentLot.lotNumber}. Qty: ${qtyToProduce} ${product[0]?.unit || "Pcs"}. ${notes || ""}`,
        }).returning()

        const productionLog = await db.insert(productionFromMaterials).values({
            lotId,
            productId: newProduct[0].id,
            producedQty: qtyToProduce,
            usedQty: qtyToProduce,
            notes: notes || `Produksi dari Lot ${currentLot.lotNumber}`,
        }).returning()

        return NextResponse.json({
            success: true,
            production: productionLog[0],
            finishedGood: newProduct[0],
            lot: {
                ...currentLot,
                quantity: newQuantity,
                status: newStatus,
                isReadyForProduction: true,
            },
            message: `Berhasil memproduksi ${qtyToProduce} ${product[0]?.unit || "Pcs"} dari Lot ${currentLot.lotNumber}`,
        }, { status: 201 })
    } catch (error) {
        console.error("Error producing from material:", error)
        return NextResponse.json({ error: "Failed to produce" }, { status: 500 })
    }
}
