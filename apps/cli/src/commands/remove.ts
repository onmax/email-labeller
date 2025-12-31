import type { EmailFilter } from '@email-labeller/core'
import { AuthError } from '@email-labeller/core'
import { buildGmailQuery, createGmailProvider } from '@email-labeller/gmail'
import { defineCommand } from 'citty'
import { consola } from 'consola'
import { loadTokens } from '../config.js'
import { loadConfig } from '../utils.js'

export default defineCommand({
  meta: { name: 'remove', description: 'Remove emails matching filters' },
  args: {
    'older-than': { type: 'string', description: 'Emails older than N days' },
    'label': { type: 'string', description: 'Emails with label (comma-separated for multiple)' },
    'larger-than': { type: 'string', description: 'Emails larger than size (e.g., 10mb, 500kb)' },
    'from': { type: 'string', description: 'Emails from address/domain' },
    'subject': { type: 'string', description: 'Subject contains text' },
    'unread': { type: 'boolean', description: 'Only unread emails' },
    'read': { type: 'boolean', description: 'Only read emails' },
    'limit': { type: 'string', description: 'Max emails to remove', default: '100' },
    'dry-run': { type: 'boolean', description: 'Preview without deleting' },
  },
  async run({ args }) {
    const config = await loadConfig()
    const tokens = loadTokens()
    if (!tokens)
      throw new AuthError('No tokens found. Run `email-labeller auth` first.')

    const filter: EmailFilter = {}
    if (args['older-than'])
      filter.olderThan = Number.parseInt(args['older-than'])
    if (args.label)
      filter.labels = args.label.split(',').map(l => l.trim())
    if (args['larger-than'])
      filter.largerThan = args['larger-than']
    if (args.from)
      filter.from = args.from
    if (args.subject)
      filter.subject = args.subject
    if (args.unread)
      filter.unread = true
    if (args.read)
      filter.read = true

    const limit = Number.parseInt(args.limit)
    const provider = createGmailProvider({ clientId: config.gmail.clientId, clientSecret: config.gmail.clientSecret, tokens })
    const query = buildGmailQuery(filter)

    consola.info(`Query: ${query}`)
    consola.info(`Limit: ${limit}`)
    consola.info(`Mode: ${args['dry-run'] ? 'DRY RUN' : 'DELETE'}`)

    const emails = await provider.getEmails({ maxResults: limit, query })
    consola.info(`Found: ${emails.length} emails`)

    if (emails.length === 0) {
      consola.warn('No emails match the criteria.')
      return
    }

    let deleted = 0
    for (const email of emails) {
      const preview = `${email.from?.slice(0, 30)} | ${email.subject?.slice(0, 40)}`
      if (args['dry-run']) {
        consola.log(`  [DRY] ${preview}`)
      }
      else {
        await provider.trashEmail(email.id)
        consola.success(`  ${preview}`)
        deleted++
      }
    }

    consola.success(`${args['dry-run'] ? 'Would delete' : 'Deleted'}: ${args['dry-run'] ? emails.length : deleted} emails`)
  },
})
