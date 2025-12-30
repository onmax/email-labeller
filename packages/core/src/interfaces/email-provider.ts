import type { AppliedLabel, EmailSummary, GetEmailsOptions, LabelDefinition } from '../types/index.js'

export interface EmailProvider {
  readonly name: string

  isAuthenticated: () => Promise<boolean>
  getAuthUrl?: () => string
  authenticate: (credentials: unknown) => Promise<void>

  listLabels: () => Promise<AppliedLabel[]>
  ensureLabelsExist: (labels: LabelDefinition[]) => Promise<Map<string, string>>
  applyLabel: (emailId: string, labelId: string) => Promise<void>
  removeLabel: (emailId: string, labelId: string) => Promise<void>

  getEmails: (options: GetEmailsOptions) => Promise<EmailSummary[]>
  hasLabels: (emailId: string, labelIds: string[]) => Promise<boolean>
  trashEmail: (emailId: string) => Promise<void>
}
