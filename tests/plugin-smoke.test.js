import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import { DEFAULT_SETTINGS } from '../lib/settings-store.js'
import { apply as applyHost, Config as HostConfig, name as hostName, PROFILE_ENTRY_ID } from '../lib/index.js'
import { barkRemote } from '../lib/remote-contract.js'

test('host runtime imports are declared as production dependencies', () => {
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  for (const name of ['@deepseek-ai/schemastery', '@deepseek-ai/dsh-typert-protocol']) {
    assert.ok(manifest.dependencies?.[name], `${name} must be installed for consumers`)
    assert.equal(manifest.devDependencies?.[name], undefined)
  }
})

function liveConfig(overrides = {}) {
  const values = {
    enabled: true,
    barkUrl: 'https://api.day.app/testkey/',
    events: { ...DEFAULT_SETTINGS.events },
    includeAssistantText: true,
    maxBodyChars: 300,
    group: 'DeepSeek Harness',
    ...overrides,
  }
  const live = {
    enabled: { get: () => values.enabled },
    barkUrl: { get: () => values.barkUrl },
    events: { get: () => values.events },
    includeAssistantText: { get: () => values.includeAssistantText },
    maxBodyChars: { get: () => values.maxBodyChars },
    group: { get: () => values.group },
  }
  return { values, live }
}

function settingsStub(overrides = {}) {
  return {
    configured: null,
    writes: [],
    describe: () => [{ ns: PROFILE_ENTRY_ID, revision: 7 }],
    configure(presentation) {
      this.configured = presentation
      return () => {}
    },
    async update(ns, patch, revision) {
      this.writes.push({ ns, patch, revision })
    },
    ...overrides,
  }
}

/** Boot the plugin the way the Loader composes it: sibling provider + plugin fiber. */
async function bootHost(live, settings) {
  const root = new Context()
  let listener
  const loggerLines = []
  await root.plugin(async (ctxSettings) => {
    ctxSettings.provide('settings', settings)
  })
  await root.plugin(async (ctxBark) => {
    ctxBark.logger.exporter?.({ levels: { default: 0 }, export: ({ type, name, args }) => loggerLines.push(type + ' ' + name + ': ' + args.map(String).join(' ')) })
    // Capture the listener the plugin registers (ctx.on receives it verbatim).
    const originalOn = ctxBark.on
    const capturedOn = (event, fn) => {
      if (event === 'session/event') listener = fn
      return originalOn.call(ctxBark, event, fn)
    }
    Object.defineProperty(ctxBark, 'on', { value: capturedOn, configurable: true })
    applyHost(ctxBark, live)
  })
  await new Promise((resolve) => setTimeout(resolve, 60))
  return { root, listener, loggerLines, settings, remote: root.get('barkNotify') }
}

test('host apply mounts the barkNotify remote and suppresses the auto settings page', async () => {
  assert.equal(hostName, 'bark-notify')
  assert.equal(PROFILE_ENTRY_ID, 'bark-notify')
  assert.ok(HostConfig && typeof HostConfig.toJSON === 'function')

  const boot = await bootHost(liveConfig().live, settingsStub())
  assert.ok(boot.remote, 'barkNotify service provided')
  assert.equal(typeof boot.remote.get, 'function')
  assert.equal(typeof boot.remote.set, 'function')
  assert.equal(typeof boot.remote.test, 'function')
  assert.equal(typeof boot.listener, 'function')
  assert.deepEqual(boot.settings.configured, { auto: false })
  assert.equal(boot.loggerLines.filter((line) => /\berror\b/.test(line)).length, 0, JSON.stringify(boot.loggerLines))
})

test('barkNotify.get() answers the masked status and never echoes the URL', async () => {
  const boot = await bootHost(liveConfig().live, settingsStub())
  const got = await boot.remote.get()
  assert.equal(got.status.configured, true)
  assert.equal(got.status.masked.endsWith('tkey'), true)
  assert.equal('barkUrl' in got.settings, false)
  assert.equal(got.settings.events.completed, DEFAULT_SETTINGS.events.completed)
})

test('barkNotify.set() persists normalized patches with the entry revision and rejects bad ones', async () => {
  const boot = await bootHost(liveConfig().live, settingsStub())
  const okSet = await boot.remote.set({ enabled: false, events: { ...DEFAULT_SETTINGS.events, aborted: true } })
  assert.deepEqual(okSet, { saved: true })
  assert.equal(boot.settings.writes[0].ns, 'bark-notify')
  assert.equal(boot.settings.writes[0].revision, 7)
  assert.equal(boot.settings.writes[0].patch.enabled, false)

  const normalized = await boot.remote.set({ barkUrl: '  https://api.day.app/newkey// ' })
  assert.deepEqual(normalized, { saved: true })
  assert.equal(boot.settings.writes[1].patch.barkUrl, 'https://api.day.app/newkey')

  await assert.rejects(
    () => boot.remote.set({ nope: 1 }),
    (error) => error.code === 'gateway/bad-request' && error.message.includes('unknown field'),
  )
  await assert.rejects(() => boot.remote.set('x'), (error) => error.code === 'gateway/bad-request')
})

