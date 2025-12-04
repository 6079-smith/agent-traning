import { NextRequest, NextResponse } from 'next/server'
import { generateResponse } from '@/lib/services/anthropic'
import { queryMany } from '@/lib/db'
import type { ApiResponse } from '@/types/api'
import type { KnowledgeBase } from '@/types/database'

export const dynamic = 'force-dynamic'

export interface Suggestion {
  id: string
  type: 'add_to_existing' | 'new_step'
  stepTitle: string
  stepCategory?: string
  questionTitle: string
  questionValue: string
  reasoning: string
  priority: 'high' | 'medium' | 'low'
  ruleViolated?: string
}

export interface SuggestionsResponse {
  suggestions: Suggestion[]
  summary: string
}

/**
 * POST /api/suggestions
 * Generate improvement suggestions based on evaluation results
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { emailThread, agentResponse, evaluation } = body

    if (!emailThread || !agentResponse || !evaluation) {
      return NextResponse.json(
        { error: 'Missing required fields: emailThread, agentResponse, evaluation' } as ApiResponse,
        { status: 400 }
      )
    }

    // Fetch current knowledge base to understand existing structure
    const knowledgeBase = await queryMany<KnowledgeBase>(
      'SELECT * FROM knowledge_base ORDER BY category, key'
    )

    // Get unique categories (steps) from knowledge base
    const existingCategories = Array.from(new Set(knowledgeBase.map(kb => kb.category)))

    // Build the prompt for generating suggestions
    const systemPrompt = `You are an AI assistant that helps improve customer service agent training data. 
Your job is to analyze evaluation results and suggest specific improvements to the training knowledge base.

## Current Training Structure

The training wizard has these existing steps/categories:
${existingCategories.map(cat => `- ${cat}`).join('\n')}

Each step contains questions with key-value pairs that train the AI agent.

## Current Knowledge Base Entries

${existingCategories.map(cat => {
  const entries = knowledgeBase.filter(kb => kb.category === cat)
  return `### ${cat}
${entries.map(e => `- **${e.key}**: ${e.value}`).join('\n')}`
}).join('\n\n')}

## Your Task

Based on the evaluation results, suggest specific improvements to add to the training wizard.
For each failed rule or issue identified, suggest:

1. **Add to existing step**: If the improvement fits an existing category
2. **Create new step**: If the improvement needs a new category that doesn't exist

## Output Format

Respond with a JSON object:
\`\`\`json
{
  "suggestions": [
    {
      "id": "unique_id",
      "type": "add_to_existing",
      "stepTitle": "Existing Step Name",
      "stepCategory": "existing_category_slug",
      "questionTitle": "Short title for the new entry",
      "questionValue": "The actual content/value to add",
      "reasoning": "Why this improvement is needed",
      "priority": "high|medium|low",
      "ruleViolated": "Name of the rule that was violated (if applicable)"
    },
    {
      "id": "unique_id_2",
      "type": "new_step",
      "stepTitle": "New Step Name",
      "stepCategory": "new_category_slug",
      "questionTitle": "First entry for this new step",
      "questionValue": "The content for this entry",
      "reasoning": "Why a new step is needed",
      "priority": "high|medium|low",
      "ruleViolated": "Name of the rule that was violated (if applicable)"
    }
  ],
  "summary": "Brief summary of all suggested improvements"
}
\`\`\`

Guidelines:
- **MAXIMUM 3 SUGGESTIONS** - Focus on the most impactful improvements only
- **NO REPETITION** - If multiple issues stem from the same root cause, consolidate into ONE comprehensive suggestion
- **ONE suggestion per rule violation** - Don't create separate suggestions for examples, rules, and guidelines about the same issue
- Only suggest improvements that would prevent the identified issues
- Be specific and actionable
- Use existing categories when possible
- Only suggest new steps when truly necessary
- Priority should be "high" for rule violations, "medium" for quality issues, "low" for minor improvements
- Generate unique IDs using format "sug_" + random string
- If the score is 80+, suggest at most 1 improvement or none at all`

    const userPrompt = `## Evaluation Results

**Score**: ${evaluation.score}/100

**Overall Assessment**:
${evaluation.reasoning}

**Rule Checks**:
${Object.entries(evaluation.ruleChecks || {}).map(([rule, check]: [string, any]) => 
  `- **${rule}**: ${check.passed ? '✅ PASSED' : '❌ FAILED'} - ${check.reasoning}`
).join('\n')}

## Original Email Thread
${emailThread}

## Agent Response That Was Evaluated
${agentResponse}

---

Please analyze these results and suggest specific improvements to add to the training wizard.
Focus especially on any failed rule checks - what knowledge could be added to prevent these failures?
If the score is already high (80+), you may suggest fewer or no improvements.`

    // Call Claude to generate suggestions
    const result = await generateResponse(systemPrompt, [
      { role: 'user', content: userPrompt }
    ])

    // Parse the JSON response
    let suggestions: SuggestionsResponse
    try {
      const jsonMatch = result.content.match(/```json\s*([\s\S]*?)\s*```/)
      const jsonStr = jsonMatch ? jsonMatch[1] : result.content
      suggestions = JSON.parse(jsonStr)
    } catch (parseError) {
      console.error('Failed to parse suggestions response:', result.content)
      // Return empty suggestions if parsing fails
      suggestions = {
        suggestions: [],
        summary: 'Unable to generate suggestions at this time.'
      }
    }

    return NextResponse.json({ data: suggestions } as ApiResponse<SuggestionsResponse>)
  } catch (error) {
    console.error('Error generating suggestions:', error)
    return NextResponse.json(
      { error: `Failed to generate suggestions: ${error instanceof Error ? error.message : 'Unknown error'}` } as ApiResponse,
      { status: 500 }
    )
  }
}
