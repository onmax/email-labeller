import type { Config } from '../config/schema.js'
import type { AIClassifier } from '../interfaces/ai-classifier.js'
import type { EmailProvider } from '../interfaces/email-provider.js'
import type { StateStore } from '../interfaces/state-store.js'
import type { CleanupResult, ProcessResult } from '../types/index.js'

export interface EmailLabeller {
  processNewEmails: (options?: { maxResults?: number }) => Promise<ProcessResult>
  backfill: (options?: BackfillOptions) => Promise<ProcessResult>
  cleanup: () => Promise<CleanupResult>
  ensureLabels: () => Promise<Map<string, string>>
}

export interface BackfillOptions {
  maxResults?: number
  query?: string
  force?: boolean
}

export interface CreateEmailLabellerOptions {
  emailProvider: EmailProvider
  aiClassifier: AIClassifier
  stateStore: StateStore
  config: Config
  onProgress?: (info: ProgressInfo) => void
}

export interface ProgressInfo {
  current: number
  total: number
  email: { id: string, subject: string }
  label?: string
  status: 'processing' | 'labeled' | 'skipped' | 'error'
  error?: Error
}

export function createEmailLabeller(options: CreateEmailLabellerOptions): EmailLabeller {
  const { emailProvider, aiClassifier, stateStore, config, onProgress } = options
  let labelMap: Map<string, string> | null = null

  async function ensureLabels(): Promise<Map<string, string>> {
    if (!labelMap)
      labelMap = await emailProvider.ensureLabelsExist(config.labels)
    return labelMap
  }

  return {
    ensureLabels,

    async processNewEmails({ maxResults = 50 } = {}) {
      const labels = await ensureLabels()
      const labelNames = config.labels.map(l => l.name)

      const allEmails = await emailProvider.getEmails({ maxResults, excludeLabels: labelNames })
      const unprocessedIds = await stateStore.filterUnprocessed(allEmails.map(e => e.id))
      const emails = allEmails.filter(e => unprocessedIds.includes(e.id))

      const results: ProcessResult['results'] = []

      for (let i = 0; i < emails.length; i++) {
        const email = emails[i]
        onProgress?.({ current: i + 1, total: emails.length, email, status: 'processing' })

        try {
          const classification = await aiClassifier.classify(email, config.labels, config.classificationPrompt)
          const labelId = labels.get(classification.label)

          if (labelId) {
            await emailProvider.applyLabel(email.id, labelId)
            results.push({ emailId: email.id, label: classification.label })
            onProgress?.({ current: i + 1, total: emails.length, email, label: classification.label, status: 'labeled' })
          }
          await stateStore.markProcessed([email.id])
        }
        catch (err) {
          onProgress?.({ current: i + 1, total: emails.length, email, status: 'error', error: err as Error })
        }
      }

      return { processed: results.length, results }
    },

    async backfill({ maxResults = 250, query = 'in:inbox -label:SENT', force = false } = {}) {
      const labels = await ensureLabels()
      const allEmails = await emailProvider.getEmails({ maxResults, query })

      let emails = allEmails
      if (!force) {
        const unprocessedIds = await stateStore.filterUnprocessed(allEmails.map(e => e.id))
        emails = allEmails.filter(e => unprocessedIds.includes(e.id))
      }

      const results: ProcessResult['results'] = []

      for (let i = 0; i < emails.length; i++) {
        const email = emails[i]
        onProgress?.({ current: i + 1, total: emails.length, email, status: 'processing' })

        try {
          if (!force) {
            const alreadyLabeled = await emailProvider.hasLabels(email.id, [...labels.values()])
            if (alreadyLabeled) {
              await stateStore.markProcessed([email.id])
              onProgress?.({ current: i + 1, total: emails.length, email, status: 'skipped' })
              continue
            }
          }

          const classification = await aiClassifier.classify(email, config.labels, config.classificationPrompt)
          const labelId = labels.get(classification.label)

          if (labelId) {
            await emailProvider.applyLabel(email.id, labelId)
            results.push({ emailId: email.id, label: classification.label })
            onProgress?.({ current: i + 1, total: emails.length, email, label: classification.label, status: 'labeled' })
          }
          await stateStore.markProcessed([email.id])

          if (i % 10 === 9)
            await new Promise(r => setTimeout(r, 500))
        }
        catch (err) {
          onProgress?.({ current: i + 1, total: emails.length, email, status: 'error', error: err as Error })
        }
      }

      return { processed: results.length, results }
    },

    async cleanup() {
      const cleanupRules = config.cleanupRules || []
      const deleted: CleanupResult = { deleted: 0, byLabel: {} }

      const labels = await emailProvider.listLabels()
      const labelIdMap = new Map(labels.map(l => [l.name, l.providerId]))

      for (const rule of cleanupRules) {
        const labelId = labelIdMap.get(rule.label)
        if (!labelId)
          continue

        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - rule.retentionDays)
        const beforeDate = cutoffDate.toISOString().split('T')[0].replace(/-/g, '/')
        const query = `label:${rule.label.replace(/\//g, '-').replace(/ /g, '-')} before:${beforeDate}`

        const emails = await emailProvider.getEmails({ maxResults: 100, query })
        for (const email of emails) {
          await emailProvider.trashEmail(email.id)
        }

        deleted.byLabel[rule.label] = emails.length
        deleted.deleted += emails.length
      }

      return deleted
    },
  }
}
