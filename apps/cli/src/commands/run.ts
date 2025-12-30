import type { Config } from '@email-labeller/core'
import { createAIClassifier } from '@email-labeller/ai-sdk'
import { createEmailLabeller, createFileStateStore } from '@email-labeller/core'
import { createGmailProvider } from '@email-labeller/gmail'
import { getStatePath, loadTokens } from '../config.js'

export async function run(config: Config) {
  console.log(`\n📧 Email Labeller - ${new Date().toISOString()}\n`)

  const tokens = loadTokens()
  if (!tokens)
    throw new Error('No tokens found. Run `email-labeller auth` first.')

  const labeller = createEmailLabeller({
    emailProvider: createGmailProvider({
      clientId: config.gmail.clientId,
      clientSecret: config.gmail.clientSecret,
      tokens,
    }),
    aiClassifier: createAIClassifier({ model: config.model }),
    stateStore: createFileStateStore({ path: getStatePath() }),
    config,
    onProgress: (info) => {
      if (info.status === 'labeled')
        console.log(`  [${info.labels?.join(', ')}] ${info.email.subject.slice(0, 50)}`)
      else if (info.status === 'error')
        console.error(`  ❌ Failed: ${info.email.subject.slice(0, 40)}`, info.error)
    },
  })

  console.log('📋 Checking labels...')
  const labelMap = await labeller.ensureLabels()
  console.log(`   ${labelMap.size} labels ready\n`)

  console.log('🤖 Processing emails...')
  const result = await labeller.processNewEmails()
  console.log(`\n✅ Done! Applied ${result.processed} labels\n`)
}
