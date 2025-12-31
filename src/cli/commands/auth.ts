import { createGmailProvider, runAuthServer } from '../../adapters/gmail/index.js'
import { defineCommand } from 'citty'
import { consola } from 'consola'
import { saveTokens } from '../config.js'
import { loadConfig } from '../utils.js'

export default defineCommand({
  meta: { name: 'auth', description: 'Authenticate with Gmail' },
  async run() {
    const config = await loadConfig()

    const provider = createGmailProvider({ clientId: config.gmail.clientId, clientSecret: config.gmail.clientSecret })
    const authUrl = provider.getAuthUrl!()

    consola.info('Open this URL in your browser:')
    consola.log(`\n   ${authUrl}\n`)
    consola.info('Sign in and authorize the application')
    consola.info('You will be redirected back here')

    const result = await runAuthServer(provider.oauth2Client)
    saveTokens(result.tokens)

    consola.success('Authentication successful! Tokens saved.')
  },
})
