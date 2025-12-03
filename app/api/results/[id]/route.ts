import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import type { TestResult } from '@/types/database'
import type { ApiResponse } from '@/types/api'

export const dynamic = 'force-dynamic'

/**
 * GET /api/results/[id]
 * Get a single test result by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await queryOne<TestResult>(
      `SELECT r.*, 
              tc.name as test_case_name,
              pv.name as prompt_version_name
       FROM test_results r
       LEFT JOIN test_cases tc ON r.test_case_id = tc.id
       LEFT JOIN prompt_versions pv ON r.prompt_version_id = pv.id
       WHERE r.id = $1`,
      [id]
    )

    if (!result) {
      return NextResponse.json(
        { error: 'Test result not found' } as ApiResponse,
        { status: 404 }
      )
    }

    return NextResponse.json({ data: result } as ApiResponse<TestResult>)
  } catch (error) {
    console.error('Error fetching test result:', error)
    return NextResponse.json(
      { error: 'Failed to fetch test result' } as ApiResponse,
      { status: 500 }
    )
  }
}
