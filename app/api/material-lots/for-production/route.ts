import { NextResponse } from "next/server"
import { db } from "@/db"
import { sql } from "drizzle-orm"

type LotRow = Record<string, unknown>

export async function GET() {
    try {
        const query = sql`
            SELECT 
                ml.id,
                ml.product_id as "productId",
                ml.lot_number as "lotNumber",
                ml.qr_code as "qrCode",
                ml.quantity,
                ml.initial_qty as "initialQty",
                ml.status,
                ml.is_ready_for_production as "isReadyForProduction",
                ml.notes,
                ml.created_at as "createdAt",
                ms.id as "skuId",
                ms.code as "skuCode",
                ms.name as "skuName",
                ms.category as "skuCategory",
                ms.unit as "skuUnit"
            FROM material_lots ml
            LEFT JOIN master_skus ms ON ml.product_id = ms.id
            WHERE ml.is_ready_for_production = true
            ORDER BY ml.created_at DESC
        `

        const results = await db.execute<LotRow>(query)
        const lots = results.rows as Array<{
            id: string
            productId: string
            lotNumber: string
            qrCode: string
            quantity: number
            initialQty: number
            status: string
            isReadyForProduction: boolean
            notes: string | null
            createdAt: Date
            skuId: string | null
            skuCode: string | null
            skuName: string | null
            skuCategory: string | null
            skuUnit: string | null
        }>

        const formattedLots = lots.map((lot) => ({
            id: lot.id,
            productId: lot.productId,
            lotNumber: lot.lotNumber,
            qrCode: lot.qrCode,
            quantity: lot.quantity,
            initialQty: lot.initialQty,
            status: lot.status,
            isReadyForProduction: lot.isReadyForProduction,
            notes: lot.notes,
            createdAt: lot.createdAt,
            product: lot.skuId ? {
                id: lot.skuId,
                code: lot.skuCode,
                name: lot.skuName,
                category: lot.skuCategory,
                unit: lot.skuUnit,
            } : null,
        }))

        return NextResponse.json(formattedLots)
    } catch (error) {
        console.error("Error fetching production-ready material lots:", error)
        return NextResponse.json({ error: "Failed to fetch material lots for production" }, { status: 500 })
    }
}
