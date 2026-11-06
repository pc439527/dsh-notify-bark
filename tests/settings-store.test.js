import test from 'node:test'
import assert from 'node:assert/strict'
import {
  Config,
  DEFAULT_SETTINGS,
  EVENT_META,
  TURN_END_EVENT_FLAG,
  maskBarkUrl,
  readBarkSettings,
  sanitizeBarkUrl,
} from '../lib/settings-store.js'

test('defaults ship with the documented event toggles', () => {
  assert.equal(DEFAULT_SETTINGS.enabled, true)
  assert.equal(DEFAULT_SETTINGS.events.completed, true)
  assert.equal(DEFAULT_SETTINGS.events.error, true)
  assert.equal(DEFAULT_SETTINGS.events.blocked, true)
  assert.equal(DEFAULT_SETTINGS.events.aborted, false)
  assert.equal(DEFAULT_SETTINGS.events.maxTokens, true)
  assert.equal(DEFAULT_SETTINGS.events.interrupted, true)
  assert.equal(DEFAULT_SETTINGS.events.question, true)
  assert.equal(DEFAULT_SETTINGS.events.approval, true)
  assert.equal(DEFAULT_SETTINGS.events.planReview, false)
  assert.equal(DEFAULT_SETTINGS.includeAssistantText, true)
  assert.equal(DEFAULT_SETTINGS.maxBodyChars, 300)
  assert.equal(DEFAULT_SETTINGS.group, 'DeepSeek Harness')
})

test('turn/end reason kinds map onto the six official flags', () => {
  assert.equal(TURN_END_EVENT_FLAG['completed'], 'completed')
  assert.equal(TURN_END_EVENT_FLAG['error'], 'error')
  assert.equal(TURN_END_EVENT_FLAG['blocked'], 'blocked')
  assert.equal(TURN_END_EVENT_FLAG['aborted'], 'aborted')
  assert.equal(TURN_END_EVENT_FLAG['max-tokens'], 'maxTokens')
  assert.equal(TURN_END_EVENT_FLAG['interrupted'], 'interrupted')
  // Unknown (plugin-extension) kinds stay silent.
  assert.equal(TURN_END_EVENT_FLAG['mystery'], undefined)
})

test('event levels follow the agreed mapping', () => {
  assert.equal(EVENT_META.completed.level, 'active')
  assert.equal(EVENT_META.question.level, 'timeSensitive')
  assert.equal(EVENT_META.approval.level, 'timeSensitive')
  assert.equal(EVENT_META.error.level, 'timeSensitive')
  assert.equal(EVENT_META.blocked.level, 'timeSensitive')
  assert.equal(EVENT_META.maxTokens.level, 'timeSensitive')
  assert.equal(EVENT_META.aborted.level, 'passive')
  assert.equal(EVENT_META.interrupted.level, 'timeSensitive')
  assert.equal(EVENT_META.planReview.level, 'timeSensitive')
})

test('sanitizeBarkUrl strips whitespace and trailing slashes', () => {
  assert.equal(sanitizeBarkUrl('  https://api.day.app/abc//  '), 'https://api.day.app/abc')
  assert.equal(sanitizeBarkUrl(''), '')
})

test('sanitizeBarkUrl reduces a pasted curl command / GET-style URL to the base', () => {
  // Exactly the shape that produced "Failed to parse URL from curl -X GET …".
  assert.equal(
    sanitizeBarkUrl("curl -X GET 'https://api.day.app/abc123/title/body?group=example&ttl=600'"),
    'https://api.day.app/abc123',
  )
  assert.equal(
    sanitizeBarkUrl('https://api.day.app/abc123/%E6%A0%87%E9%A2%98/%E5%86%85%E5%AE%B9?group=example'),
    'https://api.day.app/abc123',
  )
  // A plain base with a query is still reduced to the base.
  assert.equal(sanitizeBarkUrl('https://api.day.app/abc123?group=example'), 'https://api.day.app/abc123')
  // A two-segment self-hosted prefix is preserved (only /title/body is trimmed).
  assert.equal(sanitizeBarkUrl('https://bark.example.com/bark/abc123/'), 'https://bark.example.com/bark/abc123')
  // Non-URL garbage and a non-http protocol are rejected.
  assert.equal(sanitizeBarkUrl('curl -X GET something weird'), '')
  assert.equal(sanitizeBarkUrl('ftp://example.com/key'), '')
  assert.equal(sanitizeBarkUrl('   '), '')
})

test('maskBarkUrl never reveals the device key', () => {
  const masked = maskBarkUrl('https://api.day.app/DEADBEEF3F82')
  assert.equal(masked.configured, true)
  assert.equal(masked.masked, '••••••••3F82')
  assert.ok(!masked.masked.includes('DEADBEEF'))
  assert.equal(maskBarkUrl('').configured, false)
})
test('Config marks the endpoint secret and every editable field volatile', () => {
  const json = Config.toJSON()
  const root = json.refs[json.uid]
  const metaOf = (field) => json.refs[root.dict[field]].meta
  assert.equal(metaOf('barkUrl').role, 'secret')
  assert.equal(metaOf('barkUrl').volatile, true)
  assert.equal(metaOf('enabled').volatile, true)
  assert.equal(metaOf('events').volatile, true)
  assert.equal(metaOf('maxBodyChars').volatile, true)
})

test('readBarkSettings unwraps volatile references and defaults missing event keys', () => {
  const events = { ...DEFAULT_SETTINGS.events, aborted: true }
  const live = {
    enabled: { get: () => true },
    barkUrl: { get: () => 'https://api.day.app/key' },
    events: { get: () => events },
    includeAssistantText: { get: () => false },
    maxBodyChars: { get: () => 120 },
    group: { get: () => 'G' },
  }
  const read = readBarkSettings(live)
  assert.equal(read.enabled, true)
  assert.equal(read.barkUrl, 'https://api.day.app/key')
  assert.equal(read.events.aborted, true)
  assert.equal(read.includeAssistantText, false)
  assert.equal(read.maxBodyChars, 120)
  assert.equal(read.group, 'G')
  assert.equal(readBarkSettings({ ...live, events: { get: () => ({ completed: false }) } }).events.error, true)
})
test('Config parse hands apply stable volatile references', () => {
  const parsed = Config({ barkUrl: 'https://api.day.app/abc', events: { aborted: true } })
  assert.equal(typeof parsed.enabled.get, 'function')
  assert.equal(typeof parsed.events.get, 'function')
  assert.equal(typeof parsed.barkUrl.get, 'function')
  assert.equal(parsed.barkUrl.get(), 'https://api.day.app/abc')
  assert.equal(parsed.events.get().aborted, true)
  const read = readBarkSettings(parsed)
  assert.equal(read.group, 'DeepSeek Harness')
  assert.equal(read.events.aborted, true)
})
