'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorAlert from '@/components/ErrorAlert'
import styles from '@/styles/components.module.css'
import * as Icons from 'lucide-react'

interface DashboardStats {
  totalPrompts: number
  totalTestCases: number
  databaseConnected: boolean
  trainingComplete: boolean
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

      // Fetch prompts
      const promptsRes = await fetch('/api/prompts')
      const promptsData = await promptsRes.json()
      const prompts = promptsData.data || []

      // Fetch test cases
      const testCasesRes = await fetch('/api/test-cases')
      const testCasesData = await testCasesRes.json()
      const testCases = testCasesData.data || []

      setStats({
        totalPrompts: prompts.length,
        totalTestCases: testCases.length,
        databaseConnected: true,
        trainingComplete: false,
      })
    } catch (err) {
      setError('Failed to load dashboard stats')
      setStats({
        totalPrompts: 0,
        totalTestCases: 0,
        databaseConnected: false,
        trainingComplete: false,
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

            <div className={`${styles.statusCard} ${!stats.trainingComplete ? styles.statusCardWarning : ''}`}>
              <div className={styles.statusIcon}>
                <Icons.Wand2 size={24} />
              </div>
              <div className={styles.statusContent}>
                <div className={styles.statusLabel}>Training Wizard</div>
                <div className={styles.statusValue}>
                  {stats.trainingComplete ? 'Complete' : 'Incomplete'}
                </div>
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
                  <h3>Create Your First Prompt Version</h3>
                  <p>Import your current Meta.com prompts to start testing</p>
                </div>
              </Link>

              <Link href="/test-cases" className={styles.quickActionCard}>
                <div className={styles.quickActionIcon}>
                  <Icons.TestTube2 size={24} />
                </div>
                <div className={styles.quickActionContent}>
                  <h3>Add Test Cases</h3>
                  <p>Import historical email examples to test against</p>
                </div>
              </Link>

              <Link href="/playground" className={styles.quickActionCard}>
                <div className={styles.quickActionIcon}>
                  <Icons.Play size={24} />
                </div>
                <div className={styles.quickActionContent}>
                  <h3>Quick Test</h3>
                  <p>Test a prompt against an email without saving</p>
                </div>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
