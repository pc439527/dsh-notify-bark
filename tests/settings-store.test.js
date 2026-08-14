import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_SETTINGS,
  EVENT_META,
  TURN_END_EVENT_FLAG,
  maskBarkUrl,
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

test('maskBarkUrl never reveals the device key', () => {
  const masked = maskBarkUrl('https://api.day.app/DEADBEEF3F82')
  assert.equal(masked.configured, true)
  assert.equal(masked.masked, '••••••••3F82')
  assert.ok(!masked.masked.includes('DEADBEEF'))
  assert.equal(maskBarkUrl('').configured, false)
})
