import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import { DEFAULT_SETTINGS } from '../lib/settings-store.js'
import { apply as applyHost, PROFILE_ENTRY_ID } from '../lib/index.js'

/** Create an in-memory SnapshotStore matching @deepseek-ai/dsh-client-store. */
function createStore(init) {
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
}

/**
 * Load the shipped lib/client.js bundle with a tiny stateful React hook
 * runtime so we can mount, interact with, unmount, and remount
 * BarkSettingsSection directly against a live or mocked namespace.
 */
function loadClientBundle() {
  const bundlePath = fileURLToPath(new URL('../lib/client.js', import.meta.url))
  const code = readFileSync(bundlePath, 'utf8')
  let registration
  const fakeWindow = { __ModuleLoader__: { load: (value) => { registration = value } } }
  // eslint-disable-next-line no-new-func
  new Function('window', code)(fakeWindow)

  let states = []
  let refs = []
  let effects = []
  let stateIndex = 0
  let refIndex = 0
  let effectIndex = 0

  function resetMount() {
    states = []
    refs = []
    effects = []
  }

  function renderWithHooks(fn) {
    stateIndex = 0
    refIndex = 0
    effectIndex = 0
    const pendingEffects = []
    const tree = fn(pendingEffects)
    for (const run of pendingEffects) run()
    return tree
  }

  let currentPendingEffects = []
  const reactMock = {
    useState(initial) {
      const idx = stateIndex++
      if (!(idx in states)) {
        states[idx] = typeof initial === 'function' ? initial() : initial
      }
      const setState = (next) => {
        states[idx] = typeof next === 'function' ? next(states[idx]) : next
      }
      return [states[idx], setState]
    },
    useRef(initial) {
      const idx = refIndex++
      if (!(idx in refs)) {
        refs[idx] = { current: initial }
      }
      return refs[idx]
    },
    useEffect(effect, deps) {
      const idx = effectIndex++
      const prev = effects[idx]
      const changed = prev === undefined || deps === undefined || deps.length !== prev.deps.length || deps.some((d, i) => !Object.is(d, prev.deps[i]))
      if (changed) {
        effects[idx] = { deps: deps ? [...deps] : undefined }
        currentPendingEffects.push(effect)
      }
    },
  }

  const jsx = (type, props) => ({ type, props: props ?? {} })
  const require = (specifier) => {
    if (specifier === '@deepseek-ai/dsh-client-store') return { createSnapshotStore: createStore }
    if (specifier === 'react') return reactMock
    if (specifier === 'react/jsx-runtime') return { jsx, jsxs: jsx }
    throw new Error('unexpected client require: ' + specifier)
  }

  const exports = registration.factory(require)

  function renderSection(props) {
    return renderWithHooks((pending) => {
      currentPendingEffects = pending
      return exports.BarkSettingsSection(props)
    })
  }

  return { exports, resetMount, renderSection }
}

/** Depth-first search over the virtual element tree produced by jsx(). */
function findNodes(node, predicate, out = []) {
  if (node == null || typeof node !== 'object') return out
  if (Array.isArray(node)) {
    for (const child of node) findNodes(child, predicate, out)
    return out
  }
  if (predicate(node)) out.push(node)
  if (node.props && 'children' in node.props) findNodes(node.props.children, predicate, out)
  return out
}

function findInputByAriaLabel(tree, label) {
  const matches = findNodes(tree, (n) => n.type === 'input' && n.props?.['aria-label'] === label)
  assert.equal(matches.length, 1, `expected 1 input with aria-label=${label}, got ${matches.length}`)
  return matches[0]
}

