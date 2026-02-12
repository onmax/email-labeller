import type { LanguageModel } from 'ai'
import type { GmailTokens } from '../adapters/gmail/index.js'
import type { Config, GmailProviderConfig } from '../core/index.js'
import fs from 'node:fs'
import { dirname, join } from 'pathe'
import { createAIClassifier } from '../adapters/ai-sdk/index.js'
import { createGogGmailProvider } from '../adapters/gog/index.js'
import { createGmailProvider } from '../adapters/gmail/index.js'
import { AuthError, createEmailLabeller, createFileStateStore } from '../core/index.js'

const CWD = process.cwd()

export const getTokensPath = () => join(CWD, 'tokens.json')
export const getStatePath = () => join(CWD, 'state.json')
export const getConfigPath = () => join(CWD, 'email-labeller.config.ts')

export function loadTokens(): GmailTokens | null {
  const tokensPath = getTokensPath()
  if (!fs.existsSync(tokensPath))
    return null
  return JSON.parse(fs.readFileSync(tokensPath, 'utf-8'))
}

export function createEmailProvider(config: { gmail: GmailProviderConfig }) {
  if (config.gmail.provider === 'gog') {
    return createGogGmailProvider({ account: config.gmail.account, client: config.gmail.client })
  }

  const tokens = loadTokens()
  if (!tokens)
    throw new AuthError('No tokens found. Run `email-labeller auth` first (or switch gmail.provider to "gog").')

  return createGmailProvider({ clientId: config.gmail.clientId, clientSecret: config.gmail.clientSecret, tokens })
}

export function saveTokens(tokens: GmailTokens): void {
  const tokensPath = getTokensPath()
  fs.mkdirSync(dirname(tokensPath), { recursive: true })
  fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2))
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
