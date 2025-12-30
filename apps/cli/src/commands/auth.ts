import type { Config } from '@email-labeller/core'
import { createGmailProvider, runAuthServer } from '@email-labeller/gmail'
import { saveTokens } from '../config.js'

export async function auth(config: Config) {
  console.log('\n🔐 Gmail Authentication\n')

  const provider = createGmailProvider({
    clientId: config.gmail.clientId,
    clientSecret: config.gmail.clientSecret,
  })

  const authUrl = provider.getAuthUrl!()
  console.log('1. Open this URL in your browser:')
  console.log(`\n   ${authUrl}\n`)
  console.log('2. Sign in and authorize the application')
  console.log('3. You will be redirected back here\n')

  const result = await runAuthServer(provider.oauth2Client)
  saveTokens(result.tokens)

  console.log('✅ Authentication successful! Tokens saved.\n')
}
