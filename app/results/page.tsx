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

      {/* Compact Stats & Filters Row */}
      <div className={styles.resultsControlsCard}>
        <div className={styles.resultsStatsRow}>
          <div className={styles.resultsStat}>
            <span className={styles.resultsStatLabel}>Total</span>
            <span className={styles.resultsStatValue}>{totalResults}</span>
          </div>
          <div className={styles.resultsStatDivider} />
          <div className={styles.resultsStat}>
            <span className={styles.resultsStatLabel}>Avg Score</span>
            <span 
              className={styles.resultsStatValue}
              style={{ color: avgScore && avgScore >= 70 ? '#22c55e' : avgScore && avgScore >= 50 ? '#eab308' : '#ef4444' }}
            >
              {avgScore !== null ? `${avgScore}%` : '—'}
            </span>
          </div>
          <div className={styles.resultsStatDivider} />
          <div className={styles.resultsStat}>
            <span className={styles.resultsStatLabel}>Pass Rate</span>
            <span 
              className={styles.resultsStatValue}
              style={{ color: passRate >= 70 ? '#22c55e' : passRate >= 50 ? '#eab308' : '#ef4444' }}
            >
              {totalResults > 0 ? `${passRate}%` : '—'}
            </span>
          </div>
          <div className={styles.resultsFilters}>
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
      {filteredResults.length === 0 ? (
        <div className={styles.emptyState}>
          <Icons.BarChart3 size={48} />
          <h3>No results yet</h3>
          <p>Run some tests in the Playground to see results here</p>
        </div>
      ) : (
        <div className={styles.resultsList}>
          {filteredResults.map((result) => (
            <div key={result.id} className={styles.resultCard}>
              <div 
                className={styles.resultCardHeader}
                onClick={() => setExpandedResult(expandedResult === result.id ? null : result.id)}
              >
                <div className={styles.resultCardScore}>
                  <span 
                    className={styles.scoreValue}
                    style={{
                      color: result.evaluator_score && result.evaluator_score >= 70 
                        ? '#22c55e' 
                        : result.evaluator_score && result.evaluator_score >= 40 
                        ? '#eab308' 
                        : '#ef4444'
                    }}
                  >
                    {result.evaluator_score !== null ? result.evaluator_score : '—'}
                  </span>
                  <span className={styles.scoreLabel}>/ 100</span>
                </div>
                <div className={styles.resultCardInfo}>
                  <h3 className={formStyles.sectionLabel}>
                    {result.test_case_name || `Test Case #${result.test_case_id}`}
                  </h3>
                  <div className={styles.resultCardMeta}>
                    <span>
                      <Icons.FileText size={14} />
                      {result.prompt_version_name || `Prompt #${result.prompt_version_id}`}
                    </span>
                    <span>
                      <Icons.Calendar size={14} />
                      {new Date(result.created_at).toLocaleDateString()}
                    </span>
                    <span>
                      <Icons.Clock size={14} />
                      {new Date(result.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <Icons.ChevronDown 
                  size={20} 
                  className={`${formStyles.sectionToggle} ${expandedResult !== result.id ? formStyles.collapsed : ''}`}
                />
              </div>

              {expandedResult === result.id && (
                <div className={styles.resultCardExpanded}>
                  <div className={styles.resultCardGrid}>
                    <div className={styles.resultCardSection}>
                      <h4>Agent Response</h4>
                      <div className={styles.resultCardContent}>
                        {result.agent_response}
                      </div>
                    </div>
                  </div>

                  {result.evaluator_reasoning && (
                    <div className={styles.resultCardSection}>
                      <h4>Evaluation</h4>
                      <div className={styles.resultCardContent}>
                        {result.evaluator_reasoning}
                      </div>
                    </div>
                  )}

                  {result.rule_checks && typeof result.rule_checks === 'object' && (
                    <div className={styles.resultCardSection}>
                      <h4>Rule Checks</h4>
                      <div className={styles.ruleChecksList}>
                        {Object.entries(result.rule_checks).map(([rule, check]: [string, any]) => (
                          <div key={rule} className={styles.ruleCheckItem}>
                            {check.passed ? (
                              <Icons.CheckCircle size={16} className={styles.iconSuccess} />
                            ) : (
                              <Icons.XCircle size={16} className={styles.iconDanger} />
                            )}
                            <span>{rule}</span>
                          </div>
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
  )
}
