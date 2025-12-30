import type { Config, EmailSummary } from '@email-labeller/core'
import { createGmailProvider } from '@email-labeller/gmail'
import { generateObject } from 'ai'
import { readFileSync } from 'node:fs'
import { z } from 'zod'
import { getTokensPath } from '../config.js'

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

export async function suggest(config: Config, args: string[]) {
  const maxEmails = Number.parseInt(args.find(a => a.startsWith('--max='))?.split('=')[1] || '200')

  console.log('\n🔍 Email Labeller - Config Suggestion\n')

  const tokens = JSON.parse(readFileSync(getTokensPath(), 'utf-8'))
  const emailProvider = createGmailProvider({ clientId: config.gmail.clientId, clientSecret: config.gmail.clientSecret, tokens })

  console.log(`📧 Fetching last ${maxEmails} emails...`)
  const emails = await emailProvider.getEmails({ maxResults: maxEmails, query: 'in:inbox' })
  console.log(`   Found ${emails.length} emails\n`)

  console.log('🤖 Analyzing email patterns...\n')

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

  const result = await generateObject({
    model: config.model,
    schema: SuggestedConfigSchema,
    prompt,
  })

  console.log('📋 Suggested Configuration:\n')
  console.log('```typescript')
  console.log(`labels: [`)
  for (const label of result.object.labels) {
    console.log(`  { name: '${label.name}', color: { backgroundColor: '${label.color.backgroundColor}', textColor: '${label.color.textColor}' }, description: '${label.description}' },`)
  }
  console.log(`],\n`)
  console.log(`cleanupRules: [`)
  for (const rule of result.object.cleanupRules) {
    console.log(`  { label: '${rule.label}', retentionDays: ${rule.retentionDays} },`)
  }
  console.log(`],\n`)
  console.log(`classificationPrompt: \`${result.object.classificationPrompt}\`,`)
  console.log('```\n')

  console.log('💡 Copy the above into your email-labeller.config.ts\n')
}
