import test from 'node:test'
import assert from 'node:assert/strict'
import { maskBarkUrl, sanitizeBarkUrl } from '../lib/settings-store.js'
import { buildTestPayload } from '../lib/bark-service.js'
import { BARK_RPC_CHANNEL } from '../lib/rpc-contract.js'

test('rpc channel is the documented loopback path', () => {
  assert.equal(BARK_RPC_CHANNEL, '/dsh-notify-bark')
})

test('mask + sanitize round-trip keeps the endpoint usable without leaking it', () => {
  const url = 'https://bark.example.com/push/ABC1234XYZ/'
  const normalized = sanitizeBarkUrl(url)
  const { configured, masked } = maskBarkUrl(url)
  assert.equal(normalized, 'https://bark.example.com/push/ABC1234XYZ')
  assert.equal(configured, true)
  assert.ok(masked.includes('4XYZ'))
  assert.ok(!masked.includes('ABC1'))
})

test('test payload is group-tagged and non-critical', () => {
  const payload = buildTestPayload('DeepSeek Harness')
  assert.equal(payload.group, 'DeepSeek Harness')
  assert.equal(payload.level, 'active')
})
