import test from 'node:test'
import assert from 'node:assert/strict'
import { BARK_REMOTE_PACKAGE, validateSetPatch, barkRemote } from '../lib/remote-contract.js'

test('remote contract declares the barkNotify surface with strict codecs', () => {
  assert.equal(barkRemote.package, BARK_REMOTE_PACKAGE)
  assert.deepEqual(barkRemote.descriptors.map((d) => d.method), ['get', 'set', 'test'])
  for (const d of barkRemote.descriptors) {
    assert.equal(d.namespace, 'barkNotify')
    assert.equal(d.service, 'barkNotify')
    assert.deepEqual(d.invocation, { kind: 'direct' })
    assert.equal(d.result.mode, 'strict')
    for (const p of d.parameters) {
      assert.equal(p.codec.mode, 'strict', p.name)
      assert.equal(p.source, 'json')
    }
  }
  const testDescriptor = barkRemote.descriptors.find((d) => d.method === 'test')
  assert.equal(testDescriptor.parameters[0].acceptsUndefined, true)
})

test('validateSetPatch keeps known fields and rejects unknown ones', () => {
  assert.equal(validateSetPatch(null).message, 'set: patch must be an object')
  assert.ok(validateSetPatch({ nope: 1 }).message.includes('unknown field'))
  assert.ok(validateSetPatch({ enabled: 'yes' }).message.includes('boolean'))
  assert.ok(validateSetPatch({ maxBodyChars: 'x' }).message.includes('number'))
  assert.ok(validateSetPatch({ events: 'x' }).message.includes('events must be an object'))
  const good = validateSetPatch({ enabled: false, group: 'G' })
  assert.equal(good.message, undefined)
  assert.equal(good.patch.enabled, false)
  assert.equal(good.patch.group, 'G')
})

test('validateSetPatch normalizes the endpoint and drops blank values', () => {
  const set = validateSetPatch({ barkUrl: '  https://api.day.app/newkey// ' })
  assert.equal(set.patch.barkUrl, 'https://api.day.app/newkey')
  // A blank url is dropped so it cannot wipe a stored endpoint silently.
  assert.equal('barkUrl' in validateSetPatch({ barkUrl: '   ' }).patch, false)
})

test('validateSetPatch accepts a pasted curl example but rejects non-URL text', () => {
  const pasted = validateSetPatch({ barkUrl: "curl -X GET 'https://api.day.app/abc123/title/body?group=example&ttl=600'" })
  assert.equal(pasted.message, undefined)
  assert.equal(pasted.patch.barkUrl, 'https://api.day.app/abc123')
  const bad = validateSetPatch({ barkUrl: 'curl -X GET https://… (this is documentation)' })
  assert.ok(bad.message.includes('valid http(s) URL'))
  assert.equal(bad.patch, undefined)
})
