import type { EmailSummary } from '../../core/index.js'
import { readFileSync } from 'node:fs'
import { generateObject } from 'ai'
import { defineCommand } from 'citty'
import { consola } from 'consola'
import { z } from 'zod'
import { createGmailProvider } from '../../adapters/gmail/index.js'
import { getTokensPath } from '../config.js'
import { loadConfig } from '../utils.js'

const SuggestedConfigSchema = z.object({
  labels: z.array(z.object({
    name: z.string().describe('Short, clear label name (1-2 words)'),
    description: z.string().describe('Brief description of what emails belong here'),
    color: z.object({
      backgroundColor: z.string().describe('Hex color for label background'),
      textColor: z.string().describe('Hex color for text, either #000000 or #ffffff'),
    }),
  })).describe('5-8 distinct labels covering the email patterns'),
  cleanupRules: z.array(z.object({
    label: z.string().describe('Label name to apply cleanup to'),
    retentionDays: z.number().describe('Days to keep emails before trashing'),
  })).describe('Rules for auto-deleting transient emails'),
  classificationPrompt: z.string().describe('Concise prompt explaining how to classify emails into the labels'),
})

function summarizeEmails(emails: EmailSummary[]): string {
  return emails.map((e, i) => `${i + 1}. From: ${e.from}\n   Subject: ${e.subject}\n   Preview: ${e.snippet?.slice(0, 100)}`).join('\n\n')
}

export default defineCommand({
  meta: { name: 'suggest', description: 'Suggest label configuration based on email patterns' },
  args: {
    max: { type: 'string', description: 'Max emails to analyze', default: '200' },
  },
  async run({ args }) {
    const config = await loadConfig()
    const maxEmails = Number.parseInt(args.max)

    const tokens = JSON.parse(readFileSync(getTokensPath(), 'utf-8'))
    const emailProvider = createGmailProvider({ clientId: config.gmail.clientId, clientSecret: config.gmail.clientSecret, tokens })

    consola.start(`Fetching last ${maxEmails} emails...`)
    const emails = await emailProvider.getEmails({ maxResults: maxEmails, query: 'in:inbox' })
    consola.info(`Found ${emails.length} emails`)

    consola.start('Analyzing email patterns...')

    const prompt = `Analyze these ${emails.length} emails and suggest an optimal configuration for automatic email labeling.

Goals:
- Create 5-8 distinct labels that cover all email types
- Labels should be mutually exclusive (each email fits one label)
- Include a "Low Priority" label for marketing/promotional emails
- Suggest cleanup rules for transient emails (2FA codes, promotions, etc.)
- Write a concise classification prompt

Email samples:
${summarizeEmails(emails)}

Generate a minimal, practical configuration.`

    const result = await generateObject({ model: config.model, schema: SuggestedConfigSchema, prompt })

    consola.info('Suggested Configuration:')
    consola.log('```typescript')
    consola.log(`labels: [`)
    for (const label of result.object.labels) {
      consola.log(`  { name: '${label.name}', color: { backgroundColor: '${label.color.backgroundColor}', textColor: '${label.color.textColor}' }, description: '${label.description}' },`)
    }
    consola.log(`],\n`)
    consola.log(`cleanupRules: [`)
    for (const rule of result.object.cleanupRules) {
      consola.log(`  { label: '${rule.label}', retentionDays: ${rule.retentionDays} },`)
    }
    consola.log(`],\n`)
    consola.log(`classificationPrompt: \`${result.object.classificationPrompt}\`,`)
    consola.log('```')

    consola.success('Copy the above into your email-labeller.config.ts')
  },
})
