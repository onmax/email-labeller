#!/usr/bin/env node
import type { Config } from '@email-labeller/core'
import { pathToFileURL } from 'node:url'
import { auth } from './commands/auth.js'
import { backfill } from './commands/backfill.js'
import { cleanup } from './commands/cleanup.js'
import { run } from './commands/run.js'
import { suggest } from './commands/suggest.js'
import { getConfigPath } from './config.js'

async function loadConfig(): Promise<Config> {
  const configPath = getConfigPath()
  const configModule = await import(pathToFileURL(configPath).href)
  return configModule.default as Config
}

async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'run'
  const config = await loadConfig()

  switch (command) {
    case 'auth':
      await auth(config)
      break
    case 'run':
      await run(config)
      break
    case 'backfill':
      await backfill(config, args.slice(1))
      break
    case 'cleanup':
      await cleanup(config)
      break
    case 'suggest':
      await suggest(config, args.slice(1))
      break
    default:
      console.error(`Unknown command: ${command}`)
      console.log('Available commands: run, backfill, cleanup, auth, suggest')
      process.exit(1)
  }
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
