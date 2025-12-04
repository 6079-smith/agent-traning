import { NextRequest, NextResponse } from 'next/server'
import { generateResponse } from '@/lib/services/anthropic'
import { queryMany } from '@/lib/db'
import type { GenerateRequest, GenerateResponse, ApiResponse } from '@/types/api'
import type { KnowledgeBase } from '@/types/database'

export const dynamic = 'force-dynamic'

/**
 * POST /api/generator/run
 * Generate an agent response using Claude
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json()

    // Validation
    if (!body.systemPrompt || !body.userPrompt || !body.emailThread) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: systemPrompt, userPrompt, emailThread',
        } as ApiResponse,
        { status: 400 }
      )
    }

    // Fetch Knowledge Base rules to include in system prompt
    const knowledgeBase = await queryMany<KnowledgeBase>(
      'SELECT category, key, value FROM knowledge_base ORDER BY category, sort_order'
    )

    // Build knowledge base section
    let knowledgeSection = ''
    if (knowledgeBase.length > 0) {
      const categories = [...new Set(knowledgeBase.map(kb => kb.category))]
      knowledgeSection = '\n\n## CRITICAL TRAINING RULES (You MUST follow these)\n\n'
      
      for (const category of categories) {
        const entries = knowledgeBase.filter(kb => kb.category === category)
        const categoryTitle = category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        knowledgeSection += `### ${categoryTitle}\n`
        for (const entry of entries) {
          knowledgeSection += `- **${entry.key}**: ${entry.value}\n`
        }
        knowledgeSection += '\n'
      }
    }

    // Add output format instructions
    const outputInstructions = `\n\n## OUTPUT FORMAT REQUIREMENTS
- Output ONLY the email response body - no preamble, no thinking, no explanations
- Do NOT include any tool invocations, XML tags, or function calls in your output
- Do NOT include phrases like "I need to look up" or "Let me check" or any internal reasoning
- Start directly with the email greeting (e.g., "Dear [Name]," or "Hello,")
- End with the signature
- Your entire response should be ready to send to the customer as-is`

    // Append knowledge base and output instructions to system prompt
    const enhancedSystemPrompt = body.systemPrompt + knowledgeSection + outputInstructions

    // Construct the full user message
    const userMessage = `${body.userPrompt}\n\nEmail Thread:\n${body.emailThread}`

    // Generate response using Claude
    const result = await generateResponse(enhancedSystemPrompt, [
      {
        role: 'user',
        content: userMessage,
      },
    ])

    const response: GenerateResponse = {
      response: result.content,
      model: result.model,
      usage: result.usage,
    }

    return NextResponse.json({ data: response } as ApiResponse<GenerateResponse>)
  } catch (error) {
    console.error('Error generating response:', error)
    return NextResponse.json(
      {
        error: `Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      } as ApiResponse,
      { status: 500 }
    )
  }
}
