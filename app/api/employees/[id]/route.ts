import { NextRequest, NextResponse } from "next/server"
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await pool.query(
      'SELECT * FROM employees WHERE id = $1',
      [id]
    )
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }
    
    return NextResponse.json(result.rows[0])
  } catch (error: unknown) {
    const err = error as Error
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, email, phone, role, pin, employmentType, baseSalary, isActive, teamId } = body

    const result = await pool.query(
      `UPDATE employees SET 
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        phone = COALESCE($3, phone),
        role = COALESCE($4, role),
        pin = COALESCE($5, pin),
        employment_type = COALESCE($6, employment_type),
        base_salary = COALESCE($7, base_salary),
        is_active = COALESCE($8, is_active),
        team_id = $9,
        updated_at = NOW()
      WHERE id = $10 RETURNING *`,
      [name, email, phone, role, pin, employmentType, baseSalary, isActive, teamId || null, id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const updatedEmployee = result.rows[0]

    if (updatedEmployee.user_id) {
      const updateFields: string[] = []
      const updateValues: (string | null)[] = []
      let paramIndex = 1

      if (name) {
        updateFields.push(`name = $${paramIndex}`)
        updateValues.push(name)
        paramIndex++
      }

      if (email) {
        updateFields.push(`email = $${paramIndex}`)
        updateValues.push(email.toLowerCase())
        paramIndex++
      }

      if (updateFields.length > 0) {
        updateFields.push(`updated_at = NOW()`)
        updateValues.push(updatedEmployee.user_id)
        
        await pool.query(
          `UPDATE "user" SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
          updateValues
        )
      }
    }

    return NextResponse.json(updatedEmployee)
  } catch (error: unknown) {
    const err = error as Error
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const employee = await pool.query('SELECT * FROM employees WHERE id = $1', [id])
    
    if (employee.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }
    
    const employeeData = employee.rows[0]
    
    if (employeeData.email === 'adsteknologi@gmail.com') {
      return NextResponse.json({ error: 'Admin Sistem tidak dapat dihapus!' }, { status: 403 })
    }
    
    const userId = employeeData.user_id
    
    await pool.query('DELETE FROM employees WHERE id = $1', [id])
    
    if (userId) {
      await pool.query('DELETE FROM account WHERE user_id = $1', [userId])
      await pool.query('DELETE FROM "user" WHERE id = $1', [userId])
    }
    
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const err = error as Error
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
