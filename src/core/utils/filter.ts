import type { EmailFilter, LabelRule } from '../config/schema.js'
import type { EmailSummary } from '../types/email.js'

export function matchesFilter(email: EmailSummary, filter: EmailFilter): boolean {
  if (filter.from) {
    const pattern = filter.from.toLowerCase()
    const from = email.from.toLowerCase()
    if (pattern.startsWith('*@')) {
      if (!from.includes(pattern.slice(1)))
        return false
    }
    else if (!from.includes(pattern)) {
      return false
    }
  }

  if (filter.subject) {
    if (!email.subject.toLowerCase().includes(filter.subject.toLowerCase()))
      return false
  }

  if (filter.subjectRegex && !filter.subjectRegex.test(email.subject))
    return false
  if (filter.snippetRegex && !filter.snippetRegex.test(email.snippet))
    return false

  return true
}

export function findMatchingRule(email: EmailSummary, rules?: LabelRule[]): LabelRule | undefined {
  if (!rules?.length)
    return undefined
  return rules.find(rule => matchesFilter(email, rule))
}
