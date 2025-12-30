export interface EmailSummary {
  id: string
  threadId: string
  subject: string
  from: string
  snippet: string
  date: string
}

export interface Email extends EmailSummary {
  labelIds: string[]
  to: string[]
  cc?: string[]
  body?: string
}
