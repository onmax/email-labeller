import { claudeCode } from 'ai-sdk-provider-claude-code'
import { defineConfig } from 'email-labeller'

// Uses your Claude Code subscription - no API key needed!
// Other providers: @ai-sdk/google, @ai-sdk/anthropic, @ai-sdk/openai

export default defineConfig({
  model: claudeCode('haiku'),

  // Gmail access
  // Recommended: use `gog` (auth handled by gog on the machine)
  gmail: {
    provider: 'gog',
    // optional:
    // account: 'you@gmail.com',
    // client: 'default',
  },

  // Legacy Google OAuth (requires `npx email-labeller auth` to create tokens.json)
  // gmail: {
  //   provider: 'googleapis',
  //   clientId: 'your-client-id.apps.googleusercontent.com',
  //   clientSecret: 'your-client-secret',
  // },

  labels: [
    { name: 'Work', color: { backgroundColor: '#fad165', textColor: '#000000' }, description: 'Job-related emails' },
    { name: 'Personal', color: { backgroundColor: '#b99aff', textColor: '#000000' }, description: 'Friends, family' },
    { name: 'Newsletters', color: { backgroundColor: '#4a86e8', textColor: '#ffffff' }, description: 'Subscriptions, digests' },
    { name: 'Receipts', color: { backgroundColor: '#149e60', textColor: '#ffffff' }, description: 'Purchases, invoices' },
    { name: 'Security', color: { backgroundColor: '#cc3a21', textColor: '#ffffff' }, description: '2FA, login alerts' },
    { name: 'Low Priority', color: { backgroundColor: '#c2c2c2', textColor: '#000000' }, description: 'Promotions, marketing' },
  ],

  cleanupRules: [
    { label: 'Security', retentionDays: 3 },
    { label: 'Low Priority', retentionDays: 7 },
  ],

  classificationPrompt: `Classify emails into:
- Work: job-related, professional
- Personal: friends, family
- Newsletters: subscriptions, digests
- Receipts: purchases, invoices
- Security: 2FA, password resets
- Low Priority: promotions, marketing`,
})
