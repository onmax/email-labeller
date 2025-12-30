import type { Config } from '@email-labeller/core'
import { createGmailProvider } from '@email-labeller/gmail'
import { loadTokens } from '../config.js'

interface RemoveOptions {
  olderThan?: number // days
  labels?: string[]
  largerThan?: string // e.g., "10mb", "5kb"
  from?: string
  unread?: boolean
  read?: boolean
  dryRun?: boolean
  limit?: number
}

function parseSize(size: string): number {
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)(kb|mb|gb)?$/)
  if (!match) return 0
  const [, num, unit] = match
  const multipliers: Record<string, number> = { kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 }
  return Math.floor(Number.parseFloat(num) * (multipliers[unit] || 1))
}

function parseArgs(args: string[]): RemoveOptions {
  const opts: RemoveOptions = { limit: 100 }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--older-than' && args[i + 1]) opts.olderThan = Number.parseInt(args[++i])
    else if (arg === '--label' && args[i + 1]) (opts.labels ??= []).push(args[++i])
    else if (arg === '--larger-than' && args[i + 1]) opts.largerThan = args[++i]
    else if (arg === '--from' && args[i + 1]) opts.from = args[++i]
    else if (arg === '--unread') opts.unread = true
    else if (arg === '--read') opts.read = true
    else if (arg === '--dry-run') opts.dryRun = true
    else if (arg === '--limit' && args[i + 1]) opts.limit = Number.parseInt(args[++i])
  }

  return opts
}

function buildQuery(opts: RemoveOptions): string {
  const parts: string[] = []

  if (opts.olderThan) {
    const date = new Date()
    date.setDate(date.getDate() - opts.olderThan)
    parts.push(`before:${date.toISOString().split('T')[0].replace(/-/g, '/')}`)
  }

  if (opts.labels?.length) {
    for (const label of opts.labels) {
      parts.push(`label:${label.replace(/\//g, '-').replace(/ /g, '-')}`)
    }
  }

  if (opts.largerThan) {
    const bytes = parseSize(opts.largerThan)
    if (bytes > 0) parts.push(`larger:${bytes}`)
  }

  if (opts.from) parts.push(`from:${opts.from}`)
  if (opts.unread) parts.push('is:unread')
  if (opts.read) parts.push('is:read')

  return parts.join(' ') || 'in:inbox'
}

export async function remove(config: Config, args: string[]) {
  const opts = parseArgs(args)

  if (args.includes('--help') || args.length === 0) {
    console.log(`
📧 Email Labeller - Remove

Usage: email-labeller remove [options]

Options:
  --older-than <days>    Emails older than N days
  --label <name>         Emails with label (repeatable)
  --larger-than <size>   Emails larger than size (e.g., 10mb, 500kb)
  --from <address>       Emails from address/domain
  --unread               Only unread emails
  --read                 Only read emails
  --limit <n>            Max emails to remove (default: 100)
  --dry-run              Preview without deleting

Examples:
  email-labeller remove --older-than 30 --label "Low Priority"
  email-labeller remove --larger-than 10mb --dry-run
  email-labeller remove --from newsletter@ --older-than 7
  email-labeller remove --label Security --older-than 14 --read
`)
    return
  }

  const tokens = loadTokens()
  if (!tokens) throw new Error('No tokens found. Run `email-labeller auth` first.')

  const provider = createGmailProvider({ clientId: config.gmail.clientId, clientSecret: config.gmail.clientSecret, tokens })
  const query = buildQuery(opts)

  console.log(`\n🗑️  Email Labeller - Remove\n`)
  console.log(`   Query: ${query}`)
  console.log(`   Limit: ${opts.limit}`)
  console.log(`   Mode: ${opts.dryRun ? 'DRY RUN (no deletion)' : 'DELETE'}\n`)

  const emails = await provider.getEmails({ maxResults: opts.limit, query })
  console.log(`   Found: ${emails.length} emails\n`)

  if (emails.length === 0) {
    console.log('   No emails match the criteria.\n')
    return
  }

  let deleted = 0
  for (const email of emails) {
    const preview = `${email.from?.slice(0, 30)} | ${email.subject?.slice(0, 40)}`
    if (opts.dryRun) {
      console.log(`   [DRY] ${preview}`)
    }
    else {
      await provider.trashEmail(email.id)
      console.log(`   🗑️  ${preview}`)
      deleted++
    }
  }

  console.log(`\n✅ ${opts.dryRun ? 'Would delete' : 'Deleted'}: ${opts.dryRun ? emails.length : deleted} emails\n`)
}
