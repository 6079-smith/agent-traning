import { NextRequest, NextResponse } from 'next/server'
import { queryOne, queryMany } from '@/lib/db'
import type { ApiResponse } from '@/types/api'

export const dynamic = 'force-dynamic'

interface ApplySuggestionRequest {
  type: 'add_to_existing' | 'new_step'
  stepTitle: string
  stepCategory: string
  questionTitle: string
  questionValue: string
  promptVersionId?: number // Optional: also update this prompt
}

/**
 * POST /api/suggestions/apply
 * Apply a suggestion to the knowledge base
 */
export async function POST(request: NextRequest) {
  try {
    const body: ApplySuggestionRequest = await request.json()
    const { type, stepTitle, stepCategory, questionTitle, questionValue, promptVersionId } = body

    if (!stepCategory || !questionTitle || !questionValue) {
      return NextResponse.json(
        { error: 'Missing required fields' } as ApiResponse,
        { status: 400 }
      )
    }

    // If it's a new step, we need to create the step first
    if (type === 'new_step') {
      // Check if step already exists
      const existingStep = await queryOne(
        'SELECT DISTINCT category FROM knowledge_base WHERE category = $1',
        [stepCategory]
      )

      if (!existingStep) {
        // Get max sort order for steps
        const maxOrder = await queryOne<{ max: number }>(
          `SELECT COALESCE(MAX(sort_order), 0) as max FROM (
            SELECT DISTINCT ON (category) category, sort_order 
            FROM knowledge_base 
            ORDER BY category, sort_order
          ) sub`
        )
        
        // We'll create the step implicitly by adding the first knowledge entry
        // The wizard will pick it up from the unique categories
      }
    }

    // Get max sort order for this category
    const maxOrderResult = await queryOne<{ max: number }>(
      'SELECT COALESCE(MAX(sort_order), 0) as max FROM knowledge_base WHERE category = $1',
      [stepCategory]
    )
    const newSortOrder = (maxOrderResult?.max || 0) + 1

    // Insert the new knowledge base entry
    const result = await queryOne(
      `INSERT INTO knowledge_base (category, key, value, display_title, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (category, key) DO UPDATE SET value = $3, display_title = $4
       RETURNING *`,
      [stepCategory, questionTitle, questionValue, questionTitle, newSortOrder]
    )

    // If it's a new step, also insert into wizard_steps if that table exists
    if (type === 'new_step') {
      try {
        // Check if wizard_steps table exists and insert
        await queryOne(
          `INSERT INTO wizard_steps (title, category, sort_order)
           VALUES ($1, $2, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM wizard_steps))
           ON CONFLICT (category) DO NOTHING`,
          [stepTitle, stepCategory]
        )
      } catch (e) {
        // wizard_steps table might not exist, that's okay
        console.log('wizard_steps table not found, skipping step creation')
      }
    }

    // If a prompt version ID was provided, also append to that prompt's system_prompt
    let promptUpdated = false
    console.log('promptVersionId received:', promptVersionId)
    if (promptVersionId) {
      try {
        // Get the current prompt
        const prompt = await queryOne<{ system_prompt: string }>(
          'SELECT system_prompt FROM prompt_versions WHERE id = $1',
          [promptVersionId]
        )
        console.log('Found prompt:', prompt ? 'yes' : 'no')

        if (prompt) {
          // Build the improvement text to append
          const improvementText = `\n\n## Improvement: ${questionTitle}\n${questionValue}`
          
          // Append to system prompt
          const updatedPrompt = prompt.system_prompt + improvementText
          
          await queryOne(
            'UPDATE prompt_versions SET system_prompt = $1 WHERE id = $2',
            [updatedPrompt, promptVersionId]
          )
          promptUpdated = true
        }
      } catch (e) {
        console.error('Failed to update prompt:', e)
        // Continue anyway - knowledge base was updated
      }
    }

    const baseMessage = type === 'new_step' 
      ? `Created new step "${stepTitle}" with entry "${questionTitle}"`
      : `Added "${questionTitle}" to "${stepTitle}"`
    
    const message = promptUpdated 
      ? `${baseMessage} and updated current prompt`
      : baseMessage

    return NextResponse.json({
      data: result,
      message,
      promptUpdated
    } as ApiResponse)
  } catch (error) {
    console.error('Error applying suggestion:', error)
    return NextResponse.json(
      { error: `Failed to apply suggestion: ${error instanceof Error ? error.message : 'Unknown error'}` } as ApiResponse,
      { status: 500 }
    )
  }
}
