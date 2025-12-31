import type { OAuth2Client } from 'google-auth-library'
import type { gmail_v1 } from 'googleapis'
import type { EmailProvider, EmailSummary, GetEmailsOptions, LabelDefinition } from '../../core/index.js'
import { google } from 'googleapis'
import { ProviderError } from '../../core/index.js'

export interface GmailTokens {
  access_token: string
  refresh_token: string
  expiry_date: number
}

export interface GmailProviderConfig {
  clientId: string
  clientSecret: string
  redirectUri?: string
  tokens?: GmailTokens
  scopes?: string[]
}

const DEFAULT_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.modify',
]

function wrapError(err: unknown, operation: string): never {
  throw new ProviderError(`Gmail ${operation} failed`, 'gmail', err instanceof Error ? err : new Error(String(err)))
}

export function createGmailProvider(config: GmailProviderConfig): EmailProvider & { oauth2Client: OAuth2Client, gmail: gmail_v1.Gmail } {
  const { clientId, clientSecret, redirectUri = 'http://localhost:3000/callback', tokens, scopes = DEFAULT_SCOPES } = config

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
  if (tokens)
    oauth2Client.setCredentials(tokens)

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  return {
    name: 'gmail',
    oauth2Client,
    gmail,

    async isAuthenticated() {
      try {
        const creds = oauth2Client.credentials
        return !!(creds.access_token || creds.refresh_token)
      }
      catch { return false }
    },

    getAuthUrl() {
      return oauth2Client.generateAuthUrl({ access_type: 'offline', scope: scopes, prompt: 'consent' })
    },

    async authenticate(credentials: unknown) {
      oauth2Client.setCredentials(credentials as GmailTokens)
    },

    async listLabels() {
      try {
        const res = await gmail.users.labels.list({ userId: 'me' })
        return (res.data.labels || []).map(l => ({ name: l.name || '', providerId: l.id || '' }))
      }
      catch (err) { wrapError(err, 'listLabels') }
    },

    async ensureLabelsExist(labels: LabelDefinition[]) {
      try {
        const existing = await gmail.users.labels.list({ userId: 'me' })
        const existingLabels = existing.data.labels || []
        const labelMap = new Map<string, string>()

        for (const label of labels) {
          const found = existingLabels.find(l => l.name === label.name)
          if (found?.id) {
            labelMap.set(label.name, found.id)
          }
          else {
            const created = await gmail.users.labels.create({
              userId: 'me',
              requestBody: { name: label.name, labelListVisibility: 'labelShow', messageListVisibility: 'show', color: label.color },
            })
            if (created.data.id)
              labelMap.set(label.name, created.data.id)
          }
        }
        return labelMap
      }
      catch (err) { wrapError(err, 'ensureLabelsExist') }
    },

    async applyLabel(emailId: string, labelId: string) {
      try {
        await gmail.users.messages.modify({ userId: 'me', id: emailId, requestBody: { addLabelIds: [labelId] } })
      }
      catch (err) { wrapError(err, 'applyLabel') }
    },

    async removeLabel(emailId: string, labelId: string) {
      try {
        await gmail.users.messages.modify({ userId: 'me', id: emailId, requestBody: { removeLabelIds: [labelId] } })
      }
      catch (err) { wrapError(err, 'removeLabel') }
    },

    async getEmails(options: GetEmailsOptions) {
      try {
        const { maxResults = 50, query, excludeLabels = [], pageToken } = options
        let q = query || 'in:inbox -label:SENT'
        if (excludeLabels.length)
          q += ` ${excludeLabels.map(l => `-label:${l.replace(/ /g, '-')}`).join(' ')}`

        const emails: EmailSummary[] = []
        let nextPageToken: string | undefined = pageToken

        while (emails.length < maxResults) {
          const res = await gmail.users.messages.list({ userId: 'me', maxResults: Math.min(100, maxResults - emails.length), pageToken: nextPageToken, q })
          if (!res.data.messages)
            break

          for (const msg of res.data.messages) {
            if (!msg.id || emails.length >= maxResults)
              continue
            const full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'metadata', metadataHeaders: ['Subject', 'From', 'Date'] })
            const headers = full.data.payload?.headers || []
            emails.push({
              id: msg.id,
              threadId: msg.threadId || '',
              subject: headers.find(h => h.name === 'Subject')?.value || '(no subject)',
              from: headers.find(h => h.name === 'From')?.value || '',
              snippet: full.data.snippet || '',
              date: headers.find(h => h.name === 'Date')?.value || '',
            })
          }

          nextPageToken = res.data.nextPageToken ?? undefined
          if (!nextPageToken)
            break
        }
        return emails
      }
      catch (err) { wrapError(err, 'getEmails') }
    },

    async hasLabels(emailId: string, labelIds: string[]) {
      try {
        const msg = await gmail.users.messages.get({ userId: 'me', id: emailId, format: 'minimal' })
        const msgLabelIds = new Set(msg.data.labelIds || [])
        return labelIds.some(id => msgLabelIds.has(id))
      }
      catch (err) { wrapError(err, 'hasLabels') }
    },

    async trashEmail(emailId: string) {
      try {
        await gmail.users.messages.trash({ userId: 'me', id: emailId })
      }
      catch (err) { wrapError(err, 'trashEmail') }
    },
  }
}
