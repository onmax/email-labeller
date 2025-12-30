import type { StateStore } from '../interfaces/state-store.js'
import fs from 'node:fs'

interface FileState {
  processedIds: string[]
  lastRun: string
}

export interface FileStateStoreOptions {
  path: string
  maxProcessedIds?: number
}

export function createFileStateStore(options: FileStateStoreOptions): StateStore {
  const { path: statePath, maxProcessedIds = 5000 } = options

  function load(): FileState {
    if (!fs.existsSync(statePath))
      return { processedIds: [], lastRun: '' }
    return JSON.parse(fs.readFileSync(statePath, 'utf-8'))
  }

  function save(state: FileState): void {
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2))
  }

  return {
    async markProcessed(emailIds: string[]) {
      const state = load()
      const newIds = emailIds.filter(id => !state.processedIds.includes(id))
      state.processedIds = [...state.processedIds, ...newIds].slice(-maxProcessedIds)
      state.lastRun = new Date().toISOString()
      save(state)
    },

    async isProcessed(emailId: string) {
      return load().processedIds.includes(emailId)
    },

    async filterUnprocessed(emailIds: string[]) {
      const processed = new Set(load().processedIds)
      return emailIds.filter(id => !processed.has(id))
    },

    async clearProcessed() {
      save({ processedIds: [], lastRun: new Date().toISOString() })
    },

    async getLastRun() {
      const { lastRun } = load()
      return lastRun ? new Date(lastRun) : null
    },

    async setLastRun(date: Date) {
      const state = load()
      state.lastRun = date.toISOString()
      save(state)
    },
  }
}
