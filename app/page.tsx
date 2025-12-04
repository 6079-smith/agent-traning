'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorAlert from '@/components/ErrorAlert'
import styles from '@/styles/components.module.css'
import * as Icons from 'lucide-react'

interface WizardStatus {
  isComplete: boolean
  totalSteps: number
  completedSteps: number
  totalQuestions: number
  answeredQuestions: number
  percentComplete: number
}

interface DashboardStats {
  totalPrompts: number
  totalTestCases: number
  databaseConnected: boolean
  wizardStatus: WizardStatus
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  async function fetchDashboardStats() {
    try {
      setLoading(true)
      setError(null)

      // Fetch all data in parallel
      const [promptsRes, testCasesRes, wizardRes] = await Promise.all([
        fetch('/api/prompts'),
        fetch('/api/test-cases'),
        fetch('/api/wizard/status'),
      ])
      
      const promptsData = await promptsRes.json()
      const testCasesData = await testCasesRes.json()
      const wizardData = await wizardRes.json()

      setStats({
        totalPrompts: (promptsData.data || []).length,
        totalTestCases: (testCasesData.data || []).length,
        databaseConnected: true,
        wizardStatus: wizardData.data || {
          isComplete: false,
          totalSteps: 0,
          completedSteps: 0,
          totalQuestions: 0,
          answeredQuestions: 0,
          percentComplete: 0,
        },
      })
    } catch (err) {
      setError('Failed to load dashboard stats')
      setStats({
        totalPrompts: 0,
        totalTestCases: 0,
        databaseConnected: false,
        wizardStatus: {
          isComplete: false,
          totalSteps: 0,
          completedSteps: 0,
          totalQuestions: 0,
          answeredQuestions: 0,
          percentComplete: 0,
        },
      })
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner size="large" message="Loading dashboard..." />
  }

  return (
    <div>
      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      {stats && (
        <>
          {/* Page Header */}
          <div className={styles.dashboardHeader}>
            <h1>Dashboard</h1>
            <p className={styles.dashboardSubtitle}>Overview of your prompt optimization progress</p>
          </div>

          {/* Status Cards */}
          <div className={styles.statusGrid}>
            <div className={`${styles.statusCard} ${!stats.databaseConnected ? styles.statusCardError : ''}`}>
              <div className={styles.statusIcon}>
                <Icons.Database size={24} />
              </div>
              <div className={styles.statusContent}>
                <div className={styles.statusLabel}>Database</div>
                <div className={styles.statusValue}>
                  {stats.databaseConnected ? 'Connected' : 'Disconnected'}
                </div>
              </div>
            </div>

            <div className={`${styles.statusCard} ${!stats.wizardStatus.isComplete ? styles.statusCardWarning : ''}`}>
              <div className={styles.statusIcon}>
                <Icons.Wand2 size={24} />
              </div>
              <div className={styles.statusContent}>
                <div className={styles.statusLabel}>Training Wizard</div>
                <div className={styles.statusValue}>
                  {stats.wizardStatus.isComplete ? 'Complete' : `${stats.wizardStatus.percentComplete}% Complete`}
                </div>
                {!stats.wizardStatus.isComplete && stats.wizardStatus.totalSteps > 0 && (
                  <div className={styles.statusMeta}>
                    {stats.wizardStatus.completedSteps}/{stats.wizardStatus.totalSteps} steps
                  </div>
                )}
              </div>
            </div>

            <div className={styles.statusCard}>
              <div className={styles.statusIcon}>
                <Icons.FileEdit size={24} />
              </div>
              <div className={styles.statusContent}>
                <div className={styles.statusLabel}>Prompt Versions</div>
                <div className={styles.statusValue}>{stats.totalPrompts}</div>
              </div>
            </div>

            <div className={styles.statusCard}>
              <div className={styles.statusIcon}>
                <Icons.TestTube2 size={24} />
              </div>
              <div className={styles.statusContent}>
                <div className={styles.statusLabel}>Test Cases</div>
                <div className={styles.statusValue}>{stats.totalTestCases}</div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className={styles.quickActionsSection}>
            <h2 className={styles.sectionTitle}>Quick Actions</h2>
            <div className={styles.quickActionsGrid}>
              <Link href="/wizard" className={styles.quickActionCard}>
                <div className={styles.quickActionIcon}>
                  <Icons.Wand2 size={24} />
                </div>
                <div className={styles.quickActionContent}>
                  <h3>Complete Training Wizard</h3>
                  <p>Set up your business context for the AI evaluator</p>
                </div>
              </Link>

              <Link href="/prompts" className={styles.quickActionCard}>
                <div className={styles.quickActionIcon}>
                  <Icons.FileEdit size={24} />
                </div>
                <div className={styles.quickActionContent}>
                  <h3>Manage Prompt Versions</h3>
                  <p>Create and edit system prompts for your CS agent</p>
                </div>
              </Link>

              <Link href="/test-cases" className={styles.quickActionCard}>
                <div className={styles.quickActionIcon}>
                  <Icons.Mail size={24} />
                </div>
                <div className={styles.quickActionContent}>
                  <h3>Add Customer Emails</h3>
                  <p>Add sample emails to test your prompts against</p>
                </div>
              </Link>

              <Link href="/playground" className={styles.quickActionCard}>
                <div className={styles.quickActionIcon}>
                  <Icons.Play size={24} />
                </div>
                <div className={styles.quickActionContent}>
                  <h3>Open Playground</h3>
                  <p>Generate responses and evaluate them against your training</p>
                </div>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
