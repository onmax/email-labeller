import { defineCommand } from 'citty'
import { consola } from 'consola'
import { createLabeller } from '../config.js'
import { loadConfig } from '../utils.js'

export default defineCommand({
  meta: { name: 'run', description: 'Process new emails and apply labels' },
  async run() {
    const config = await loadConfig()
    const labeller = createLabeller(config, (info) => {
      if (info.status === 'labeled')
        consola.success(`[${info.labels?.join(', ')}] ${info.email.subject.slice(0, 50)}`)
      else if (info.status === 'error')
        consola.error(`Failed: ${info.email.subject.slice(0, 40)}`, info.error)
    })

    consola.start('Checking labels...')
    const labelMap = await labeller.ensureLabels()
    consola.info(`${labelMap.size} labels ready`)

    consola.start('Processing emails...')
    const result = await labeller.processNewEmails()
    consola.success(`Done! Applied ${result.processed} labels`)
  },
})
