import type { LanguageModelV1 } from 'ai'
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

// Runtime config type (not Zod - model is a runtime object)
export interface Config {
  model: LanguageModelV1
  gmail: { clientId: string, clientSecret: string }
  labels: Array<{ name: string, description: string, color: { backgroundColor: string, textColor: string }, keywords?: string[] }>
  cleanupRules?: Array<{ label: string, retentionDays: number }>
  classificationPrompt?: string
}

export type LabelConfig = z.infer<typeof labelSchema>
export type CleanupRule = z.infer<typeof cleanupRuleSchema>
