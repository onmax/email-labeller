export interface StateStore {
  markProcessed: (emailIds: string[]) => Promise<void>
  isProcessed: (emailId: string) => Promise<boolean>
  filterUnprocessed: (emailIds: string[]) => Promise<string[]>
  clearProcessed: () => Promise<void>
  getLastRun: () => Promise<Date | null>
  setLastRun: (date: Date) => Promise<void>
}
