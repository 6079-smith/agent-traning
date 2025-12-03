'use client'

import { useEffect, useState } from 'react'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorAlert from '@/components/ErrorAlert'
import styles from '@/styles/components.module.css'
import layoutStyles from '@/styles/layout.module.css'
import formStyles from '@/styles/forms.module.css'
import btnStyles from '@/styles/buttons.module.css'
import * as Icons from 'lucide-react'
import type { TestResult, PromptVersion, TestCase } from '@/types/database'

interface ResultWithNames extends TestResult {
  test_case_name?: string
  prompt_version_name?: string
  email_thread?: string
}

export default function ResultsPage() {
  const [results, setResults] = useState<ResultWithNames[]>([])
  const [prompts, setPrompts] = useState<PromptVersion[]>([])
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPromptId, setSelectedPromptId] = useState<string>('')
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string>('')
  const [expandedResult, setExpandedResult] = useState<number | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    fetchResults()
  }, [selectedPromptId, selectedTestCaseId])

  async function fetchData() {
    try {
      setLoading(true)
      const [promptsRes, testCasesRes] = await Promise.all([
        fetch('/api/prompts'),
        fetch('/api/test-cases'),
      ])
      const promptsData = await promptsRes.json()
      const testCasesData = await testCasesRes.json()
      
      setPrompts(promptsData.data || [])
      setTestCases(testCasesData.data || [])
    } catch (err) {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function fetchResults() {
    try {
      setError(null)
      const params = new URLSearchParams()
      if (selectedPromptId) params.append('prompt_version_id', selectedPromptId)
      if (selectedTestCaseId) params.append('test_case_id', selectedTestCaseId)
      
      const url = `/api/results${params.toString() ? `?${params.toString()}` : ''}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResults(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load results')
    }
  }

  function getScoreColor(score: number | null) {
    if (score === null) return 'var(--text-muted)'
    if (score >= 80) return 'var(--success-color)'
    if (score >= 60) return 'var(--warning-color)'
    return 'var(--danger-color)'
  }

  function getScoreBadgeClass(score: number | null) {
    if (score === null) return styles.badgeMuted
    if (score >= 80) return styles.badgeSuccess
    if (score >= 60) return styles.badgeWarning
    return styles.badgeDanger
  }

  // Calculate stats
  const totalResults = results.length
  const avgScore = results.length > 0
    ? Math.round(
        results
          .filter((r) => r.evaluator_score !== null)
          .reduce((sum, r) => sum + (r.evaluator_score || 0), 0) /
          results.filter((r) => r.evaluator_score !== null).length
      )
    : null
  const passedResults = results.filter((r) => r.evaluator_score && r.evaluator_score >= 70).length

  if (loading) {
    return (
      <div className={layoutStyles.pageContainer}>
        <LoadingSpinner size="large" message="Loading results..." />
      </div>
    )
  }

  // Filter results
  const filteredResults = results.filter(r => {
    if (selectedPromptId && r.prompt_version_id !== Number(selectedPromptId)) return false
    if (selectedTestCaseId && r.test_case_id !== Number(selectedTestCaseId)) return false
    return true
  })

  // Calculate pass rate
  const passRate = totalResults > 0 ? Math.round((passedResults / totalResults) * 100) : 0

  return (
    <div className={layoutStyles.pageContainer}>
      <div className={layoutStyles.pageHeader}>
        <h1>Test Results</h1>
        <p className={styles.subtitle}>View and analyze evaluation results</p>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      {/* Summary Cards */}
      <div className={styles.statsPanel}>
        <div className={styles.statsCard}>
          <div className={styles.statsCardHeader}>
            <span className={styles.statsCardTitle}>Total Results</span>
          </div>
          <div className={styles.statsCardValue}>{totalResults}</div>
        </div>
        <div className={styles.statsCard}>
          <div className={styles.statsCardHeader}>
            <span className={styles.statsCardTitle}>Average Score</span>
          </div>
          <div className={styles.statsCardValue} style={{ color: avgScore && avgScore >= 70 ? 'var(--btn-success)' : avgScore && avgScore >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
            {avgScore !== null ? `${avgScore}%` : 'N/A'}
          </div>
        </div>
        <div className={styles.statsCard}>
          <div className={styles.statsCardHeader}>
            <span className={styles.statsCardTitle}>Pass Rate</span>
          </div>
          <div className={styles.statsCardValue} style={{ color: passRate >= 70 ? 'var(--btn-success)' : passRate >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
            {totalResults > 0 ? `${passRate}%` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.section}>
        <div className={formStyles.formRow}>
          <div className={formStyles.formGroup}>
            <label className={formStyles.label}>Filter by Prompt Version</label>
            <select
              className={formStyles.select}
              value={selectedPromptId}
              onChange={(e) => setSelectedPromptId(e.target.value)}
            >
              <option value="">All Prompts</option>
              {prompts.map((prompt) => (
                <option key={prompt.id} value={prompt.id}>
                  {prompt.name}
                </option>
              ))}
            </select>
          </div>

          <div className={formStyles.formGroup}>
            <label className={formStyles.label}>Filter by Test Case</label>
            <select
              className={formStyles.select}
              value={selectedTestCaseId}
              onChange={(e) => setSelectedTestCaseId(e.target.value)}
            >
              <option value="">All Test Cases</option>
              {testCases.map((tc) => (
                <option key={tc.id} value={tc.id}>
                  {tc.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results List */}
      <div className={styles.resultsCard}>
        <div className={styles.resultsCardHeader}>
          <h2>Test Results</h2>
        </div>

        {filteredResults.length === 0 ? (
          <div className={styles.emptyState}>
            <Icons.BarChart3 size={48} />
            <p>No results yet. Run some tests in the Playground!</p>
          </div>
        ) : (
          <div>
            {filteredResults.map((result) => (
              <div key={result.id} className={styles.resultItem}>
                <button
                  onClick={() => setExpandedResult(expandedResult === result.id ? null : result.id)}
                  className={styles.resultItemHeader}
                >
                  <div className={styles.resultItemHeaderLeft}>
                    <div 
                      className={styles.resultScore}
                      style={{
                        color: result.evaluator_score && result.evaluator_score >= 70 
                          ? 'var(--btn-success)' 
                          : result.evaluator_score && result.evaluator_score >= 40 
                          ? 'var(--warning)' 
                          : 'var(--danger)'
                      }}
                    >
                      {result.evaluator_score !== null ? `${result.evaluator_score}%` : 'N/A'}
                    </div>
                    <div>
                      <p className={styles.resultItemTitle}>
                        {result.test_case_name || `Test Case #${result.test_case_id}`}
                      </p>
                      <p className={styles.resultItemMeta}>
                        {result.prompt_version_name || `Prompt #${result.prompt_version_id}`} • {new Date(result.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {expandedResult === result.id ? (
                    <Icons.ChevronUp size={20} style={{ color: 'var(--text-muted)' }} />
                  ) : (
                    <Icons.ChevronDown size={20} style={{ color: 'var(--text-muted)' }} />
                  )}
                </button>

                {expandedResult === result.id && (
                  <div className={styles.resultItemExpanded}>
                    <div className={styles.resultItemGrid}>
                      <div>
                        <p className={styles.resultItemLabel}>Email Thread</p>
                        <pre className={styles.resultItemPre}>
                          {result.email_thread || 'N/A'}
                        </pre>
                      </div>
                      <div>
                        <p className={styles.resultItemLabel}>Agent Response</p>
                        <div className={styles.resultItemResponse}>
                          {result.agent_response}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: 'var(--space-3)' }}>
                      <p className={styles.resultItemLabel}>Evaluator Reasoning</p>
                      <p className={styles.resultItemReasoning}>
                        {result.evaluator_reasoning || 'No reasoning provided'}
                      </p>
                    </div>

                    {result.rule_checks && typeof result.rule_checks === 'object' && (
                      <div style={{ marginTop: 'var(--space-3)' }}>
                        <p className={styles.resultItemLabel}>Rule Checks</p>
                        <div className={styles.ruleChecksContainer}>
                          {Object.entries(result.rule_checks).map(([rule, check]: [string, any]) => (
                            <span
                              key={rule}
                              className={styles.ruleCheckBadge}
                              style={{
                                background: check.status === 'PASS' 
                                  ? 'rgba(70, 155, 59, 0.15)' 
                                  : 'rgba(239, 68, 68, 0.15)',
                                color: check.status === 'PASS' 
                                  ? 'var(--btn-success)' 
                                  : 'var(--danger)'
                              }}
                            >
                              {rule}: {check.status}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
