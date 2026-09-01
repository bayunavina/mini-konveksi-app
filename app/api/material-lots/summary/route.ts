import { NextResponse } from "next/server"
import { db } from "@/db"
import { sql } from "drizzle-orm"

export async function GET() {
    try {
        const result = await db.execute(sql`
            SELECT 
                ml.id,
                ml.product_id as "productId",
                ml.quantity,
                ml.initial_qty as "initialQty",
                ml.notes as "remark",
                ms.code as "productSku",
                ms.name as "productName"
            FROM material_lots ml
            LEFT JOIN master_skus ms ON ml.product_id = ms.id
        `)

        const allLots = (result.rows as Array<Record<string, unknown>>).map((row) => ({
            id: row.id as string,
            productId: row.productId as string,
            quantity: row.quantity as number,
            initialQty: row.initialQty as number,
            productSku: row.productSku as string | null,
            productName: row.productName as string | null,
            remark: row.remark as string | null,
        }))

        const totalStock = allLots.reduce((sum, lot) => sum + lot.quantity, 0)
        const totalInitial = allLots.reduce((sum, lot) => sum + lot.initialQty, 0)
        const totalUsed = totalInitial - totalStock

        const byProduct = allLots.reduce((acc: Record<string, {
            productId: string
            productName: string
            productSku: string
            totalStock: number
            totalInitial: number
            totalUsed: number
            itemCount: number
            remarks: string[]
        }>, lot) => {
            const key = lot.productId
            if (!acc[key]) {
                acc[key] = {
                    productId: lot.productId,
                    productName: lot.productName || "Unknown",
                    productSku: lot.productSku || "Unknown",
                    totalStock: 0,
                    totalInitial: 0,
                    totalUsed: 0,
                    itemCount: 0,
                    remarks: [],
                }
            }
            acc[key].totalStock += lot.quantity
            acc[key].totalInitial += lot.initialQty
            acc[key].totalUsed += (lot.initialQty - lot.quantity)
            acc[key].itemCount += 1
            if (lot.remark) {
                acc[key].remarks.push(lot.remark)
            }
            return acc
        }, {})

        return NextResponse.json({
            summary: {
                totalStock,
                totalInitial,
                totalUsed,
                itemCount: allLots.length,
            },
            byProduct: Object.values(byProduct),
            lots: allLots,
        })
    } catch (error) {
        console.error("Error fetching material summary:", error)
        return NextResponse.json({ error: "Failed to fetch summary" }, { status: 500 })
    }
}
