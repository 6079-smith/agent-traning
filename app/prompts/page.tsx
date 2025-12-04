'use client'

import { useEffect, useState } from 'react'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorAlert from '@/components/ErrorAlert'
import styles from '@/styles/components.module.css'
import btnStyles from '@/styles/buttons.module.css'
import formStyles from '@/styles/forms.module.css'
import * as Icons from 'lucide-react'
import type { PromptVersion } from '@/types/database'

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<PromptVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPrompt, setSelectedPrompt] = useState<PromptVersion | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    system_prompt: '',
    user_prompt: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generateProgress, setGenerateProgress] = useState(0)

  useEffect(() => {
    fetchPrompts()
  }, [])

  async function fetchPrompts() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/prompts')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPrompts(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prompts')
    } finally {
      setLoading(false)
    }
  }

  function startCreate() {
    setIsCreating(true)
    setSelectedPrompt(null)
    setFormData({ name: '', system_prompt: '', user_prompt: '', notes: '' })
  }

  async function generateFromTraining() {
    try {
      setGenerating(true)
      setGenerateProgress(0)
      setError(null)
      
      // Simulate progress while waiting for API (takes ~10-15 seconds typically)
      const progressInterval = setInterval(() => {
        setGenerateProgress(prev => {
          // Slow down as we approach 90% (never reach 100% until done)
          if (prev < 30) return prev + 3
          if (prev < 60) return prev + 2
          if (prev < 85) return prev + 1
          return Math.min(prev + 0.5, 90)
        })
      }, 300)
      
      const res = await fetch('/api/prompts/generate', { method: 'POST' })
      const data = await res.json()
      
      clearInterval(progressInterval)
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      // Complete the progress bar
      setGenerateProgress(100)
      
      // Small delay to show 100% before resetting
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Pre-fill the form with generated content, but keep existing name if user already entered one
      setIsCreating(true)
      setSelectedPrompt(null)
      setFormData(prev => ({
        name: prev.name.trim() || data.data.name,
        system_prompt: data.data.systemPrompt,
        user_prompt: data.data.userPrompt,
        notes: prev.notes.trim() || data.data.notes,
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate prompt')
    } finally {
      setGenerating(false)
      setGenerateProgress(0)
    }
  }

  function selectPrompt(prompt: PromptVersion) {
    setIsCreating(false)
    setSelectedPrompt(prompt)
    setFormData({
      name: prompt.name,
      system_prompt: prompt.system_prompt,
      user_prompt: prompt.user_prompt,
      notes: prompt.notes || '',
    })
  }

  function cancelEdit() {
    setIsCreating(false)
    setSelectedPrompt(null)
    setFormData({ name: '', system_prompt: '', user_prompt: '', notes: '' })
  }

  async function handleSave() {
    if (!formData.name || !formData.system_prompt || !formData.user_prompt) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const url = selectedPrompt ? `/api/prompts/${selectedPrompt.id}` : '/api/prompts'
      const method = selectedPrompt ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      cancelEdit()
      fetchPrompts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompt')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this prompt version?')) return

    try {
      setError(null)
      const res = await fetch(`/api/prompts/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      fetchPrompts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete prompt')
    }
  }

  async function handleActivate(id: number) {
    try {
      setError(null)
      const res = await fetch(`/api/prompts/${id}/activate`, { method: 'POST' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      fetchPrompts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate prompt')
    }
  }

  if (loading) {
    return <LoadingSpinner size="large" message="Loading prompts..." />
  }

  return (
    <div>
      {/* Header */}
      <div className={styles.promptEditorHeader}>
        <div>
          <h1>Prompt Editor</h1>
          <p className={styles.promptEditorSubtitle}>Manage and version control your system prompts</p>
        </div>
        <div className={styles.promptEditorActions}>
          {generating ? (
            <button 
              className={btnStyles.progressButton}
              style={{ '--progress': `${generateProgress}%` } as React.CSSProperties}
              disabled
            >
              <span>Generating... {Math.round(generateProgress)}%</span>
            </button>
          ) : (
            <button 
              onClick={generateFromTraining} 
              className={btnStyles.primary}
            >
              <Icons.Sparkles size={18} />
              Generate from Training
            </button>
          )}
          <button onClick={startCreate} className={btnStyles.secondary}>
            <Icons.FileText size={18} />
            New Blank Version
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      {prompts.length === 0 && !isCreating ? (
        <div className={styles.emptyState}>
          <Icons.FileText size={48} />
          <p>No prompt versions yet.</p>
          <p>Create your first one!</p>
        </div>
      ) : (
        <div className={styles.promptEditorGrid}>
          {/* Left: Prompt List */}
          <div className={styles.promptList}>
            <div className={styles.promptListHeader}>
              <h3>Versions</h3>
            </div>
            <div className={styles.promptListItems}>
              {prompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className={`${styles.promptListItem} ${
                    selectedPrompt?.id === prompt.id ? styles.promptListItemActive : ''
                  }`}
                  onClick={() => selectPrompt(prompt)}
                >
                  <div className={styles.promptListItemHeader}>
                    <strong>{prompt.name}</strong>
                    {prompt.is_active && (
                      <span className={styles.promptActiveBadge}>
                        <Icons.CheckCircle size={14} />
                        Active
                      </span>
                    )}
                  </div>
                  {prompt.notes && (
                    <div className={styles.promptListItemNotes}>{prompt.notes}</div>
                  )}
                  <div className={styles.promptListItemMeta}>
                    {new Date(prompt.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Form */}
          <div className={styles.promptFormPanel}>
            {!selectedPrompt && !isCreating ? (
              <div className={styles.promptFormEmpty}>
                <Icons.FileEdit size={48} />
                <p>Select a prompt version to edit</p>
              </div>
            ) : (
              <>
                <div className={styles.promptFormHeader}>
                  <h2>{isCreating ? 'New Prompt Version' : 'Edit Prompt Version'}</h2>
                  <div className={styles.promptFormHeaderActions}>
                    {selectedPrompt && !selectedPrompt.is_active && (
                      <button
                        onClick={() => handleActivate(selectedPrompt.id)}
                        className={btnStyles.secondary}
                      >
                        <Icons.CheckCircle size={16} />
                        Set Active
                      </button>
                    )}
                    {selectedPrompt && (
                      <button
                        onClick={() => handleDelete(selectedPrompt.id)}
                        className={`${btnStyles.secondary} ${btnStyles.danger}`}
                      >
                        <Icons.Trash2 size={16} />
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                <div className={styles.promptFormContent}>
                  <div className={formStyles.formGroup}>
                    <h3 className={formStyles.sectionLabel}>Version Name</h3>
                    <input
                      type="text"
                      className={formStyles.input}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Customer Service v1"
                    />
                  </div>

                  <div className={formStyles.formGroup}>
                    <h3 className={formStyles.sectionLabel}>System Prompt</h3>
                    <div className={styles.promptTextareaHeader}>
                      <span>Enter your system prompt here...</span>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(formData.system_prompt)}
                        className={btnStyles.iconButton}
                        title="Copy"
                      >
                        <Icons.Copy size={14} />
                      </button>
                    </div>
                    <textarea
                      className={`${formStyles.textarea} ${styles.promptTextarea}`}
                      value={formData.system_prompt}
                      onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                      placeholder="Enter the system prompt..."
                      rows={12}
                    />
                  </div>

                  <div className={formStyles.formGroup}>
                    <h3 className={formStyles.sectionLabel}>User Prompt</h3>
                    <div className={styles.promptTextareaHeader}>
                      <span>Use placeholders like {'{'}file.thread{'}'}, {'{'}file.to{'}'}, etc.</span>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(formData.user_prompt)}
                        className={btnStyles.iconButton}
                        title="Copy"
                      >
                        <Icons.Copy size={14} />
                      </button>
                    </div>
                    <textarea
                      className={`${formStyles.textarea} ${styles.promptTextarea}`}
                      value={formData.user_prompt}
                      onChange={(e) => setFormData({ ...formData, user_prompt: e.target.value })}
                      placeholder="Enter the user prompt template..."
                      rows={12}
                    />
                  </div>
                </div>

                <div className={styles.promptFormFooter}>
                  <button
                    onClick={cancelEdit}
                    className={btnStyles.secondary}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className={btnStyles.primary}
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
