'use client'

import { useEffect, useState } from 'react'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorAlert from '@/components/ErrorAlert'
import styles from '@/styles/components.module.css'
import layoutStyles from '@/styles/layout.module.css'
import btnStyles from '@/styles/buttons.module.css'
import formStyles from '@/styles/forms.module.css'
import * as Icons from 'lucide-react'
import type { PromptVersion, TestCase } from '@/types/database'
import type { GenerateResponse, EvaluateResponse } from '@/types/api'

export default function PlaygroundPage() {
  const [prompts, setPrompts] = useState<PromptVersion[]>([])
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [selectedPromptId, setSelectedPromptId] = useState<number | null>(null)
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<number | null>(null)
  const [emailThread, setEmailThread] = useState('')
  const [generatedResponse, setGeneratedResponse] = useState('')
  const [evaluation, setEvaluation] = useState<EvaluateResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

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
      
      // Auto-select active prompt
      const activePrompt = (promptsData.data || []).find((p: PromptVersion) => p.is_active)
      if (activePrompt) {
        setSelectedPromptId(activePrompt.id)
      }
    } catch (err) {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  function loadTestCase(id: number) {
    const testCase = testCases.find((tc) => tc.id === id)
    if (testCase) {
      setEmailThread(testCase.email_thread)
      setSelectedTestCaseId(id)
      // Clear previous results
      setGeneratedResponse('')
      setEvaluation(null)
    }
  }

  async function handleGenerate() {
    if (!selectedPromptId || !emailThread) {
      setError('Please select a prompt and enter an email thread')
      return
    }

    const prompt = prompts.find((p) => p.id === selectedPromptId)
    if (!prompt) return

    try {
      setGenerating(true)
      setError(null)
      const res = await fetch('/api/generator/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: prompt.system_prompt,
          userPrompt: prompt.user_prompt,
          emailThread,
        }),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)
      
      setGeneratedResponse(data.data.response)
      setEvaluation(null) // Clear previous evaluation
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate response')
    } finally {
      setGenerating(false)
    }
  }

  async function handleEvaluate() {
    if (!generatedResponse || !emailThread) {
      setError('Please generate a response first')
      return
    }

    try {
      setEvaluating(true)
      setError(null)
      const res = await fetch('/api/evaluator/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailThread,
          agentResponse: generatedResponse,
        }),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)
      
      setEvaluation(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to evaluate response')
    } finally {
      setEvaluating(false)
    }
  }

  async function handleSaveResult() {
    if (!selectedTestCaseId || !generatedResponse) {
      setError('Please select a test case and generate a response')
      return
    }

    try {
      setError(null)
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_case_id: selectedTestCaseId,
          prompt_version_id: selectedPromptId,
          agent_response: generatedResponse,
          evaluator_score: evaluation?.score || null,
          evaluator_reasoning: evaluation?.reasoning || null,
          rule_checks: evaluation?.ruleChecks || null,
        }),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)
      
      alert('Result saved successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save result')
    }
  }

  if (loading) {
    return (
      <div className={layoutStyles.pageContainer}>
        <LoadingSpinner size="large" message="Loading playground..." />
      </div>
    )
  }

  return (
    <div className={layoutStyles.pageContainer}>
      <div className={layoutStyles.pageHeader}>
        <h1>Playground</h1>
        <p className={styles.subtitle}>Test prompts and evaluate responses in real-time</p>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      <div className={styles.section}>
        <div className={formStyles.formRow}>
          <div className={formStyles.formGroup}>
            <label className={formStyles.label}>Prompt Version</label>
            <select
              className={formStyles.select}
              value={selectedPromptId || ''}
              onChange={(e) => setSelectedPromptId(Number(e.target.value))}
            >
              <option value="">-- Select a prompt version --</option>
              {prompts.map((prompt) => (
                <option key={prompt.id} value={prompt.id}>
                  {prompt.name} {prompt.is_active ? '(Active)' : ''}
                </option>
              ))}
            </select>
            <div className={formStyles.helpText}>
              Choose which prompt version to use for generating responses
            </div>
          </div>

          <div className={formStyles.formGroup}>
            <label className={formStyles.label}>Test Case (Optional)</label>
            <select
              className={formStyles.select}
              value={selectedTestCaseId || ''}
              onChange={(e) => loadTestCase(Number(e.target.value))}
            >
              <option value="">-- Load a saved test case --</option>
              {testCases.map((tc) => (
                <option key={tc.id} value={tc.id}>
                  {tc.name}
                </option>
              ))}
            </select>
            <div className={formStyles.helpText}>
              Load a saved email thread or paste your own below
            </div>
          </div>
        </div>
      </div>

      <div className={styles.playgroundGrid}>
        {/* Left Panel: Email Thread Input */}
        <div className={styles.playgroundPanel}>
          <div className={styles.panelHeader}>
            <h3>Email Thread</h3>
          </div>
          <textarea
            className={styles.playgroundTextarea}
            value={emailThread}
            onChange={(e) => setEmailThread(e.target.value)}
            placeholder="Paste the customer email thread here..."
          />
          <div className={styles.panelFooter}>
            <button
              onClick={handleGenerate}
              className={btnStyles.primary}
              disabled={!selectedPromptId || !emailThread || generating}
              style={{ width: 'auto', minWidth: '180px', maxWidth: 'fit-content' }}
            >
              {generating ? (
                <>
                  <Icons.Loader2 size={18} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Icons.Sparkles size={18} />
                  Generate Response
                </>
              )}
            </button>
          </div>
        </div>

        {/* Middle Panel: Generated Response */}
        <div className={styles.playgroundPanel}>
          <div className={styles.panelHeader}>
            <h3>Generated Response</h3>
            {generatedResponse && (
              <button
                onClick={() => navigator.clipboard.writeText(generatedResponse)}
                className={btnStyles.iconButton}
                title="Copy to clipboard"
              >
                <Icons.Copy size={16} />
              </button>
            )}
          </div>
          <div className={styles.playgroundTextarea}>
            {generatedResponse ? (
              <div className={styles.formattedResponse}>
                {generatedResponse}
              </div>
            ) : (
              <div className={styles.emptyPanel}>
                <Icons.MessageSquare size={32} />
                <p>Generated response will appear here</p>
              </div>
            )}
          </div>
          <div className={styles.panelFooter}>
            <button
              onClick={handleEvaluate}
              className={btnStyles.secondary}
              disabled={!generatedResponse || evaluating}
              style={{ width: 'auto', minWidth: '140px', maxWidth: 'fit-content' }}
            >
              {evaluating ? (
                <>
                  <Icons.Loader2 size={18} className="animate-spin" />
                  Evaluating...
                </>
              ) : (
                <>
                  <Icons.CheckCircle size={18} />
                  Evaluate
                </>
              )}
            </button>
            {selectedTestCaseId && generatedResponse && (
              <button 
                onClick={handleSaveResult} 
                className={btnStyles.success}
                style={{ width: 'auto', minWidth: '140px', maxWidth: 'fit-content' }}
              >
                <Icons.Save size={18} />
                Save Result
              </button>
            )}
          </div>
        </div>

        {/* Right Panel: Evaluation Results */}
        <div className={styles.playgroundPanel}>
          <div className={styles.panelHeader}>
            <h3>Evaluation</h3>
          </div>
          <div className={styles.playgroundTextarea}>
            {evaluation ? (
              <div className={styles.evaluationResults}>
                <div className={styles.scoreDisplay}>
                  <div className={styles.scoreCircle}>
                    <span className={styles.scoreValue}>{evaluation.score}</span>
                    <span className={styles.scoreLabel}>/ 100</span>
                  </div>
                </div>

                <div className={styles.evaluationSection}>
                  <h4>Overall Assessment</h4>
                  <div className={styles.formattedResponse}>
                    {evaluation.reasoning}
                  </div>
                </div>

                <div className={styles.evaluationSection}>
                  <h4>Rule Checks</h4>
                  <div className={styles.ruleChecksList}>
                    {Object.entries(evaluation.ruleChecks).map(([ruleName, check]) => (
                      <div key={ruleName} className={styles.ruleCheck}>
                        <div className={styles.ruleCheckHeader}>
                          {check.passed ? (
                            <Icons.CheckCircle size={16} className={styles.iconSuccess} />
                          ) : (
                            <Icons.XCircle size={16} className={styles.iconDanger} />
                          )}
                          <strong>{ruleName}</strong>
                        </div>
                        <p className={styles.ruleCheckReasoning}>{check.reasoning}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.emptyPanel}>
                <Icons.BarChart3 size={32} />
                <p>Evaluation results will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
