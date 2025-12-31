import type { Config } from '../config/schema.js'
import type { AIClassifier } from '../interfaces/ai-classifier.js'
import type { EmailProvider } from '../interfaces/email-provider.js'
import type { StateStore } from '../interfaces/state-store.js'
import type { EmailSummary } from '../types/email.js'
import type { CleanupResult, ProcessResult } from '../types/index.js'
import { matchesFilter } from '../utils/filter.js'

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
  labels?: string[]
  status: 'processing' | 'labeled' | 'skipped' | 'trashed' | 'error'
  error?: Error
}

export function createEmailLabeller(options: CreateEmailLabellerOptions): EmailLabeller {
  const { emailProvider, aiClassifier, stateStore, config, onProgress } = options
  let labelMap: Map<string, string> | null = null

  function progress(info: ProgressInfo): void {
    try {
      onProgress?.(info)
    }
    catch { /* ignore callback errors */ }
  }

  async function ensureLabels(): Promise<Map<string, string>> {
    if (!labelMap)
      labelMap = await emailProvider.ensureLabelsExist(config.labels)
    return labelMap
  }

  function shouldAutoTrash(email: EmailSummary): boolean {
    if (!config.autoTrashRules?.length)
      return false
    return config.autoTrashRules.some(rule => matchesFilter(email, rule))
  }

  async function applyLabels(emailId: string, labelNames: string[], labelIdMap: Map<string, string>): Promise<string[]> {
    const applied: string[] = []
    for (const name of labelNames) {
      const id = labelIdMap.get(name)
      if (id) {
        await emailProvider.applyLabel(emailId, id)
        applied.push(name)
      }
    }
    return applied
  }

  interface ProcessContext { current: number, total: number, labelIdMap: Map<string, string>, results: ProcessResult['results'], throttle?: boolean }

  async function processEmail(email: EmailSummary, ctx: ProcessContext): Promise<boolean> {
    progress({ current: ctx.current, total: ctx.total, email, status: 'processing' })

    try {
      const classification = await aiClassifier.classify(email, config.labels, config.classificationPrompt)
      const appliedLabels = await applyLabels(email.id, classification.labels, ctx.labelIdMap)

      if (appliedLabels.length > 0) {
        ctx.results.push({ emailId: email.id, labels: appliedLabels })
        progress({ current: ctx.current, total: ctx.total, email, labels: appliedLabels, status: 'labeled' })
      }

      await stateStore.markProcessed([email.id])

      if (shouldAutoTrash(email)) {
        await emailProvider.trashEmail(email.id)
        progress({ current: ctx.current, total: ctx.total, email, labels: appliedLabels, status: 'trashed' })
      }

      if (ctx.throttle && ctx.current % 10 === 0)
        await new Promise(r => setTimeout(r, 500))

      return true
    }
    catch (err) {
      progress({ current: ctx.current, total: ctx.total, email, status: 'error', error: err as Error })
      return false
    }
  }

  return {
    ensureLabels,

    async processNewEmails({ maxResults = 50 } = {}) {
      const labelIdMap = await ensureLabels()
      const labelNames = config.labels.map(l => l.name)

      const allEmails = await emailProvider.getEmails({ maxResults, excludeLabels: labelNames })
      const unprocessedIds = await stateStore.filterUnprocessed(allEmails.map(e => e.id))
      const emails = allEmails.filter(e => unprocessedIds.includes(e.id))

      const results: ProcessResult['results'] = []
      for (const [i, email] of emails.entries())
        await processEmail(email, { current: i + 1, total: emails.length, labelIdMap, results, throttle: true })

      return { processed: results.length, results }
    },

    async backfill({ maxResults = 250, query = 'in:inbox -label:SENT', force = false } = {}) {
      const labelIdMap = await ensureLabels()
      const allEmails = await emailProvider.getEmails({ maxResults, query })

      let emails = allEmails
      if (!force) {
        const unprocessedIds = await stateStore.filterUnprocessed(allEmails.map(e => e.id))
        emails = allEmails.filter(e => unprocessedIds.includes(e.id))
      }

      const results: ProcessResult['results'] = []
      for (const [i, email] of emails.entries()) {
        if (!force) {
          const alreadyLabeled = await emailProvider.hasLabels(email.id, [...labelIdMap.values()])
          if (alreadyLabeled) {
            await stateStore.markProcessed([email.id])
            progress({ current: i + 1, total: emails.length, email, status: 'skipped' })
            continue
          }
        }

        await processEmail(email, { current: i + 1, total: emails.length, labelIdMap, results, throttle: true })
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
        const beforeDate = cutoffDate.toISOString().slice(0, 10).replace(/-/g, '/')
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
