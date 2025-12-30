export interface GetEmailsOptions {
  maxResults?: number
  query?: string
  excludeLabels?: string[]
  pageToken?: string
}

export interface ClassificationResult {
  label: string
  confidence?: number
  reasoning?: string
}

export interface ProcessResult {
  processed: number
  results: Array<{ emailId: string, label: string }>
}

export interface CleanupResult {
  deleted: number
  byLabel: Record<string, number>
}
