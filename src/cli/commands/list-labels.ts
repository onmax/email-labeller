import { defineCommand } from 'citty'
import { consola } from 'consola'
import { createEmailProvider } from '../config.js'
import { loadConfig } from '../utils.js'

const SYSTEM_LABELS = ['INBOX', 'SENT', 'DRAFT', 'TRASH', 'SPAM', 'STARRED', 'UNREAD', 'IMPORTANT', 'CHAT', 'YELLOW_STAR']

export default defineCommand({
  meta: { name: 'labels', description: 'List all Gmail labels' },
  async run() {
    const config = await loadConfig()
    const emailProvider = createEmailProvider(config)
    const labels = await emailProvider.listLabels()
    const userLabels = labels.filter(l => !l.name.startsWith('CATEGORY_') && !SYSTEM_LABELS.includes(l.name))

    consola.info('Your Gmail Labels:')
    for (const label of userLabels.sort((a, b) => a.name.localeCompare(b.name))) {
      consola.log(`  ${label.name}`)
    }
    consola.info(`Total: ${userLabels.length} labels`)
  },
})
