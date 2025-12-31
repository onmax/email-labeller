import type { Config } from '../core/index.js'
import type { LanguageModel } from 'ai'
import { pathToFileURL } from 'node:url'
import { ConfigError, configSchema } from '../core/index.js'
import { getConfigPath } from './config.js'

export async function loadConfig(): Promise<Config<LanguageModel>> {
  const configPath = getConfigPath()
  const configModule = await import(pathToFileURL(configPath).href)
  const result = configSchema.safeParse(configModule.default)
  if (!result.success) {
    const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
    throw new ConfigError(`Invalid config: ${issues}`)
  }
  return result.data as Config<LanguageModel>
}
