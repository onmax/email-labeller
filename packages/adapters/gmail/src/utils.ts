import type { EmailFilter } from '@email-labeller/core'

export function parseSize(size: string): number {
  if (!size || typeof size !== 'string')
    return 0
  const match = size.toLowerCase().trim().match(/^(\d+(?:\.\d+)?)\s*(kb|mb|gb)?$/)
  if (!match?.[1])
    return 0
  const num = Number.parseFloat(match[1])
  if (Number.isNaN(num) || num < 0)
    return 0
  const multipliers: Record<string, number> = { kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 }
  const unit = match[2]
  return Math.floor(num * (unit ? (multipliers[unit] ?? 1) : 1))
}

export function buildGmailQuery(filter: EmailFilter): string {
  const parts: string[] = []

  if (filter.olderThan) {
    const date = new Date()
    date.setDate(date.getDate() - filter.olderThan)
    parts.push(`before:${date.toISOString().slice(0, 10).replace(/-/g, '/')}`)
  }

  if (filter.labels?.length) {
    for (const label of filter.labels)
      parts.push(`label:${label.replace(/\//g, '-').replace(/ /g, '-')}`)
  }

  if (filter.largerThan) {
    const bytes = parseSize(filter.largerThan)
    if (bytes > 0)
      parts.push(`larger:${bytes}`)
  }

  if (filter.from)
    parts.push(`from:${filter.from}`)
  if (filter.subject)
    parts.push(`subject:${filter.subject}`)
  if (filter.unread)
    parts.push('is:unread')
  if (filter.read)
    parts.push('is:read')

  return parts.join(' ') || 'in:inbox'
}
