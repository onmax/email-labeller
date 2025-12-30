import type { ClassificationResult, EmailSummary, LabelDefinition } from '../types/index.js'

export interface AIClassifier {
  readonly name: string
  classify: (email: EmailSummary, labels: LabelDefinition[], systemPrompt?: string) => Promise<ClassificationResult>
  classifyBatch?: (emails: EmailSummary[], labels: LabelDefinition[], systemPrompt?: string) => Promise<Map<string, ClassificationResult>>
  suggestLabels?: (emails: EmailSummary[]) => Promise<LabelDefinition[]>
}
