import { NextRequest, NextResponse } from 'next/server'
import { queryOne, execute } from '@/lib/db'
import type { KnowledgeBase } from '@/types/database'
import type { ApiResponse } from '@/types/api'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/knowledge/[id]
 * Update a knowledge base entry
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Check if entry exists
    const existing = await queryOne<KnowledgeBase>(
      'SELECT * FROM knowledge_base WHERE id = $1',
      [id]
    )

    if (!existing) {
      return NextResponse.json(
        { error: 'Knowledge entry not found' } as ApiResponse,
        { status: 404 }
      )
    }

    // Update knowledge entry
    const knowledge = await queryOne<KnowledgeBase>(
      `UPDATE knowledge_base 
       SET category = COALESCE($1, category),
           key = COALESCE($2, key),
           value = COALESCE($3, value),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [body.category, body.key, body.value, id]
    )

    return NextResponse.json(
      { data: knowledge, message: 'Knowledge entry updated successfully' } as ApiResponse<KnowledgeBase>
    )
  } catch (error: any) {
    console.error('Error updating knowledge entry:', error)

    // Check for unique constraint violation
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Knowledge entry with this category and key already exists' } as ApiResponse,
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update knowledge entry' } as ApiResponse,
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/knowledge/[id]
 * Delete a knowledge base entry
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const rowsAffected = await execute(
      'DELETE FROM knowledge_base WHERE id = $1',
      [id]
    )

    if (rowsAffected === 0) {
      return NextResponse.json(
        { error: 'Knowledge entry not found' } as ApiResponse,
        { status: 404 }
      )
    }

    return NextResponse.json(
      { message: 'Knowledge entry deleted successfully' } as ApiResponse
    )
  } catch (error) {
    console.error('Error deleting knowledge entry:', error)
    return NextResponse.json(
      { error: 'Failed to delete knowledge entry' } as ApiResponse,
      { status: 500 }
    )
  }
}
