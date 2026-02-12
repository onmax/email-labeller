import type { EmailProvider } from '../../core/interfaces/email-provider.js'
import type { EmailSummary, GetEmailsOptions, LabelDefinition } from '../../core/types/index.js'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { ProviderError } from '../../core/errors.js'

const execFileAsync = promisify(execFile)

export interface GogGmailProviderConfig {
  account?: string
  client?: string
  /**
   * Path to gog binary.
   * Defaults to `gog` (must be in PATH).
   */
  bin?: string
}

function wrapError(operation: string, err: unknown): never {
  throw new ProviderError(`Gog Gmail ${operation} failed`, 'gog-gmail', err instanceof Error ? err : new Error(String(err)))
}

function safeJsonParse<T>(s: string): T {
  try {
    return JSON.parse(s) as T
  }
  catch (err) {
    throw new Error(`Failed to parse JSON output: ${(err as Error).message}\n---\n${s.slice(0, 2000)}`)
  }
}

function extractLabels(data: any): Array<{ id?: string, name?: string }> {
  // gog may return { labels: [...] } or just [...]
  const raw = Array.isArray(data) ? data : (data?.labels || data?.data?.labels || [])
  if (!Array.isArray(raw))
    return []
  return raw
}

function extractMessages(data: any): Array<{ id?: string, threadId?: string }> {
  // `messages search` may return { messages: [...] } or { items: [...] } or [...]
  const raw = Array.isArray(data) ? data : (data?.messages || data?.items || data?.data?.messages || [])
  if (!Array.isArray(raw))
    return []
  return raw
}

export function createGogGmailProvider(config: GogGmailProviderConfig = {}): EmailProvider {
  const bin = config.bin || 'gog'

  async function runGog(args: string[]): Promise<any> {
    const fullArgs = [...args]

    // global flags
    if (config.account)
      fullArgs.push('--account', config.account)
    if (config.client)
      fullArgs.push('--client', config.client)

    fullArgs.push('--json', '--no-input')

    try {
      const { stdout } = await execFileAsync(bin, fullArgs, { maxBuffer: 50 * 1024 * 1024 })
      return safeJsonParse(stdout)
    }
    catch (err) {
      wrapError(`exec: ${bin} ${fullArgs.join(' ')}`, err)
    }
  }

  async function listLabelsRaw() {
    return runGog(['gmail', 'labels', 'list'])
  }

  async function getMessageMetadata(messageId: string) {
    return runGog(['gmail', 'get', messageId, '--format', 'metadata', '--headers', 'Subject,From,Date'])
  }

  async function getMessageMinimal(messageId: string) {
    // default format=full; but we only need labelIds + threadId.
    return runGog(['gmail', 'get', messageId, '--format', 'metadata'])
  }

  return {
    name: 'gog-gmail',

    async isAuthenticated() {
      // Best-effort: if we can list labels, we're authenticated.
      try {
        await listLabelsRaw()
        return true
      }
      catch {
        return false
      }
    },

    async authenticate() {
      // gog manages auth externally.
      // We keep this to satisfy the interface.
      return
    },

    async listLabels() {
      try {
        const data = await listLabelsRaw()
        const labels = extractLabels(data)
        return labels
          .map(l => ({ name: l.name || '', providerId: l.id || '' }))
          .filter(l => l.name && l.providerId)
      }
      catch (err) { wrapError('listLabels', err) }
    },

    async ensureLabelsExist(labels: LabelDefinition[]) {
      try {
        const existingData = await listLabelsRaw()
        const existing = extractLabels(existingData)

        const labelMap = new Map<string, string>()

        for (const label of labels) {
          const found = existing.find(l => l?.name === label.name)
          if (found?.id) {
            labelMap.set(label.name, found.id)
            continue
          }

          // Create (gog doesn't support label colors at creation time)
          const created = await runGog(['gmail', 'labels', 'create', label.name])

          const createdId = created?.id || created?.label?.id
          if (typeof createdId === 'string' && createdId.length > 0) {
            labelMap.set(label.name, createdId)
            continue
          }

          // Fallback: re-list
          const againData = await listLabelsRaw()
          const again = extractLabels(againData)
          const againFound = again.find(l => l?.name === label.name)
          if (againFound?.id)
            labelMap.set(label.name, againFound.id)
        }

        return labelMap
      }
      catch (err) { wrapError('ensureLabelsExist', err) }
    },

    async applyLabel(emailId: string, labelId: string) {
      try {
        await runGog(['gmail', 'batch', 'modify', emailId, '--add', labelId])
      }
      catch (err) { wrapError('applyLabel', err) }
    },

    async removeLabel(emailId: string, labelId: string) {
      try {
        await runGog(['gmail', 'batch', 'modify', emailId, '--remove', labelId])
      }
      catch (err) { wrapError('removeLabel', err) }
    },

    async getEmails(options: GetEmailsOptions) {
      try {
        const { maxResults = 50, query, excludeLabels = [] } = options

        let q = query || 'in:inbox -label:SENT'
        if (excludeLabels.length)
          q += ` ${excludeLabels.map(l => `-label:${l.replace(/ /g, '-')}`).join(' ')}`

        const res = await runGog(['gmail', 'messages', 'search', q, '--max', String(maxResults)])
        const msgs = extractMessages(res)

        const emails: EmailSummary[] = []
        for (const msg of msgs) {
          if (!msg?.id)
            continue

          const full = await getMessageMetadata(msg.id)
          const headers: Array<{ name?: string, value?: string }> = full?.payload?.headers || full?.data?.payload?.headers || []

          const subject = headers.find(h => h.name === 'Subject')?.value || '(no subject)'
          const from = headers.find(h => h.name === 'From')?.value || ''
          const date = headers.find(h => h.name === 'Date')?.value || ''
          const snippet = full?.snippet || full?.data?.snippet || ''
          const threadId = full?.threadId || full?.data?.threadId || msg.threadId || ''

          emails.push({
            id: msg.id,
            threadId,
            subject,
            from,
            snippet,
            date,
          })

          if (emails.length >= maxResults)
            break
        }

        return emails
      }
      catch (err) { wrapError('getEmails', err) }
    },

    async hasLabels(emailId: string, labelIds: string[]) {
      try {
        const msg = await getMessageMinimal(emailId)
        const ids: string[] = msg?.labelIds || msg?.data?.labelIds || []
        const set = new Set(ids)
        return labelIds.some(id => set.has(id))
      }
      catch (err) { wrapError('hasLabels', err) }
    },

    async trashEmail(emailId: string) {
      try {
        // Move to Trash by applying TRASH and removing INBOX.
        // (gog currently exposes delete, but that's permanent.)
        await runGog(['gmail', 'batch', 'modify', emailId, '--add', 'TRASH', '--remove', 'INBOX'])
      }
      catch (err) { wrapError('trashEmail', err) }
    },
  }
}