/** Boot a real Host plugin with live mutable config and revision-checked settings store. */
async function bootLiveHost(initialOverrides = {}) {
  const values = {
    enabled: true,
    barkUrl: 'https://api.day.app/testkey',
    events: { ...DEFAULT_SETTINGS.events },
    includeAssistantText: true,
    maxBodyChars: 50,
    group: 'DeepSeek Harness-ZQ0621',
    ...initialOverrides,
  }
  const live = {
    enabled: { get: () => values.enabled },
    barkUrl: { get: () => values.barkUrl },
    events: { get: () => values.events },
    includeAssistantText: { get: () => values.includeAssistantText },
    maxBodyChars: { get: () => values.maxBodyChars },
    group: { get: () => values.group },
  }
  let revision = 1
  const writes = []
  let failNextWrite = null
  const settings = {
    describe: () => [{ ns: PROFILE_ENTRY_ID, revision }],
    configure: () => () => {},
    async update(ns, patch, expectedRevision) {
      if (expectedRevision !== revision) {
        throw new Error(`SettingsConflictError: expected revision ${expectedRevision}, got ${revision}`)
      }
      // Yield a tick to mimic real async YAML write + reconcile.
      await new Promise((resolve) => setTimeout(resolve, 10))
      if (failNextWrite !== null) {
        const message = failNextWrite
        failNextWrite = null
        throw new Error(message)
      }
      writes.push({ ns, patch: structuredClone(patch), revision: expectedRevision })
      Object.assign(values, patch)
      revision += 1
    },
  }

  const root = new Context()
  let listener
  await root.plugin(async (ctxSettings) => {
    ctxSettings.provide('settings', settings)
  })
  await root.plugin(async (ctxBark) => {
    const originalOn = ctxBark.on
    Object.defineProperty(ctxBark, 'on', {
      value: (event, fn) => {
        if (event === 'session/event') listener = fn
        return originalOn.call(ctxBark, event, fn)
      },
      configurable: true,
    })
    applyHost(ctxBark, live)
  })
  await new Promise((resolve) => setTimeout(resolve, 30))
  const remote = root.get('barkNotify')

  const namespace = {
    getCalls: 0,
    setCalls: [],
    async get() {
      this.getCalls += 1
      try {
        return { ok: true, value: await remote.get() }
      } catch (error) {
        return { ok: false, error: { message: error instanceof Error ? error.message : String(error) } }
      }
    },
    async set(patch) {
      this.setCalls.push(structuredClone(patch))
      try {
        return { ok: true, value: await remote.set(patch) }
      } catch (error) {
        return { ok: false, error: { message: error instanceof Error ? error.message : String(error) } }
      }
    },
    async test(group) {
      try {
        return { ok: true, value: await remote.test(group) }
      } catch (error) {
        return { ok: false, error: { message: error instanceof Error ? error.message : String(error) } }
      }
    },
  }

  return {
    values,
    writes,
    listener,
    namespace,
    setFailNextWrite(msg) {
      failNextWrite = msg
    },
  }
}

test('parseBodyCharsDraft handles empty, invalid, fullwidth, decimal, and out-of-range values', () => {
  const { exports } = loadClientBundle()
  assert.equal(exports.parseBodyCharsDraft(''), null)
  assert.equal(exports.parseBodyCharsDraft('   '), null)
  assert.equal(exports.parseBodyCharsDraft('abc'), null)
  assert.equal(exports.parseBodyCharsDraft('12px'), null)
  assert.equal(exports.parseBodyCharsDraft('50'), 50)
  assert.equal(exports.parseBodyCharsDraft(' 300 '), 300)
  assert.equal(exports.parseBodyCharsDraft('５００'), 500)
  assert.equal(exports.parseBodyCharsDraft('120.6'), 121)
  assert.equal(exports.parseBodyCharsDraft('0'), 1)
  assert.equal(exports.parseBodyCharsDraft('-25'), 1)
  assert.equal(exports.parseBodyCharsDraft('9999'), 4000)
})

