import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { materialLots } from "@/db/schema"
import { sql } from "drizzle-orm"

type LotRow = Record<string, unknown>

function generateLotNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `BB-${timestamp}-${random}`
}

function generateQrCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 10).toUpperCase()
    return `MAT-${timestamp}${random}`
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const search = searchParams.get("search")
        const productId = searchParams.get("productId")
        const lotNumber = searchParams.get("lotNumber")
        const qrCode = searchParams.get("qrCode")

        const query = sql`
            SELECT 
                ml.id,
                ml.product_id as "productId",
                ml.lot_number as "lotNumber",
                ml.qr_code as "qrCode",
                ml.quantity,
                ml.initial_qty as "initialQty",
                ml.status,
                ml.notes,
                ml.is_ready_for_production as "isReadyForProduction",
                ml.created_at as "createdAt",
                ms.id as "skuId",
                ms.code as "skuCode",
                ms.name as "skuName",
                ms.category as "skuCategory",
                ms.unit as "skuUnit"
            FROM material_lots ml
            LEFT JOIN master_skus ms ON ml.product_id = ms.id
        `

        const results = await db.execute<LotRow>(query)
        let lots = results.rows as Array<{
            id: string
            productId: string
            lotNumber: string
            qrCode: string
            quantity: number
            initialQty: number
            status: string
            isReadyForProduction: boolean | null
            notes: string | null
            createdAt: Date
            skuId: string | null
            skuCode: string | null
            skuName: string | null
            skuCategory: string | null
            skuUnit: string | null
        }>

        if (productId) {
            lots = lots.filter((r) => r.productId === productId)
        }

        if (lotNumber) {
            lots = lots.filter((r) =>
                (r.lotNumber || '').toLowerCase().includes(lotNumber.toLowerCase())
            )
        }

        if (qrCode) {
            lots = lots.filter((r) =>
                (r.qrCode || '').toLowerCase().includes(qrCode.toLowerCase())
            )
        }

        if (search) {
            const searchLower = search.toLowerCase()
            lots = lots.filter((r) =>
                (r.lotNumber || '').toLowerCase().includes(searchLower) ||
                (r.qrCode || '').toLowerCase().includes(searchLower) ||
                (r.skuCode || '').toLowerCase().includes(searchLower) ||
                (r.skuName || '').toLowerCase().includes(searchLower)
            )
        }

        const formattedLots = lots.map((lot) => ({
            id: lot.id,
            productId: lot.productId,
            lotNumber: lot.lotNumber,
            qrCode: lot.qrCode,
            quantity: lot.quantity,
            initialQty: lot.initialQty,
            status: lot.status,
            isReadyForProduction: lot.isReadyForProduction ?? false,
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
        console.error("Error fetching material lots:", error)
        return NextResponse.json({ error: "Failed to fetch material lots" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { productId, quantity, notes } = body

        if (!productId || !quantity) {
            return NextResponse.json({ error: "productId and quantity are required" }, { status: 400 })
        }

        const lotNumber = generateLotNumber()
        const qrCode = generateQrCode()

        const newLot = await db.insert(materialLots).values({
            productId,
            lotNumber,
            qrCode,
            quantity: parseInt(quantity),
            initialQty: parseInt(quantity),
            status: "AVAILABLE",
            notes,
        }).returning()

        const lot = newLot[0]

        const skuResult = await db.execute(sql`
            SELECT id, code, name, category, unit
            FROM master_skus
            WHERE id = ${productId}
            LIMIT 1
        `)

        return NextResponse.json({
            ...lot,
            product: skuResult.rows[0] || null,
        }, { status: 201 })
    } catch (error) {
        console.error("Error creating material lot:", error)
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        return NextResponse.json({ error: `Failed to create material lot: ${errorMessage}` }, { status: 500 })
    }
}
