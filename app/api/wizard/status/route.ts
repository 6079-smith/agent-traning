import { NextResponse } from 'next/server'
import { queryMany } from '@/lib/db'
import type { ApiResponse } from '@/types/api'

export const dynamic = 'force-dynamic'

interface WizardStatus {
  isComplete: boolean
  totalSteps: number
  completedSteps: number
  totalQuestions: number
  answeredQuestions: number
  percentComplete: number
}

/**
 * GET /api/wizard/status
 * Get the completion status of the Training Wizard
 */
export async function GET() {
  try {
    // Fetch all knowledge base entries (questions)
    const entries = await queryMany<{ category: string; key: string; value: string }>(
      'SELECT category, key, value FROM knowledge_base ORDER BY category'
    )

    if (entries.length === 0) {
      return NextResponse.json({
        data: {
          isComplete: false,
          totalSteps: 0,
          completedSteps: 0,
          totalQuestions: 0,
          answeredQuestions: 0,
          percentComplete: 0,
        }
      } as ApiResponse<WizardStatus>)
    }

    // Get unique categories (steps)
    const categories = Array.from(new Set(entries.map(e => e.category)))
    const totalSteps = categories.length

    // Count questions and answered questions per step
    let totalQuestions = 0
    let answeredQuestions = 0
    let completedSteps = 0

    for (const category of categories) {
      const categoryEntries = entries.filter(e => e.category === category)
      const categoryTotal = categoryEntries.length
      const categoryAnswered = categoryEntries.filter(e => e.value && e.value.trim() !== '').length
      
      totalQuestions += categoryTotal
      answeredQuestions += categoryAnswered
      
      // A step is complete if all its questions are answered
      if (categoryAnswered === categoryTotal && categoryTotal > 0) {
        completedSteps++
      }
    }

    // Wizard is complete if all steps are complete
    const isComplete = completedSteps === totalSteps && totalSteps > 0
    const percentComplete = totalQuestions > 0 
      ? Math.round((answeredQuestions / totalQuestions) * 100) 
      : 0

    return NextResponse.json({
      data: {
        isComplete,
        totalSteps,
        completedSteps,
        totalQuestions,
        answeredQuestions,
        percentComplete,
      }
    } as ApiResponse<WizardStatus>)
  } catch (error) {
    console.error('Error fetching wizard status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wizard status' } as ApiResponse,
      { status: 500 }
    )
  }
}