test('maxBodyChars input supports clearing, editing, saving on blur, and reopening with saved value', async () => {
  const { exports, resetMount, renderSection } = loadClientBundle()
  const host = await bootLiveHost({ maxBodyChars: 50 })
  const controller = new exports.BarkSectionController(host.namespace, Promise.resolve())
  await controller.load()

  const props = () => ({
    t: (key, params) => (params ? `${key}:${JSON.stringify(params)}` : key),
    controller,
    useSnapshot: (selector) => selector(controller.store.getSnapshot()),
  })

  // Initial mount displays persisted value 50.
  resetMount()
  let tree = renderSection(props())
  let input = findInputByAriaLabel(tree, 'maxBodyChars')
  assert.equal(input.props.type, 'text')
  assert.equal(input.props.inputMode, 'numeric')
  assert.equal(input.props.value, '50')

  // Blurring without editing must NOT overwrite maxBodyChars with 1 or call set().
  input.props.onBlur()
  await new Promise((resolve) => setTimeout(resolve, 25))
  assert.equal(host.namespace.setCalls.length, 0)
  assert.equal(host.values.maxBodyChars, 50)

  // Deleting down to empty string must stay empty (not snap back to '50').
  input.props.onChange({ target: { value: '5' } })
  tree = renderSection(props())
  input = findInputByAriaLabel(tree, 'maxBodyChars')
  assert.equal(input.props.value, '5')

  input.props.onChange({ target: { value: '' } })
  tree = renderSection(props())
  input = findInputByAriaLabel(tree, 'maxBodyChars')
  assert.equal(input.props.value, '')
  assert.equal(input.props.placeholder, '50')

  // Blurring while empty must revert to 50 without saving 1.
  input.props.onBlur()
  await new Promise((resolve) => setTimeout(resolve, 25))
  tree = renderSection(props())
  input = findInputByAriaLabel(tree, 'maxBodyChars')
  assert.equal(input.props.value, '50')
  assert.equal(host.namespace.setCalls.length, 0)
  assert.equal(host.values.maxBodyChars, 50)

  // Clear, type '800', blur -> optimistically shows '800' immediately and persists 800 to Host.
  input.props.onChange({ target: { value: '' } })
  tree = renderSection(props())
  findInputByAriaLabel(tree, 'maxBodyChars').props.onChange({ target: { value: '800' } })
  tree = renderSection(props())
  input = findInputByAriaLabel(tree, 'maxBodyChars')
  assert.equal(input.props.value, '800')

  input.props.onBlur()
  // Immediately after blur (before async RPC settles), value stays '800' without snap-back flicker.
  tree = renderSection(props())
  assert.equal(findInputByAriaLabel(tree, 'maxBodyChars').props.value, '800')

  await new Promise((resolve) => setTimeout(resolve, 40))
  assert.deepEqual(host.namespace.setCalls, [{ maxBodyChars: 800 }])
  assert.equal(host.values.maxBodyChars, 800)

  // Simulate closing and reopening the settings page (unmount + remount).
  const getsBeforeReopen = host.namespace.getCalls
  resetMount()
  tree = renderSection(props())
  await new Promise((resolve) => setTimeout(resolve, 30))
  assert.ok(host.namespace.getCalls > getsBeforeReopen, 'reopening section should refresh from host')
  tree = renderSection(props())
  assert.equal(findInputByAriaLabel(tree, 'maxBodyChars').props.value, '800')
})

test('maxBodyChars Enter commit followed by blur does not overwrite with 1 or duplicate save, and Escape cancels', async () => {
  const { exports, resetMount, renderSection } = loadClientBundle()
  const host = await bootLiveHost({ maxBodyChars: 50 })
  const controller = new exports.BarkSectionController(host.namespace, Promise.resolve())
  await controller.load()

  const props = () => ({
    t: (key) => key,
    controller,
    useSnapshot: (selector) => selector(controller.store.getSnapshot()),
  })

  resetMount()
  let tree = renderSection(props())
  let input = findInputByAriaLabel(tree, 'maxBodyChars')

  // Edit to 240 and press Enter, then trigger blur both synchronously and after re-render.
  input.props.onChange({ target: { value: '240' } })
  tree = renderSection(props())
  input = findInputByAriaLabel(tree, 'maxBodyChars')
  let prevented = false
  input.props.onKeyDown({ key: 'Enter', preventDefault: () => { prevented = true }, currentTarget: { blur: () => {} } })
  assert.equal(prevented, true)
  // Same-tick blur must not duplicate save or overwrite with 1.
  input.props.onBlur()
  tree = renderSection(props())
  // Post-render blur must also be a no-op.
  findInputByAriaLabel(tree, 'maxBodyChars').props.onBlur()

  await new Promise((resolve) => setTimeout(resolve, 40))
  assert.deepEqual(host.namespace.setCalls, [{ maxBodyChars: 240 }])
  assert.equal(host.values.maxBodyChars, 240)
  tree = renderSection(props())
  assert.equal(findInputByAriaLabel(tree, 'maxBodyChars').props.value, '240')

  // Edit to 999 and press Escape -> cancels without saving even when blur() fires synchronously.
  findInputByAriaLabel(tree, 'maxBodyChars').props.onChange({ target: { value: '999' } })
  tree = renderSection(props())
  input = findInputByAriaLabel(tree, 'maxBodyChars')
  input.props.onKeyDown({
    key: 'Escape',
    preventDefault: () => {},
    currentTarget: { blur: () => input.props.onBlur() },
  })
  await new Promise((resolve) => setTimeout(resolve, 30))
  tree = renderSection(props())
  assert.equal(findInputByAriaLabel(tree, 'maxBodyChars').props.value, '240')
  assert.deepEqual(host.namespace.setCalls, [{ maxBodyChars: 240 }])
  assert.equal(host.values.maxBodyChars, 240)
})

