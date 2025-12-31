import { defineCommand } from 'citty'
import { consola } from 'consola'
import { createLabeller } from '../config.js'
import { loadConfig } from '../utils.js'

export default defineCommand({
  meta: { name: 'cleanup', description: 'Clean up old emails based on retention rules' },
  async run() {
    const config = await loadConfig()
    const labeller = createLabeller(config)

    consola.start('Running cleanup...')
    const result = await labeller.cleanup()

    for (const [label, count] of Object.entries(result.byLabel)) {
      if (count > 0)
        consola.info(`${label}: trashed ${count} emails`)
    }

    consola.success(`Done! Trashed ${result.deleted} emails total`)
  },
})
