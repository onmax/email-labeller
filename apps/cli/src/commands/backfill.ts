import type { Config } from '@email-labeller/core'
import { createAIClassifier } from '@email-labeller/ai-sdk'
import { createEmailLabeller, createFileStateStore } from '@email-labeller/core'
import { createGmailProvider } from '@email-labeller/gmail'
import { getStatePath, loadTokens } from '../config.js'

export async function backfill(config: Config, args: string[] = []) {
  const FORCE = args.includes('--force')
  const QUERY = args.find(a => !a.startsWith('--')) || 'in:inbox -label:SENT'
  const BATCH_SIZE = 250

  console.log(`\n📧 Email Labeller - Backfill\n`)
  console.log(`   Query: ${QUERY}`)
  console.log(`   Batch: ${BATCH_SIZE}`)
  console.log(`   Force: ${FORCE}\n`)

  const tokens = loadTokens()
  if (!tokens)
    throw new Error('No tokens found. Run `email-labeller auth` first.')

  let labeled = 0
  let skipped = 0

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
      const progress = `[${info.current}/${info.total}]`
      if (info.status === 'labeled') {
        console.log(`${progress} ✅ [${info.label}] ${info.email.subject.slice(0, 40)}`)
        labeled++
      }
      else if (info.status === 'skipped') {
        console.log(`${progress} ⏭️  Already labeled: ${info.email.subject.slice(0, 40)}`)
        skipped++
      }
      else if (info.status === 'error') {
        console.error(`${progress} ❌ Failed: ${info.email.subject.slice(0, 40)}`, info.error)
      }
    },
  })

  console.log('📋 Checking labels...')
  const labelMap = await labeller.ensureLabels()
  console.log(`   ${labelMap.size} labels ready\n`)

  console.log('🤖 Classifying and labeling...\n')
  await labeller.backfill({ maxResults: BATCH_SIZE, query: QUERY, force: FORCE })
  console.log(`\n✅ Done! Labeled: ${labeled}, Skipped: ${skipped}\n`)
}
