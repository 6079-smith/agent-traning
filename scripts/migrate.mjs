import pg from 'pg'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

const { Pool } = pg
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env.local manually to ensure it works with ES modules
const envPath = join(__dirname, '../.env.local')
console.log('Loading .env from:', envPath)
const envConfig = dotenv.parse(readFileSync(envPath))
Object.keys(envConfig).forEach((key) => {
  process.env[key] = envConfig[key]
})

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL
if (!connectionString) {
  console.error('ERROR: POSTGRES_URL or DATABASE_URL is not set in .env.local')
  process.exit(1)
}

console.log('Connection string loaded successfully')
console.log('Connecting to database...')

// Use connection string directly
const pool = new Pool({
  connectionString,
})

const migrations = [
  `CREATE TABLE IF NOT EXISTS knowledge_base (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category, key)
  )`,
  `CREATE TABLE IF NOT EXISTS prompt_versions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    system_prompt TEXT NOT NULL,
    user_prompt TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS test_cases (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email_thread TEXT NOT NULL,
    customer_email VARCHAR(255),
    customer_name VARCHAR(255),
    subject VARCHAR(500),
    order_number VARCHAR(100),
    expected_behavior TEXT,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS test_results (
    id SERIAL PRIMARY KEY,
    test_case_id INTEGER REFERENCES test_cases(id) ON DELETE CASCADE,
    prompt_version_id INTEGER REFERENCES prompt_versions(id) ON DELETE CASCADE,
    agent_response TEXT NOT NULL,
    evaluator_score INTEGER CHECK (evaluator_score >= 0 AND evaluator_score <= 100),
    evaluator_reasoning TEXT,
    rule_checks JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS evaluator_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    check_prompt TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS wizard_progress (
    id SERIAL PRIMARY KEY,
    current_step INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_test_results_test_case ON test_results(test_case_id)`,
  `CREATE INDEX IF NOT EXISTS idx_test_results_prompt_version ON test_results(prompt_version_id)`,
  `CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category)`,
  // Fix evaluator_score constraint to allow 0-100 range
  `ALTER TABLE test_results DROP CONSTRAINT IF EXISTS test_results_evaluator_score_check`,
  `ALTER TABLE test_results ADD CONSTRAINT test_results_evaluator_score_check CHECK (evaluator_score >= 0 AND evaluator_score <= 100)`,
  // Clean up duplicate evaluator rules first (keep the one with lowest id)
  `DELETE FROM evaluator_rules a USING evaluator_rules b WHERE a.id > b.id AND a.name = b.name`,
  // Then add unique constraint on evaluator_rules name to prevent future duplicates
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_evaluator_rules_name ON evaluator_rules(name)`,
  // Add wizard_question_id to link evaluator rules to their source in the knowledge base
  `ALTER TABLE evaluator_rules ADD COLUMN IF NOT EXISTS knowledge_base_id INTEGER REFERENCES knowledge_base(id) ON DELETE SET NULL`,
  `CREATE INDEX IF NOT EXISTS idx_evaluator_rules_kb ON evaluator_rules(knowledge_base_id)`,
  // Fix misspelled category 'eskaltion_triggers' -> 'escalation_triggers'
  `UPDATE knowledge_base SET category = 'escalation_triggers' WHERE category = 'eskaltion_triggers'`,
  `DELETE FROM wizard_steps WHERE category = 'eskaltion_triggers'`,
  // Add missing wizard steps for orphaned knowledge base categories
  `INSERT INTO wizard_steps (title, category, sort_order) VALUES ('Escalation Triggers', 'escalation_triggers', 7) ON CONFLICT (category) DO NOTHING`,
  `INSERT INTO wizard_steps (title, category, sort_order) VALUES ('Refund Handling', 'refund_handling', 8) ON CONFLICT (category) DO NOTHING`,
  // Add category column to evaluator_rules for manual rules linked to wizard steps
  `ALTER TABLE evaluator_rules ADD COLUMN IF NOT EXISTS category VARCHAR(100)`,
  `CREATE INDEX IF NOT EXISTS idx_evaluator_rules_category ON evaluator_rules(category)`,
]

async function runMigrations() {
  console.log('Running database migrations...')

  try {
    for (const migration of migrations) {
      await pool.query(migration)
    }
    console.log('Migrations completed successfully!')

    // Seed default evaluator rules
    await seedEvaluatorRules()

    console.log('Database setup complete!')
  } catch (error) {
    console.error('Migration error:', error)
    throw error
  } finally {
    await pool.end()
  }
}

async function seedEvaluatorRules() {
  const rules = [
    {
      name: 'Escalation on Refund Keywords',
      description:
        'Check if agent escalated when refund/cancel/money back keywords present',
      check_prompt:
        'Does the customer email contain keywords like "refund", "cancel", "money back", "wrong order", "missing item", "damaged"? If YES, did the agent response indicate escalation to a human team? Return PASS if escalated correctly or no keywords present, FAIL if keywords present but not escalated.',
    },
    {
      name: 'Order Number Request',
      description: 'Check if agent asked for order number when missing',
      check_prompt:
        'Does the customer email ask about an order but NOT provide an order number? If YES, did the agent ask for the order number? Return PASS if order number was provided OR agent asked for it, FAIL if order-related query without number and agent did not ask.',
    },
    {
      name: 'No Hallucinated Capabilities',
      description: 'Check if agent offered services that do not exist',
      check_prompt:
        'Did the agent offer any of these non-existent capabilities: "add to restock notification list", "contact courier on your behalf", "open investigation with DHL", "monitor parcel progress", "check shipping availability for your address"? Return PASS if none offered, FAIL if any offered.',
    },
    {
      name: 'Attachment Acknowledgment',
      description: 'Check if agent acknowledged attachments when present',
      check_prompt:
        'Does the customer email mention or include attachments/images? If YES, did the agent acknowledge receiving them? Return PASS if acknowledged or no attachments, FAIL if attachments present but not acknowledged.',
    },
    {
      name: 'No Generic Mismatch Response',
      description:
        'Check if agent gave a generic response that does not match context',
      check_prompt:
        'Did the agent respond with generic phrases like "You are most welcome! I\'m glad I could provide the information you needed" when the customer did NOT ask a question or receive information? Return PASS if response matches context, FAIL if generic mismatch.',
    },
    {
      name: 'Appropriate Tone for Sentiment',
      description: 'Check if agent matched tone to customer sentiment',
      check_prompt:
        'Is the customer frustrated (profanity, exclamation points, "unacceptable", "ridiculous")? If YES, did the agent open with empathy/apology? Return PASS if tone matched, FAIL if frustrated customer got no empathy.',
    },
    {
      name: 'Confidence Acknowledgment',
      description: 'Check if agent admitted uncertainty when lacking info',
      check_prompt:
        'Did the agent make definitive claims about things it could not know (specific dates, inventory levels, carrier actions) without qualifying uncertainty? Return PASS if appropriately uncertain or had data, FAIL if made unverifiable claims confidently.',
    },
    {
      name: 'No Prohibited Offers',
      description: 'Check if agent avoided offering prohibited actions',
      check_prompt:
        'Did the agent offer to: contact shipping courier, open immediate investigation, monitor parcel, frame delay as "problem with order" instead of "problem with shipping"? Return PASS if none offered, FAIL if any prohibited offer made.',
    },
  ]

  for (const rule of rules) {
    await pool.query(
      `INSERT INTO evaluator_rules (name, description, check_prompt) 
       VALUES ($1, $2, $3) 
       ON CONFLICT DO NOTHING`,
      [rule.name, rule.description, rule.check_prompt]
    )
  }

  console.log('Seeded evaluator rules')
}

runMigrations()
