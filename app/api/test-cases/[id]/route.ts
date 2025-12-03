import { NextRequest, NextResponse } from 'next/server'
import { queryOne, execute } from '@/lib/db'
import type { TestCase } from '@/types/database'
import type { ApiResponse } from '@/types/api'

export const dynamic = 'force-dynamic'

/**
 * GET /api/test-cases/[id]
 * Get a single test case by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const testCase = await queryOne<TestCase>(
      'SELECT * FROM test_cases WHERE id = $1',
      [id]
    )

    if (!testCase) {
      return NextResponse.json(
        { error: 'Test case not found' } as ApiResponse,
        { status: 404 }
      )
    }

    return NextResponse.json({ data: testCase } as ApiResponse<TestCase>)
  } catch (error) {
    console.error('Error fetching test case:', error)
    return NextResponse.json(
      { error: 'Failed to fetch test case' } as ApiResponse,
      { status: 500 }
    )
  }
}

/**
 * PUT /api/test-cases/[id]
 * Update a test case
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Check if test case exists
    const existing = await queryOne<TestCase>(
      'SELECT * FROM test_cases WHERE id = $1',
      [id]
    )

    if (!existing) {
      return NextResponse.json(
        { error: 'Test case not found' } as ApiResponse,
        { status: 404 }
      )
    }

    // Update test case
    const testCase = await queryOne<TestCase>(
      `UPDATE test_cases 
       SET name = COALESCE($1, name),
           email_thread = COALESCE($2, email_thread),
           customer_email = COALESCE($3, customer_email),
           customer_name = COALESCE($4, customer_name),
           subject = COALESCE($5, subject),
           order_number = COALESCE($6, order_number),
           expected_behavior = COALESCE($7, expected_behavior),
           tags = COALESCE($8, tags)
       WHERE id = $9
       RETURNING *`,
      [
        body.name,
        body.email_thread,
        body.customer_email,
        body.customer_name,
        body.subject,
        body.order_number,
        body.expected_behavior,
        body.tags,
        id,
      ]
    )

    return NextResponse.json(
      { data: testCase, message: 'Test case updated successfully' } as ApiResponse<TestCase>
    )
  } catch (error) {
    console.error('Error updating test case:', error)
    return NextResponse.json(
      { error: 'Failed to update test case' } as ApiResponse,
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/test-cases/[id]
 * Delete a test case
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const rowsAffected = await execute(
      'DELETE FROM test_cases WHERE id = $1',
      [id]
    )

    if (rowsAffected === 0) {
      return NextResponse.json(
        { error: 'Test case not found' } as ApiResponse,
        { status: 404 }
      )
    }

    return NextResponse.json(
      { message: 'Test case deleted successfully' } as ApiResponse
    )
  } catch (error) {
    console.error('Error deleting test case:', error)
    return NextResponse.json(
      { error: 'Failed to delete test case' } as ApiResponse,
      { status: 500 }
    )
  }
}
