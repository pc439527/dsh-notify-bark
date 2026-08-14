#!/usr/bin/env node
/**
 * Client-bundle sync step for the build pipeline.
 *
 * The browser half (lib/client.js) is authored directly in the module-loader
 * bundle format this deployment serves (/plugins/dsh-notify-bark/client.js) —
 * it mirrors src/client/ exactly but needs no bundler. This script guards the
 * invariant that the deployed bundle exists and is non-trivial, so a broken
 * package can never silently ship without its client half.
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const bundle = resolve(import.meta.dirname, '../lib/client.js')
if (!existsSync(bundle)) {
  console.error('sync-client: lib/client.js is missing — the settings section would not load.')
  process.exit(1)
}
const content = readFileSync(bundle, 'utf8')
if (!content.includes('window.__ModuleLoader__.load')) {
  console.error('sync-client: lib/client.js is not a module-loader bundle.')
  process.exit(1)
}
console.log(`sync-client: lib/client.js OK (${content.length} bytes)`)