test('barkNotify.test() pushes from the configured endpoint', async () => {
  let captured = null
  globalThis.fetch = async (url, init) => {
    captured = { url, init }
    return new Response('{"code":200}', { status: 200 })
  }
  const boot = await bootHost(liveConfig().live, settingsStub())
  const sent = await boot.remote.test('Custom Group')
  assert.deepEqual(sent, { sent: true })
  assert.equal(captured.url, 'https://api.day.app/testkey')
  assert.equal(JSON.parse(captured.init.body).group, 'Custom Group')
})

test('session/event listener pushes with the workspace title, level, and cached assistant text', async () => {
  let captured = null
  globalThis.fetch = async (url, init) => {
    captured = { url, init }
    return new Response('{"code":200}', { status: 200 })
  }
  const boot = await bootHost(liveConfig().live, settingsStub())
  const session = { id: 's1', header: { cwd: '/work/my-project' } }
  boot.listener(session, {
    type: 'assistant/message',
    seq: 1,
    time: Date.now(),
    data: { turn: 1, step: 1, message: { content: [{ type: 'text', text: 'done and dusted' }] } },
  })
  boot.listener(session, { type: 'turn/end', seq: 9, time: Date.now(), data: { turn: 1, reason: { kind: 'completed' } } })
  await new Promise((resolve) => setTimeout(resolve, 20))

  assert.ok(captured, 'a bark push should have been sent')
  const body = JSON.parse(captured.init.body)
  assert.equal(body.title, 'my-project')
  assert.equal(body.level, 'active')
  assert.ok(body.body.includes('✅ 任务完成'))
  assert.ok(body.body.includes('done and dusted'))
})

test('shipped client bundle mounts the remote and registers the settings section', async () => {
  const bundlePath = fileURLToPath(new URL('../lib/client.js', import.meta.url))
  const code = readFileSync(bundlePath, 'utf8')
  let registration
  const fakeWindow = { __ModuleLoader__: { load: (value) => { registration = value } } }
  // eslint-disable-next-line no-new-func
  new Function('window', code)(fakeWindow)
  assert.equal(registration.id, 'dsh-notify-bark')

  const require = (specifier) => {
    if (specifier === '@deepseek-ai/dsh-client-store') {
      return {
        createSnapshotStore(init) {
          let state = structuredClone(init)
          const listeners = new Set()
          return {
            getSnapshot: () => state,
            subscribe(listener) {
              listeners.add(listener)
              return () => listeners.delete(listener)
            },
            update(mutator) {
              const draft = structuredClone(state)
              mutator(draft)
              state = draft
              for (const l of [...listeners]) l()
            },
            set(next) {
              state = next
              for (const l of [...listeners]) l()
            },
          }
        },
      }
    }
    if (specifier === 'react') return { useState: (value) => [value, () => {}] }
    if (specifier === 'react/jsx-runtime') return { jsx: () => null, jsxs: () => null }
    throw new Error('unexpected client require: ' + specifier)
  }
  const exports = registration.factory(require)
  assert.equal(typeof exports.apply, 'function')
  assert.deepEqual([...exports.inject], ['slots', 'locale', 'remote'])

  const registered = []
  const mounted = []
  const dictionaries = []
  const calls = []
  const namespace = {
    async get() {
      calls.push('get')
      return { ok: true, value: { settings: { enabled: true, events: {}, includeAssistantText: true, maxBodyChars: 300, group: 'G' }, status: { configured: false, masked: '' } } }
    },
    async set(patch) {
      calls.push('set:' + JSON.stringify(patch))
      return { ok: true, value: { saved: true } }
    },
    async test(group) {
      calls.push('test:' + group)
      return { ok: true, value: { sent: true } }
    },
  }
  const remote = {
    async $mount(contribution) {
      mounted.push(contribution)
      return () => Promise.resolve()
    },
  }
  const scope = {
    get: (service) => (service === 'remote' ? remote : service === 'remote.barkNotify' ? namespace : undefined),
    locale: { bind: () => (key) => key },
    slots: {
      inject(_key, callback) {
        callback()
      },
      register(options, component) {
        registered.push({ options, component })
      },
    },
    effect(callback) {
      callback()
    },
  }
  const ctx = {
    remote,
    effect(callback) {
      callback()
    },
    inject(_services, callback) {
      callback(scope)
    },
    locale: {
      register(ns, dicts) {
        dictionaries.push({ ns, dicts })
      },
    },
  }
  exports.apply(ctx)

  await new Promise((resolve) => setTimeout(resolve, 20))
  assert.equal(mounted.length, 1)
  assert.equal(mounted[0].package, barkRemote.package)
  assert.deepEqual(mounted[0].descriptors.map((d) => d.method), ['get', 'set', 'test'])
  assert.equal(dictionaries.length, 1)
  assert.equal(dictionaries[0].ns, 'bark-notify')
  assert.ok(dictionaries[0].dicts.zh && dictionaries[0].dicts.en)

  assert.equal(registered.length, 1)
  assert.equal(registered[0].options.name, 'settings.section')
  assert.equal(registered[0].options.id, 'bark-notify')
  assert.equal(typeof registered[0].component, 'function')

  const injected = registered[0].options.inject()
  assert.equal(typeof injected.t, 'function')
  assert.equal(typeof injected.controller.save, 'function')
  const snapshot = injected.hooks.snapshot.getSnapshot()
  assert.ok(snapshot.status === 'loading' || snapshot.status === 'ready')
  assert.ok(calls.includes('get'))
})