import { defineCommand } from 'citty'
import { consola } from 'consola'
import { createGmailProvider, runAuthServer } from '../../adapters/gmail/index.js'
import { saveTokens } from '../config.js'
import { loadConfig } from '../utils.js'

export default defineCommand({
  meta: { name: 'auth', description: 'Authenticate with Gmail' },
  async run() {
    const config = await loadConfig()

    if (config.gmail.provider === 'gog') {
      consola.info('This project is configured to use `gog` for Gmail access.')
      consola.info('Authenticate using gog (one-time):')
      consola.log('\n  gog auth credentials /path/to/client_secret.json')
      consola.log('  gog auth add you@gmail.com --services gmail')
      consola.log('\nThen re-run:')
      consola.log('  npx email-labeller')
      return
    }

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
