import type { LanguageModel } from 'ai'
import type { Config, GmailProviderConfig } from '../core/index.js'
import { join } from 'pathe'
import { createAIClassifier } from '../adapters/ai-sdk/index.js'
import { createGogGmailProvider } from '../adapters/gog/index.js'
import { createEmailLabeller, createFileStateStore } from '../core/index.js'

const CWD = process.cwd()

export const getStatePath = () => join(CWD, 'state.json')
export const getConfigPath = () => join(CWD, 'email-labeller.config.ts')

export function createEmailProvider(config: { gmail: GmailProviderConfig }) {
  return createGogGmailProvider({ account: config.gmail.account, client: config.gmail.client })
}

export function createLabeller(config: Config<LanguageModel>, onProgress?: Parameters<typeof createEmailLabeller>[0]['onProgress']) {
  return createEmailLabeller({
    emailProvider: createEmailProvider(config),
    aiClassifier: createAIClassifier({ model: config.model }),
    stateStore: createFileStateStore({ path: getStatePath() }),
    config,
    onProgress,
  })
}
