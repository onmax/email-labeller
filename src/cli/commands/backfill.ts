import { defineCommand } from 'citty'
import { consola } from 'consola'
import { createLabeller } from '../config.js'
import { loadConfig } from '../utils.js'

export default defineCommand({
  meta: { name: 'backfill', description: 'Backfill labels for existing emails' },
  args: {
    query: { type: 'positional', description: 'Gmail query filter', default: 'in:inbox -label:SENT' },
    force: { type: 'boolean', description: 'Re-label already labeled emails' },
    batch: { type: 'string', description: 'Batch size', default: '250' },
  },
  async run({ args }) {
    const config = await loadConfig()
    const batchSize = Number.parseInt(args.batch)
    consola.info(`Query: ${args.query}`)
    consola.info(`Batch: ${batchSize}`)
    consola.info(`Force: ${args.force}`)

    let labeled = 0
    let skipped = 0

    const labeller = createLabeller(config, (info) => {
      const progress = `[${info.current}/${info.total}]`
      if (info.status === 'labeled') {
        consola.success(`${progress} [${info.labels?.join(', ')}] ${info.email.subject.slice(0, 40)}`)
        labeled++
      }
      else if (info.status === 'skipped') {
        consola.log(`${progress} Skipped: ${info.email.subject.slice(0, 40)}`)
        skipped++
      }
      else if (info.status === 'error') {
        consola.error(`${progress} Failed: ${info.email.subject.slice(0, 40)}`, info.error)
      }
    })

    consola.start('Checking labels...')
    const labelMap = await labeller.ensureLabels()
    consola.info(`${labelMap.size} labels ready`)

    consola.start('Classifying and labeling...')
    await labeller.backfill({ maxResults: batchSize, query: args.query, force: args.force })
    consola.success(`Done! Labeled: ${labeled}, Skipped: ${skipped}`)
  },
})
