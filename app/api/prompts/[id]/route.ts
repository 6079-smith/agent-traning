import { NextRequest, NextResponse } from 'next/server'
import { queryOne, execute } from '@/lib/db'
import type { PromptVersion } from '@/types/database'
import type { ApiResponse } from '@/types/api'

export const dynamic = 'force-dynamic'

/**
 * GET /api/prompts/[id]
 * Get a single prompt version by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const prompt = await queryOne<PromptVersion>(
      'SELECT * FROM prompt_versions WHERE id = $1',
      [id]
    )

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt version not found' } as ApiResponse,
        { status: 404 }
      )
    }

    return NextResponse.json({ data: prompt } as ApiResponse<PromptVersion>)
  } catch (error) {
    console.error('Error fetching prompt:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prompt version' } as ApiResponse,
      { status: 500 }
    )
  }
}

/**
 * PUT /api/prompts/[id]
 * Update a prompt version
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Check if prompt exists
    const existing = await queryOne<PromptVersion>(
      'SELECT * FROM prompt_versions WHERE id = $1',
      [id]
    )

    if (!existing) {
      return NextResponse.json(
        { error: 'Prompt version not found' } as ApiResponse,
        { status: 404 }
      )
    }

    // If setting as active, deactivate all others first
    if (body.is_active && !existing.is_active) {
      await execute(
        'UPDATE prompt_versions SET is_active = false WHERE is_active = true'
      )
    }

    // Update prompt version
    const prompt = await queryOne<PromptVersion>(
      `UPDATE prompt_versions 
       SET name = COALESCE($1, name),
           system_prompt = COALESCE($2, system_prompt),
           user_prompt = COALESCE($3, user_prompt),
           is_active = COALESCE($4, is_active),
           notes = COALESCE($5, notes)
       WHERE id = $6
       RETURNING *`,
      [
        body.name,
        body.system_prompt,
        body.user_prompt,
        body.is_active,
        body.notes,
        id,
      ]
    )

    return NextResponse.json(
      { data: prompt, message: 'Prompt version updated successfully' } as ApiResponse<PromptVersion>
    )
  } catch (error) {
    console.error('Error updating prompt:', error)
    return NextResponse.json(
      { error: 'Failed to update prompt version' } as ApiResponse,
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/prompts/[id]
 * Delete a prompt version
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const rowsAffected = await execute(
      'DELETE FROM prompt_versions WHERE id = $1',
      [id]
    )

    if (rowsAffected === 0) {
      return NextResponse.json(
        { error: 'Prompt version not found' } as ApiResponse,
        { status: 404 }
      )
    }

    return NextResponse.json(
      { message: 'Prompt version deleted successfully' } as ApiResponse
    )
  } catch (error) {
    console.error('Error deleting prompt:', error)
    return NextResponse.json(
      { error: 'Failed to delete prompt version' } as ApiResponse,
      { status: 500 }
    )
  }
}
