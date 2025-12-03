'use client'

import { useState } from 'react'
import styles from '@/styles/components.module.css'
import btnStyles from '@/styles/buttons.module.css'
import formStyles from '@/styles/forms.module.css'
import * as Icons from 'lucide-react'

const STEPS = [
  { id: 1, title: 'Business Basics', icon: Icons.Building2 },
  { id: 2, title: 'Policies', icon: Icons.FileText },
  { id: 3, title: 'Capabilities & Limitations', icon: Icons.Zap },
  { id: 4, title: 'Tone & Brand', icon: Icons.MessageSquare },
  { id: 5, title: 'Known Failure Patterns', icon: Icons.AlertTriangle },
]

export default function WizardPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    // Step 1: Business Basics
    companyName: '',
    products: '',
    countries: '',
    notShipTo: '',
    
    // Step 2: Policies
    refundPolicy: '',
    shippingPolicy: '',
    returnPolicy: '',
    
    // Step 3: Capabilities & Limitations
    canDo: '',
    cannotDo: '',
    
    // Step 4: Tone & Brand
    toneGuidelines: '',
    brandVoice: '',
    
    // Step 5: Known Failure Patterns
    failurePatterns: '',
  })

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    // TODO: Save to API
    console.log('Submitting:', formData)
    alert('Training data saved!')
  }

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value })
  }

  const progress = (currentStep / STEPS.length) * 100

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <div className={formStyles.formGroup}>
              <label className={formStyles.label}>What is your company name?</label>
              <input
                type="text"
                className={formStyles.input}
                value={formData.companyName}
                onChange={(e) => updateField('companyName', e.target.value)}
                placeholder="e.g., Acme Corp"
              />
            </div>
            <div className={formStyles.formGroup}>
              <label className={formStyles.label}>What products do you sell? (e.g., small, snus, pouches)</label>
              <textarea
                className={formStyles.textarea}
                value={formData.products}
                onChange={(e) => updateField('products', e.target.value)}
                rows={4}
                placeholder="Describe your products..."
              />
            </div>
            <div className={formStyles.formGroup}>
              <label className={formStyles.label}>Which countries do you ship to?</label>
              <textarea
                className={formStyles.textarea}
                value={formData.countries}
                onChange={(e) => updateField('countries', e.target.value)}
                rows={3}
                placeholder="List countries..."
              />
            </div>
            <div className={formStyles.formGroup}>
              <label className={formStyles.label}>Which countries do you NOT ship to?</label>
              <textarea
                className={formStyles.textarea}
                value={formData.notShipTo}
                onChange={(e) => updateField('notShipTo', e.target.value)}
                rows={3}
                placeholder="List countries..."
              />
            </div>
          </>
        )
      case 2:
        return (
          <>
            <div className={formStyles.formGroup}>
              <label className={formStyles.label}>Refund Policy</label>
              <textarea
                className={formStyles.textarea}
                value={formData.refundPolicy}
                onChange={(e) => updateField('refundPolicy', e.target.value)}
                rows={5}
                placeholder="Describe your refund policy..."
              />
            </div>
            <div className={formStyles.formGroup}>
              <label className={formStyles.label}>Shipping Policy</label>
              <textarea
                className={formStyles.textarea}
                value={formData.shippingPolicy}
                onChange={(e) => updateField('shippingPolicy', e.target.value)}
                rows={5}
                placeholder="Describe your shipping policy..."
              />
            </div>
            <div className={formStyles.formGroup}>
              <label className={formStyles.label}>Return Policy</label>
              <textarea
                className={formStyles.textarea}
                value={formData.returnPolicy}
                onChange={(e) => updateField('returnPolicy', e.target.value)}
                rows={5}
                placeholder="Describe your return policy..."
              />
            </div>
          </>
        )
      case 3:
        return (
          <>
            <div className={formStyles.formGroup}>
              <label className={formStyles.label}>What CAN your agents do?</label>
              <textarea
                className={formStyles.textarea}
                value={formData.canDo}
                onChange={(e) => updateField('canDo', e.target.value)}
                rows={6}
                placeholder="List capabilities..."
              />
            </div>
            <div className={formStyles.formGroup}>
              <label className={formStyles.label}>What CANNOT your agents do?</label>
              <textarea
                className={formStyles.textarea}
                value={formData.cannotDo}
                onChange={(e) => updateField('cannotDo', e.target.value)}
                rows={6}
                placeholder="List limitations..."
              />
            </div>
          </>
        )
      case 4:
        return (
          <>
            <div className={formStyles.formGroup}>
              <label className={formStyles.label}>Tone Guidelines</label>
              <textarea
                className={formStyles.textarea}
                value={formData.toneGuidelines}
                onChange={(e) => updateField('toneGuidelines', e.target.value)}
                rows={6}
                placeholder="Describe the tone your agents should use..."
              />
            </div>
            <div className={formStyles.formGroup}>
              <label className={formStyles.label}>Brand Voice</label>
              <textarea
                className={formStyles.textarea}
                value={formData.brandVoice}
                onChange={(e) => updateField('brandVoice', e.target.value)}
                rows={6}
                placeholder="Describe your brand voice..."
              />
            </div>
          </>
        )
      case 5:
        return (
          <>
            <div className={formStyles.formGroup}>
              <label className={formStyles.label}>Known Failure Patterns</label>
              <textarea
                className={formStyles.textarea}
                value={formData.failurePatterns}
                onChange={(e) => updateField('failurePatterns', e.target.value)}
                rows={10}
                placeholder="Describe common mistakes or failure patterns to avoid..."
              />
            </div>
          </>
        )
      default:
        return null
    }
  }

  return (
    <div>
      {/* Header */}
      <div className={styles.wizardHeader}>
        <h1>Training Wizard</h1>
        <p className={styles.wizardSubtitle}>Teach the AI evaluator about your business</p>
      </div>

      {/* Progress Steps */}
      <div className={styles.wizardSteps}>
        {STEPS.map((step) => {
          const StepIcon = step.icon
          return (
            <div
              key={step.id}
              className={`${styles.wizardStepTab} ${
                currentStep === step.id ? styles.wizardStepActive : ''
              } ${
                currentStep > step.id ? styles.wizardStepComplete : ''
              }`}
              onClick={() => setCurrentStep(step.id)}
            >
              <div className={styles.wizardStepNumber}>{step.id}</div>
              <div className={styles.wizardStepInfo}>
                <div className={styles.wizardStepTitle}>{step.title}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Progress Bar */}
      <div className={styles.wizardProgressBar}>
        <div className={styles.wizardProgressFill} style={{ width: `${progress}%` }} />
      </div>

      {/* Form Content */}
      <div className={styles.wizardFormContainer}>
        <div className={styles.wizardFormCard}>
          <h2 className={styles.wizardFormTitle}>{STEPS[currentStep - 1].title}</h2>
          <div className={styles.wizardFormContent}>
            {renderStepContent()}
          </div>

          {/* Navigation Buttons */}
          <div className={styles.wizardFormActions}>
            <button
              onClick={handlePrevious}
              className={btnStyles.secondary}
              disabled={currentStep === 1}
            >
              <Icons.ChevronLeft size={18} />
              Previous
            </button>
            {currentStep < STEPS.length ? (
              <button onClick={handleNext} className={btnStyles.primary}>
                Next
                <Icons.ChevronRight size={18} />
              </button>
            ) : (
              <button onClick={handleSubmit} className={btnStyles.primary}>
                <Icons.Check size={18} />
                Complete Training
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
