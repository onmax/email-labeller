import type { GmailTokens } from '@email-labeller/gmail'
import fs from 'node:fs'
import path from 'node:path'

// Read from current working directory (where user runs the CLI)
const CWD = process.cwd()

export function getTokensPath(): string {
  return path.join(CWD, 'tokens.json')
}
export function getStatePath(): string {
  return path.join(CWD, 'state.json')
}
export function getConfigPath(): string {
  return path.join(CWD, 'email-labeller.config.ts')
}

export function loadTokens(): GmailTokens | null {
  const tokensPath = getTokensPath()
  if (!fs.existsSync(tokensPath))
    return null
  return JSON.parse(fs.readFileSync(tokensPath, 'utf-8'))
}

export function saveTokens(tokens: GmailTokens): void {
  const tokensPath = getTokensPath()
  fs.mkdirSync(path.dirname(tokensPath), { recursive: true })
  fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2))
}
