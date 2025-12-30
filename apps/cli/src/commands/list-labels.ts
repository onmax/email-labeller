import type { Config } from '@email-labeller/core'
import { createGmailProvider } from '@email-labeller/gmail'
import { loadTokens } from '../config.js'

const SYSTEM_LABELS = ['INBOX', 'SENT', 'DRAFT', 'TRASH', 'SPAM', 'STARRED', 'UNREAD', 'IMPORTANT', 'CHAT', 'YELLOW_STAR']

export async function listLabels(config: Config) {
  const tokens = loadTokens()
  if (!tokens)
    throw new Error('No tokens found. Run `email-labeller auth` first.')

  const emailProvider = createGmailProvider({ clientId: config.gmail.clientId, clientSecret: config.gmail.clientSecret, tokens })

  const labels = await emailProvider.listLabels()
  const userLabels = labels.filter(l => !l.name.startsWith('CATEGORY_') && !SYSTEM_LABELS.includes(l.name))

  console.log('\n📋 Your Gmail Labels:\n')
  for (const label of userLabels.sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`  ${label.name}`)
  }
  console.log(`\n   Total: ${userLabels.length} labels\n`)
}
