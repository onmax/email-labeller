import type { Config } from '@email-labeller/core'
import { createAIClassifier } from '@email-labeller/ai-sdk'
import { createEmailLabeller, createFileStateStore } from '@email-labeller/core'
import { createGmailProvider } from '@email-labeller/gmail'
import { getStatePath, loadTokens } from '../config.js'

export async function cleanup(config: Config) {
  console.log('\n🧹 Email Cleanup\n')

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
  })

  const result = await labeller.cleanup()

  for (const [label, count] of Object.entries(result.byLabel)) {
    if (count > 0)
      console.log(`   ${label}: trashed ${count} emails`)
  }

  console.log(`\n🧹 Done! Trashed ${result.deleted} emails total\n`)
}
