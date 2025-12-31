#!/usr/bin/env node
import { defineCommand, runMain } from 'citty'
import auth from './commands/auth.js'
import backfill from './commands/backfill.js'
import cleanup from './commands/cleanup.js'
import labels from './commands/list-labels.js'
import remove from './commands/remove.js'
import run from './commands/run.js'
import suggest from './commands/suggest.js'

const main = defineCommand({
  meta: { name: 'email-labeller', version: '0.1.0', description: 'AI-powered email classification for Gmail' },
  subCommands: { run, auth, backfill, cleanup, suggest, labels, remove },
})

runMain(main)
