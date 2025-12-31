import type { AIClassifier, ClassificationResult, EmailSummary, LabelDefinition } from '@email-labeller/core'
import { ClassificationError } from '@email-labeller/core'
import { generateObject } from 'ai'
import { z } from 'zod'

export interface AIClassifierConfig {
  model: Parameters<typeof generateObject>[0]['model']
  temperature?: number
}

function buildPrompt(email: EmailSummary, labels: LabelDefinition[], systemPrompt?: string): string {
  const labelDescriptions = labels.map(l => `- ${l.name}: ${l.description}`).join('\n')

  const basePrompt = `You are an email classifier. Given an email's subject, sender, and snippet, classify it into ONE OR MORE of these categories:

${labelDescriptions}

Rules:
- Return 1-3 labels that best describe this email
- Use hierarchical labels when applicable (e.g., "GitHub/Nuxt" is more specific than "GitHub")
- First label should be the most specific/relevant
- If unsure, use "Low Priority"
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
  const { model, temperature } = config

  return {
    name: 'ai-sdk',

    async classify(email: EmailSummary, labels: LabelDefinition[], systemPrompt?: string): Promise<ClassificationResult> {
      try {
        const labelNames = labels.map(l => l.name)

        const schema = z.object({
          labels: z.array(z.enum(labelNames as [string, ...string[]])).min(1).max(3).describe('1-3 labels, most specific first'),
          confidence: z.number().min(0).max(1).optional(),
          reasoning: z.string().optional(),
        })

        const result = await generateObject({
          model,
          schema,
          prompt: buildPrompt(email, labels, systemPrompt),
          ...(temperature !== undefined && { temperature }),
        })

        return {
          labels: result.object.labels,
          confidence: result.object.confidence,
          reasoning: result.object.reasoning,
        }
      }
      catch (err) {
        throw new ClassificationError(`Failed to classify email`, email.id, err instanceof Error ? err : new Error(String(err)))
      }
    },

    async classifyBatch(emails: EmailSummary[], labels: LabelDefinition[], systemPrompt?: string): Promise<Map<string, ClassificationResult>> {
      const results = new Map<string, ClassificationResult>()
      const fallbackLabel = labels.find(l => l.name.toLowerCase().includes('low'))?.name ?? labels[0]?.name ?? 'Low Priority'
      for (const email of emails) {
        try {
          const result = await this.classify(email, labels, systemPrompt)
          results.set(email.id, result)
        }
        catch {
          results.set(email.id, { labels: [fallbackLabel] })
        }
      }
      return results
    },
  }
}
