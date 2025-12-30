import type { OAuth2Client } from 'google-auth-library'
import type { GmailTokens } from './provider.js'
import http from 'node:http'
import { URL } from 'node:url'

export interface AuthCallbackResult {
  tokens: GmailTokens
  code: string
}

export function runAuthServer(oauth2Client: OAuth2Client, port = 3000): Promise<AuthCallbackResult> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url || '', `http://localhost:${port}`)
        if (url.pathname !== '/callback') {
          res.writeHead(404)
          res.end('Not found')
          return
        }

        const code = url.searchParams.get('code')
        if (!code) {
          res.writeHead(400)
          res.end('Missing code')
          return
        }

        const { tokens } = await oauth2Client.getToken(code)
        oauth2Client.setCredentials(tokens)

        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end('<h1>Authentication successful!</h1><p>You can close this window.</p>')

        server.close()
        resolve({ tokens: tokens as GmailTokens, code })
      }
      catch (err) {
        res.writeHead(500)
        res.end('Authentication failed')
        server.close()
        reject(err)
      }
    })

    server.listen(port, () => {
      console.log(`Auth server listening on http://localhost:${port}`)
    })

    server.on('error', reject)
  })
}
