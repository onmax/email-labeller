import type { AIClassifier, ClassificationResult, EmailSummary, LabelDefinition } from '@email-labeller/core'
import { generateObject } from 'ai'
import { z } from 'zod'

export interface AIClassifierConfig {
  model: Parameters<typeof generateObject>[0]['model']
  temperature?: number
}

function buildPrompt(email: EmailSummary, labels: LabelDefinition[], systemPrompt?: string): string {
  const labelDescriptions = labels.map(l => `- ${l.name}: ${l.description}`).join('\n')

  const basePrompt = `You are an email classifier. Given an email's subject, sender, and snippet, classify it into exactly ONE of these categories:

${labelDescriptions}

Rules:
- Return ONLY the label name in the "label" field
- If unsure, use "Low Priority"
- Be precise and consistent
`

  const fullPrompt = systemPrompt ? `${basePrompt}\n\nAdditional rules:\n${systemPrompt}` : basePrompt

  return `${fullPrompt}

Email:
From: ${email.from}
Subject: ${email.subject}
Preview: ${email.snippet}

Classify this email.`
}

export function createAIClassifier(config: AIClassifierConfig): AIClassifier {
  const { model, temperature = 0.3 } = config

  return {
    name: 'ai-sdk',

    async classify(email: EmailSummary, labels: LabelDefinition[], systemPrompt?: string): Promise<ClassificationResult> {
      const labelNames = labels.map(l => l.name)

      const schema = z.object({
        label: z.enum(labelNames as [string, ...string[]]),
        confidence: z.number().min(0).max(1).optional(),
        reasoning: z.string().optional(),
      })

      const result = await generateObject({
        model,
        schema,
        prompt: buildPrompt(email, labels, systemPrompt),
        temperature,
      })

      return {
        label: result.object.label,
        confidence: result.object.confidence,
        reasoning: result.object.reasoning,
      }
    },

    async classifyBatch(emails: EmailSummary[], labels: LabelDefinition[], systemPrompt?: string): Promise<Map<string, ClassificationResult>> {
      const results = new Map<string, ClassificationResult>()
      for (const email of emails) {
        try {
          const result = await this.classify(email, labels, systemPrompt)
          results.set(email.id, result)
        }
        catch (err) {
          console.error(`Failed to classify: ${email.subject}`, err)
          results.set(email.id, { label: 'Low Priority' })
        }
      }
      return results
    },
  }
}