test('out-of-range values clamp, save failures roll back and display alert, and Bark Group can be cleared', async () => {
  const { exports, resetMount, renderSection } = loadClientBundle()
  const host = await bootLiveHost({ maxBodyChars: 50, group: 'OldGroup' })
  const controller = new exports.BarkSectionController(host.namespace, Promise.resolve())
  await controller.load()

  const props = () => ({
    t: (key, params) => (params ? `${key}:${params.error ?? ''}` : key),
    controller,
    useSnapshot: (selector) => selector(controller.store.getSnapshot()),
  })

  resetMount()
  let tree = renderSection(props())

  // Clamp 9999 -> 4000.
  findInputByAriaLabel(tree, 'maxBodyChars').props.onChange({ target: { value: '9999' } })
  tree = renderSection(props())
  findInputByAriaLabel(tree, 'maxBodyChars').props.onBlur()
  await new Promise((resolve) => setTimeout(resolve, 40))
  assert.equal(host.values.maxBodyChars, 4000)

  // Failed save rolls back displayed value to 4000 and surfaces alert in content card.
  host.setFailNextWrite('disk full')
  tree = renderSection(props())
  findInputByAriaLabel(tree, 'maxBodyChars').props.onChange({ target: { value: '123' } })
  tree = renderSection(props())
  findInputByAriaLabel(tree, 'maxBodyChars').props.onBlur()
  await new Promise((resolve) => setTimeout(resolve, 50))
  tree = renderSection(props())
  assert.equal(findInputByAriaLabel(tree, 'maxBodyChars').props.value, '4000')
  const alerts = findNodes(tree, (n) => n.props?.role === 'alert')
  assert.equal(alerts.length, 1)
  assert.ok(String(alerts[0].props.children).includes('disk full'))

  // Bark Group can be cleared to '' and retyped without snapping back.
  findInputByAriaLabel(tree, 'groupLabel').props.onChange({ target: { value: '' } })
  tree = renderSection(props())
  assert.equal(findInputByAriaLabel(tree, 'groupLabel').props.value, '')
  findInputByAriaLabel(tree, 'groupLabel').props.onChange({ target: { value: 'NewGroup' } })
  tree = renderSection(props())
  findInputByAriaLabel(tree, 'groupLabel').props.onBlur()
  await new Promise((resolve) => setTimeout(resolve, 40))
  assert.equal(host.values.group, 'NewGroup')
  tree = renderSection(props())
  assert.equal(findInputByAriaLabel(tree, 'groupLabel').props.value, 'NewGroup')
})

test('concurrent saves serialize cleanly and updated maxBodyChars takes effect on Bark push notifications', async () => {
  const { exports } = loadClientBundle()
  const host = await bootLiveHost({ maxBodyChars: 300 })
  const controller = new exports.BarkSectionController(host.namespace, Promise.resolve())
  await controller.load()

  // Fire two concurrent saves; both must succeed without revision conflict.
  await Promise.all([
    controller.save({ maxBodyChars: 20 }),
    controller.save({ group: 'FastGroup' }),
  ])
  assert.equal(controller.store.getSnapshot().saveError, null)
  assert.equal(host.values.maxBodyChars, 20)
  assert.equal(host.values.group, 'FastGroup')

  // Verify the saved maxBodyChars actually truncates outgoing Bark push bodies.
  const originalFetch = globalThis.fetch
  let captured = null
  globalThis.fetch = async (url, init) => {
    captured = { url, body: JSON.parse(init.body) }
    return new Response('{"code":200}', { status: 200 })
  }
  try {
    const session = { id: 's-trunc', header: { cwd: '/work/demo' } }
    host.listener(session, {
      type: 'assistant/message',
      seq: 1,
      time: Date.now(),
      data: { turn: 1, step: 1, message: { content: [{ type: 'text', text: 'A'.repeat(200) }] } },
    })
    host.listener(session, {
      type: 'turn/end',
      seq: 2,
      time: Date.now(),
      data: { turn: 1, reason: { kind: 'completed' } },
    })
    await new Promise((resolve) => setTimeout(resolve, 30))
    assert.ok(captured, 'expected Bark push to be sent')
    assert.equal(captured.body.group, 'FastGroup')
    // Truncated body is maxBodyChars (20) + '…' (1) = 21 chars.
    assert.equal(captured.body.body.length, 21)
    assert.ok(captured.body.body.endsWith('…'))
  } finally {
    globalThis.fetch = originalFetch
  }
})
