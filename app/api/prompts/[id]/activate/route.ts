import { NextRequest, NextResponse } from 'next/server'
import { queryOne, execute } from '@/lib/db'
import type { PromptVersion } from '@/types/database'
import type { ApiResponse } from '@/types/api'

export const dynamic = 'force-dynamic'

/**
 * POST /api/prompts/[id]/activate
 * Set a prompt version as active (deactivates all others)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
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

    // Deactivate all prompts
    await execute('UPDATE prompt_versions SET is_active = false WHERE is_active = true')

    // Activate this prompt
    const prompt = await queryOne<PromptVersion>(
      'UPDATE prompt_versions SET is_active = true WHERE id = $1 RETURNING *',
      [id]
    )

    return NextResponse.json(
      { data: prompt, message: 'Prompt version activated successfully' } as ApiResponse<PromptVersion>
    )
  } catch (error) {
    console.error('Error activating prompt:', error)
    return NextResponse.json(
      { error: 'Failed to activate prompt version' } as ApiResponse,
      { status: 500 }
    )
  }
}
