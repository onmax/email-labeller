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

export const configSchema = coreConfigSchema.extend({
  model: z.unknown(),
  gmail: z.object({ clientId: z.string(), clientSecret: z.string() }),
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
export interface Config<TModel = unknown> extends CoreConfig {
  model: TModel
  gmail: { clientId: string, clientSecret: string }
}

export type LabelConfig = z.infer<typeof labelSchema>
export type CleanupRule = z.infer<typeof cleanupRuleSchema>
export type EmailFilter = z.infer<typeof emailFilterSchema>
export type LabelRule = z.infer<typeof labelRuleSchema>
