'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorAlert from '@/components/ErrorAlert'
import styles from '@/styles/components.module.css'
import layoutStyles from '@/styles/layout.module.css'
import btnStyles from '@/styles/buttons.module.css'
import * as Icons from 'lucide-react'
import type { EvaluatorRule } from '@/types/database'

// Extended type with knowledge base source info
interface EvaluatorRuleWithSource extends EvaluatorRule {
  kb_category?: string
  kb_key?: string
  kb_display_title?: string
  step_title?: string
}

interface WizardStep {
  id: number
  title: string
  category: string
  sort_order: number
}

export default function EvaluatorRulesPage() {
  const router = useRouter()
  const [rules, setRules] = useState<EvaluatorRuleWithSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Partial<EvaluatorRule>>({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [wizardSteps, setWizardSteps] = useState<WizardStep[]>([])
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    check_prompt: '',
    priority: 5,
    is_active: true,
    category: ''
  })

  useEffect(() => {
    fetchRules()
    fetchWizardSteps()
  }, [])

  async function fetchWizardSteps() {
    try {
      const res = await fetch('/api/wizard-steps')
      const data = await res.json()
      if (data.data) setWizardSteps(data.data)
    } catch (err) {
      console.error('Failed to fetch wizard steps:', err)
    }
  }

  async function fetchRules() {
    try {
      setLoading(true)
      const res = await fetch('/api/evaluator/rules?all=true')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setRules(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rules')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(rule: EvaluatorRule) {
    try {
      setError(null)
      const res = await fetch('/api/evaluator/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, id: rule.id })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      
      setEditingId(null)
      setEditForm({})
      fetchRules()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rule')
    }
  }

  async function handleAdd() {
    try {
      setError(null)
      if (!newRule.name.trim() || !newRule.check_prompt.trim()) {
        setError('Name and Check Prompt are required')
        return
      }
      
      const res = await fetch('/api/evaluator/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule)
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      
      setShowAddForm(false)
      setNewRule({ name: '', description: '', check_prompt: '', priority: 5, is_active: true, category: '' })
      fetchRules()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add rule')
    }
  }

  async function handleToggleActive(rule: EvaluatorRule) {
    try {
      const res = await fetch('/api/evaluator/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rule.id, is_active: !rule.is_active })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      fetchRules()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle rule')
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this rule?')) return
    
    try {
      const res = await fetch(`/api/evaluator/rules?id=${id}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      fetchRules()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rule')
    }
  }

  function startEdit(rule: EvaluatorRule) {
    setEditingId(rule.id)
    setEditForm({
      name: rule.name,
      description: rule.description || '',
      check_prompt: rule.check_prompt,
      priority: rule.priority
    })
  }

  function getPriorityLabel(priority: number) {
    if (priority >= 8) return { label: 'High', class: styles.priorityHigh }
    if (priority >= 4) return { label: 'Medium', class: styles.priorityMedium }
    return { label: 'Low', class: styles.priorityLow }
  }

  // Compute source filters with counts using step_title
  const sourceCounts = rules.reduce((acc, rule) => {
    const source = rule.step_title || (rule.kb_category ? rule.kb_category : 'Manual')
    acc[source] = (acc[source] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const sources = Object.keys(sourceCounts).sort((a, b) => {
    if (a === 'Manual') return 1 // Manual goes last
    if (b === 'Manual') return -1
    return a.localeCompare(b)
  })

  // Filter rules based on selected source
  const filteredRules = sourceFilter === 'all' 
    ? rules 
    : rules.filter(rule => {
        const ruleSource = rule.step_title || (rule.kb_category ? rule.kb_category : 'Manual')
        return ruleSource === sourceFilter
      })

  if (loading) return <LoadingSpinner />

  return (
    <div className={layoutStyles.pageContainer}>
      <div className={layoutStyles.pageHeader}>
        <div>
          <h1 className={layoutStyles.pageTitle}>Evaluator Rules</h1>
          <p className={layoutStyles.pageSubtitle}>
            Define rules that the AI evaluator uses to check agent responses
          </p>
        </div>
        <button 
          className={btnStyles.primary}
          onClick={() => setShowAddForm(true)}
        >
          <Icons.Plus size={16} />
          Add Rule
        </button>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      {/* Source Filter Pills */}
      <div className={styles.sourceFilterBar}>
        <button
          className={`${styles.sourceFilterPill} ${sourceFilter === 'all' ? styles.sourceFilterActive : ''}`}
          onClick={() => setSourceFilter('all')}
        >
          All ({rules.length})
        </button>
        {sources.map(source => (
          <button
            key={source}
            className={`${styles.sourceFilterPill} ${sourceFilter === source ? styles.sourceFilterActive : ''}`}
            onClick={() => setSourceFilter(source)}
          >
            {source} ({sourceCounts[source]})
          </button>
        ))}
      </div>

      {/* Add New Rule Form */}
      {showAddForm && (
        <div className={styles.ruleCard}>
          <h3 className={styles.ruleCardTitle}>
            <Icons.Plus size={18} />
            Add New Rule
          </h3>
          <div className={styles.ruleForm}>
            <div className={styles.formGroup}>
              <label>Rule Name</label>
              <input
                type="text"
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                placeholder="e.g., no_false_promises"
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Description</label>
              <input
                type="text"
                value={newRule.description}
                onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                placeholder="Brief description of what this rule checks"
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Evaluation Criteria</label>
              <textarea
                value={newRule.check_prompt}
                onChange={(e) => setNewRule({ ...newRule, check_prompt: e.target.value })}
                placeholder="Describe what to check, e.g.: 'Does the response acknowledge the customer's frustration before offering solutions?'"
                className={styles.textarea}
                rows={3}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Wizard Step</label>
              <select
                value={newRule.category}
                onChange={(e) => setNewRule({ ...newRule, category: e.target.value })}
                className={styles.manualSelect}
              >
                <option value="">-- Select a step (optional) --</option>
                {wizardSteps.map(step => (
                  <option key={step.id} value={step.category}>{step.title}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Priority</label>
              <select
                value={newRule.priority >= 8 ? 'high' : newRule.priority >= 4 ? 'medium' : 'low'}
                onChange={(e) => {
                  const val = e.target.value
                  setNewRule({ ...newRule, priority: val === 'high' ? 9 : val === 'medium' ? 5 : 2 })
                }}
                className={styles.manualSelect}
                style={{ width: '140px' }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className={styles.formActions}>
              <button className={btnStyles.success} onClick={handleAdd}>
                <Icons.Check size={14} />
                Add Rule
              </button>
              <button className={btnStyles.ghost} onClick={() => setShowAddForm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div className={styles.rulesList}>
        {rules.length === 0 ? (
          <div className={styles.emptyState}>
            <Icons.FileQuestion size={48} />
            <p>No evaluator rules defined yet.</p>
            <button className={btnStyles.primary} onClick={() => setShowAddForm(true)}>
              Add Your First Rule
            </button>
          </div>
        ) : filteredRules.length === 0 ? (
          <div className={styles.emptyState}>
            <Icons.Filter size={48} />
            <p>No rules match the selected filter.</p>
          </div>
        ) : (
          filteredRules.map((rule) => {
            const priority = getPriorityLabel(rule.priority)
            const isEditing = editingId === rule.id
            
            return (
              <div 
                key={rule.id} 
                className={`${styles.ruleCard} ${!rule.is_active ? styles.ruleInactive : ''}`}
              >
                {isEditing ? (
                  <div className={styles.ruleForm}>
                    <div className={styles.formGroup}>
                      <label>Rule Name</label>
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Description</label>
                      <input
                        type="text"
                        value={editForm.description || ''}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Check Prompt</label>
                      <textarea
                        value={editForm.check_prompt || ''}
                        onChange={(e) => setEditForm({ ...editForm, check_prompt: e.target.value })}
                        className={styles.textarea}
                        rows={3}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Priority (1-10)</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={editForm.priority || 5}
                        onChange={(e) => setEditForm({ ...editForm, priority: parseInt(e.target.value) || 5 })}
                        className={styles.input}
                        style={{ width: '100px' }}
                      />
                    </div>
                    <div className={styles.formActions}>
                      <button className={btnStyles.success} onClick={() => handleSave(rule)}>
                        <Icons.Check size={14} />
                        Save
                      </button>
                      <button className={btnStyles.ghost} onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={styles.ruleHeader}>
                      <div className={styles.ruleMeta}>
                        <h3 className={styles.ruleName}>{rule.name}</h3>
                        <span className={`${styles.suggestionPriority} ${priority.class}`}>
                          {priority.label}
                        </span>
                        {!rule.is_active && (
                          <span className={styles.ruleDisabledBadge}>Disabled</span>
                        )}
                      </div>
                      <div className={styles.ruleActions}>
                        <button
                          className={btnStyles.ghost}
                          onClick={() => startEdit(rule)}
                          title="Edit"
                        >
                          <Icons.Pencil size={14} />
                        </button>
                        <button
                          className={btnStyles.ghost}
                          onClick={() => handleToggleActive(rule)}
                          title={rule.is_active ? 'Disable' : 'Enable'}
                        >
                          {rule.is_active ? <Icons.EyeOff size={14} /> : <Icons.Eye size={14} />}
                        </button>
                        <button
                          className={btnStyles.ghost}
                          onClick={() => handleDelete(rule.id)}
                          title="Delete"
                        >
                          <Icons.Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {rule.description && (
                      <p className={styles.ruleDescription}>{rule.description}</p>
                    )}
                    {(rule.step_title || rule.kb_category) && (
                      <div className={styles.ruleSource}>
                        <Icons.Link size={12} />
                        <span>Source:</span>
                        <a 
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            router.push(`/wizard?step=${rule.kb_category}`)
                          }}
                          className={styles.ruleSourceLink}
                        >
                          {rule.step_title || rule.kb_category}
                        </a>
                        <span>→</span>
                        <span>{rule.kb_display_title || rule.kb_key}</span>
                      </div>
                    )}
                    <div className={styles.ruleCheckPrompt}>
                      <strong>Check:</strong> {rule.check_prompt}
                    </div>
                  </>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
