import { NextRequest, NextResponse } from 'next/server'
import { queryMany, queryOne, execute } from '@/lib/db'
import type { EvaluatorRule } from '@/types/database'
import type { ApiResponse } from '@/types/api'

export const dynamic = 'force-dynamic'

// Extended type for rules with knowledge base info
interface EvaluatorRuleWithSource extends EvaluatorRule {
  kb_category?: string
  kb_key?: string
  kb_display_title?: string
  step_title?: string
}

/**
 * GET /api/evaluator/rules
 * Get evaluation rules (all or just active) with optional knowledge base source info
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const all = searchParams.get('all') === 'true'
    
    // Join with knowledge_base and wizard_steps to get source info
    const query = all 
      ? `SELECT er.*, 
                kb.category as kb_category, 
                kb.key as kb_key, 
                kb.display_title as kb_display_title, 
                COALESCE(ws.title, ws2.title) as step_title
         FROM evaluator_rules er
         LEFT JOIN knowledge_base kb ON er.knowledge_base_id = kb.id
         LEFT JOIN wizard_steps ws ON kb.category = ws.category
         LEFT JOIN wizard_steps ws2 ON er.category = ws2.category
         ORDER BY er.priority DESC, er.name`
      : `SELECT er.*, 
                kb.category as kb_category, 
                kb.key as kb_key, 
                kb.display_title as kb_display_title, 
                COALESCE(ws.title, ws2.title) as step_title
         FROM evaluator_rules er
         LEFT JOIN knowledge_base kb ON er.knowledge_base_id = kb.id
         LEFT JOIN wizard_steps ws ON kb.category = ws.category
         LEFT JOIN wizard_steps ws2 ON er.category = ws2.category
         WHERE er.is_active = true
         ORDER BY er.priority DESC, er.name`
    
    const rules = await queryMany<EvaluatorRuleWithSource>(query)

    return NextResponse.json({ data: rules } as ApiResponse<EvaluatorRuleWithSource[]>)
  } catch (error) {
    console.error('Error fetching evaluation rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch evaluation rules' } as ApiResponse,
      { status: 500 }
    )
  }
}

/**
 * POST /api/evaluator/rules
 * Create a new evaluation rule
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.name || !body.check_prompt) {
      return NextResponse.json(
        { error: 'Name and check_prompt are required' } as ApiResponse,
        { status: 400 }
      )
    }
    
    const rule = await queryOne<EvaluatorRule>(
      `INSERT INTO evaluator_rules (name, description, check_prompt, priority, is_active, category)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [body.name, body.description || null, body.check_prompt, body.priority || 5, body.is_active ?? true, body.category || null]
    )
    
    return NextResponse.json({ data: rule } as ApiResponse<EvaluatorRule>)
  } catch (error) {
    console.error('Error creating evaluation rule:', error)
    return NextResponse.json(
      { error: 'Failed to create evaluation rule' } as ApiResponse,
      { status: 500 }
    )
  }
}

/**
 * PUT /api/evaluator/rules
 * Update an evaluation rule
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.id) {
      return NextResponse.json(
        { error: 'Rule ID is required' } as ApiResponse,
        { status: 400 }
      )
    }
    
    const updates: string[] = []
    const params: any[] = []
    let paramIndex = 1
    
    if (body.name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      params.push(body.name)
    }
    if (body.description !== undefined) {
      updates.push(`description = $${paramIndex++}`)
      params.push(body.description)
    }
    if (body.check_prompt !== undefined) {
      updates.push(`check_prompt = $${paramIndex++}`)
      params.push(body.check_prompt)
    }
    if (body.priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`)
      params.push(body.priority)
    }
    if (body.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`)
      params.push(body.is_active)
    }
    
    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' } as ApiResponse,
        { status: 400 }
      )
    }
    
    params.push(body.id)
    
    const rule = await queryOne<EvaluatorRule>(
      `UPDATE evaluator_rules SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    )
    
    return NextResponse.json({ data: rule } as ApiResponse<EvaluatorRule>)
  } catch (error) {
    console.error('Error updating evaluation rule:', error)
    return NextResponse.json(
      { error: 'Failed to update evaluation rule' } as ApiResponse,
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/evaluator/rules
 * Delete an evaluation rule
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Rule ID is required' } as ApiResponse,
        { status: 400 }
      )
    }
    
    await execute('DELETE FROM evaluator_rules WHERE id = $1', [id])
    
    return NextResponse.json({ message: 'Rule deleted successfully' } as ApiResponse)
  } catch (error) {
    console.error('Error deleting evaluation rule:', error)
    return NextResponse.json(
      { error: 'Failed to delete evaluation rule' } as ApiResponse,
      { status: 500 }
    )
  }
}
