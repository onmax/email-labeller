import { defineCommand } from 'citty'
import { consola } from 'consola'

export default defineCommand({
  meta: { name: 'auth', description: 'Authenticate with Gmail (via gog)' },
  async run() {
    consola.info('This project uses `gog` for Gmail access.')
    consola.info('Authenticate using gog (one-time):')
    consola.log('\n  gog auth credentials /path/to/client_secret.json')
    consola.log('  gog auth add you@gmail.com --services gmail')
    consola.log('\nThen re-run:')
    consola.log('  npx email-labeller')
  },
})
