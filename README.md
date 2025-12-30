# Email Labeller

Email Labeller automatically classifies Gmail emails using AI. It applies labels based on your rules, handles historical emails, and cleans up old messages. The CLI uses your Claude Code subscription—no API keys required.

## Features

- **Automatic classification**: Process new emails and apply labels based on AI analysis.
- **Backfill**: Label historical emails in batches with optional force-relabel.
- **Auto-cleanup**: Trash old emails based on configurable retention rules.
- **Any AI provider**: Use Claude Code (subscription), Gemini, OpenAI, or Anthropic API.

## Installation

Create a new directory and install the package with your preferred AI provider:

```bash
mkdir my-email-labeller && cd my-email-labeller
npm install email-labeller ai-sdk-provider-claude-code
```

## Setup

### 1. Create Gmail Credentials

You need OAuth credentials to access your Gmail account:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project and enable the Gmail API
3. Navigate to Credentials → Create OAuth 2.0 Client ID (Desktop app)
4. Copy the `client_id` and `client_secret`

### 2. Create Configuration

Create a file named `email-labeller.config.ts` in your project directory:

```ts
import { claudeCode } from 'ai-sdk-provider-claude-code'
import { defineConfig } from 'email-labeller'

export default defineConfig({
  model: claudeCode('haiku'),

  gmail: {
    clientId: 'your-client-id.apps.googleusercontent.com',
    clientSecret: 'your-client-secret',
  },

  labels: [
    { name: 'Work', color: { backgroundColor: '#fad165', textColor: '#000000' }, description: 'Job-related emails' },
    { name: 'Personal', color: { backgroundColor: '#b99aff', textColor: '#000000' }, description: 'Friends and family' },
    { name: 'Newsletters', color: { backgroundColor: '#4a86e8', textColor: '#ffffff' }, description: 'Subscriptions and digests' },
    { name: 'Low Priority', color: { backgroundColor: '#c2c2c2', textColor: '#000000' }, description: 'Promotions and marketing' },
  ],

  cleanupRules: [
    { label: 'Low Priority', retentionDays: 7 },
  ],

  classificationPrompt: `Classify emails based on sender and content:
- Work: job-related, professional correspondence
- Personal: friends, family, direct messages
- Newsletters: subscriptions, weekly digests
- Low Priority: promotions, marketing emails`,
})
```

### 3. Authenticate and Run

Run the authentication flow to connect your Gmail account:

```bash
npx email-labeller auth
```

This opens your browser for OAuth authorization. After authenticating, process your emails:

```bash
npx email-labeller
```

## Commands

| Command                   | Description                                        |
| ------------------------- | -------------------------------------------------- |
| `email-labeller`          | Process new emails and apply labels                |
| `email-labeller auth`     | Authenticate with Gmail                            |
| `email-labeller backfill` | Label historical emails (use `--force` to relabel) |
| `email-labeller cleanup`  | Trash old emails based on retention rules          |

## AI Providers

Email Labeller supports any [Vercel AI SDK](https://sdk.vercel.ai/providers) provider:

| Provider      | Package                       | Model Example                           |
| ------------- | ----------------------------- | --------------------------------------- |
| Claude Code   | `ai-sdk-provider-claude-code` | `claudeCode('haiku')`                   |
| Google Gemini | `@ai-sdk/google`              | `google('gemini-2.0-flash-exp')`        |
| Anthropic     | `@ai-sdk/anthropic`           | `anthropic('claude-sonnet-4-20250514')` |
| OpenAI        | `@ai-sdk/openai`              | `openai('gpt-4o')`                      |

Claude Code uses your existing subscription. Other providers require API keys set as environment variables.

## License

MIT
