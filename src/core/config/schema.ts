import { z } from 'zod'

export const labelColorSchema = z.object({
  backgroundColor: z.string(),
  textColor: z.string(),
})

export const labelSchema = z.object({
  name: z.string(),
  description: z.string(),
  color: labelColorSchema,
  keywords: z.array(z.string()).optional(),
})

export const cleanupRuleSchema = z.object({
  label: z.string(),
  retentionDays: z.number().positive(),
})

export const emailFilterSchema = z.object({
  olderThan: z.number().positive().optional(),
  labels: z.array(z.string()).optional(),
  largerThan: z.string().optional(),
  from: z.string().optional(),
  subject: z.string().optional(),
  subjectRegex: z.instanceof(RegExp).optional(),
  snippetRegex: z.instanceof(RegExp).optional(),
  unread: z.boolean().optional(),
  read: z.boolean().optional(),
})

export const labelRuleSchema = emailFilterSchema.extend({
  labels: z.array(z.string()).min(1),
})

export const coreConfigSchema = z.object({
  labels: z.array(labelSchema).min(1),
  cleanupRules: z.array(cleanupRuleSchema).optional(),
  autoTrashRules: z.array(emailFilterSchema).optional(),
  labelRules: z.array(labelRuleSchema).optional(),
  classificationPrompt: z.string().optional(),
})

// Gmail access for this project.
// We intentionally keep this simple (no legacy OAuth tokens.json flow).
export const gmailProviderSchema = z.object({
  provider: z.literal('gog'),
  account: z.string().optional(),
  client: z.string().optional(),
})

export const configSchema = coreConfigSchema.extend({
  model: z.unknown(),
  gmail: gmailProviderSchema,
})

// Core config - provider-agnostic
export interface CoreConfig {
  labels: LabelConfig[]
  cleanupRules?: CleanupRule[]
  autoTrashRules?: EmailFilter[]
  labelRules?: LabelRule[]
  classificationPrompt?: string
}

// Full config with provider settings (used by CLI)
export interface GmailProviderConfig {
  provider: 'gog'
  account?: string
  client?: string
}

export interface Config<TModel = unknown> extends CoreConfig {
  model: TModel
  gmail: GmailProviderConfig
}

export type LabelConfig = z.infer<typeof labelSchema>
export type CleanupRule = z.infer<typeof cleanupRuleSchema>
export type EmailFilter = z.infer<typeof emailFilterSchema>
export type LabelRule = z.infer<typeof labelRuleSchema>
