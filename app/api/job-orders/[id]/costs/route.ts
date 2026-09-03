import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { sql } from "drizzle-orm"

async function ensureTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS job_order_costs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      job_order_id uuid REFERENCES job_orders(id) ON DELETE CASCADE NOT NULL,
      cost_category_code text NOT NULL,
      cost_category_name text,
      type text NOT NULL,
      estimated_amount integer DEFAULT 0 NOT NULL,
      actual_amount integer DEFAULT 0 NOT NULL,
      notes text,
      created_at timestamp DEFAULT NOW(),
      updated_at timestamp DEFAULT NOW()
    )
  `)
  // ensure index
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_job_order_costs_jo ON job_order_costs(job_order_id)`)
  // ensure transactions.job_order_id column
  await db.execute(sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS job_order_id uuid REFERENCES job_orders(id) ON DELETE SET NULL`)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureTables()
    const { id } = await params
    const result = await db.execute(sql`
      SELECT id, job_order_id as "jobOrderId", cost_category_code as "costCategoryCode", cost_category_name as "costCategoryName", type, estimated_amount as "estimatedAmount", actual_amount as "actualAmount", notes, created_at as "createdAt", updated_at as "updatedAt"
      FROM job_order_costs
      WHERE job_order_id = ${id}::uuid
      ORDER BY type DESC, cost_category_code ASC
    `)
    // sort DIRECT first
    const rows = (result.rows as any[]).sort((a,b) => {
      if (a.type !== b.type) return a.type === "DIRECT" ? -1 : 1
      return a.costCategoryCode.localeCompare(b.costCategoryCode)
    })
    
    // also compute actual from linked transactions as fallback
    const actualRes = await db.execute(sql`
      SELECT category, COALESCE(SUM(amount),0) as total
      FROM transactions
      WHERE job_order_id = ${id}::uuid AND type = 'EXPENSE'
      GROUP BY category
    `)
    const actualMap: Record<string, number> = {}
    ;(actualRes.rows as any[]).forEach(r => { actualMap[r.category] = Number(r.total) })

    // merge: if actualAmount is 0 but transactions exist, use transactions total
    const merged = rows.map(r => ({
      ...r,
      actualAmount: r.actualAmount > 0 ? r.actualAmount : (actualMap[r.costCategoryCode] || 0),
    }))

    // include categories that have actual transactions but no estimated entry
    const estimatedCodes = new Set(rows.map(r => r.costCategoryCode))
    for (const [cat, total] of Object.entries(actualMap)) {
      if (!estimatedCodes.has(cat)) {
        merged.push({
          id: `actual-${cat}`,
          jobOrderId: id,
          costCategoryCode: cat,
          costCategoryName: cat,
          type: "INDIRECT",
          estimatedAmount: 0,
          actualAmount: total,
          notes: "Auto dari transaksi",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }
    }

    return NextResponse.json(merged)
  } catch (error) {
    console.error("Error fetching job order costs:", error)
    return NextResponse.json({ error: "Failed to fetch costs" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureTables()
    const { id } = await params
    const body = await request.json()
    const { costs } = body as { costs: Array<{ costCategoryCode: string; costCategoryName?: string; type: "DIRECT"|"INDIRECT"; estimatedAmount: number; notes?: string }> }
    
    if (!Array.isArray(costs)) {
      return NextResponse.json({ error: "costs harus array" }, { status: 400 })
    }

    // validate JO exists
    const joCheck = await db.execute(sql`SELECT id FROM job_orders WHERE id = ${id}::uuid`)
    if ((joCheck.rows as any[]).length === 0) {
      return NextResponse.json({ error: "Job Order tidak ditemukan" }, { status: 404 })
    }

    // delete existing and re-insert (simple upsert)
    await db.execute(sql`DELETE FROM job_order_costs WHERE job_order_id = ${id}::uuid`)

    for (const c of costs) {
      if (!c.costCategoryCode || !c.type) continue
      const est = Math.floor(Number(c.estimatedAmount) || 0)
      if (est < 0) continue
      await db.execute(sql`
        INSERT INTO job_order_costs (job_order_id, cost_category_code, cost_category_name, type, estimated_amount, notes)
        VALUES (${id}::uuid, ${c.costCategoryCode}, ${c.costCategoryName || c.costCategoryCode}, ${c.type}, ${est}, ${c.notes || null})
      `)
    }

    const result = await db.execute(sql`
      SELECT id, job_order_id as "jobOrderId", cost_category_code as "costCategoryCode", cost_category_name as "costCategoryName", type, estimated_amount as "estimatedAmount", actual_amount as "actualAmount", notes, created_at as "createdAt"
      FROM job_order_costs WHERE job_order_id = ${id}::uuid ORDER BY type DESC, cost_category_code ASC
    `)
    return NextResponse.json(result.rows, { status: 201 })
  } catch (error) {
    console.error("Error saving job order costs:", error)
    return NextResponse.json({ error: "Failed to save costs", details: String(error) }, { status: 500 })
  }
}

// PUT untuk update actualAmount (sinkron dari transaksi) - optional
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureTables()
    const { id } = await params
    const body = await request.json()
    const { costCategoryCode, actualAmount } = body
    if (!costCategoryCode) return NextResponse.json({ error: "costCategoryCode wajib" }, { status: 400 })
    await db.execute(sql`
      UPDATE job_order_costs SET actual_amount = ${Math.floor(Number(actualAmount)||0)}, updated_at = NOW()
      WHERE job_order_id = ${id}::uuid AND cost_category_code = ${costCategoryCode}
    `)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating actual:", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
