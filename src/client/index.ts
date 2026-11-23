/**
 * dsh-notify-bark browser half — registers the "Bark 通知" settings section
 * and talks to the Host exclusively through the barkNotify Typert Remote
 * namespace on the shared /api channel (the Bark URL is a secret and only
 * travels browser → Host, on a set call).
 *
 * NOTE: the shipped bundle (lib/client.js) is the module-loader build of this
 * entry; this file is the readable TypeScript source it mirrors. Regenerate
 * with the plugin's build toolchain when available.
 * @module dsh-notify-bark/client
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the ui-slots Context merge and the locale namespace map.
import type {} from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls the renderer's Context merge (ctx.slots) for typechecking.
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the settings package's SlotMap merge for 'settings.section'.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the Remote contribution contract for typing.
import type { SnapshotSelectorHook, SnapshotStore } from '@deepseek-ai/dsh-client-store'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import { barkRemote, type BarkGetValue, type BarkNotifyRemoteApi, type BarkSetPatch, type BarkSettingsView } from '../remote-contract.ts'
import { BarkSettingsSection } from './BarkSettings.tsx'
import { en, zh, type BarkNotifyKey } from './locales.ts'

export { BarkSettingsSection, parseBodyCharsDraft } from './BarkSettings.tsx'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** dsh-notify-bark settings copy. */
    'bark-notify': BarkNotifyKey
  }
}

/** Dictionary namespace owned by this plugin. */
export const NS = 'bark-notify'

/** Settings event flags, in display order. */
export const EVENT_KEYS = [
  'completed', 'error', 'blocked', 'aborted',
  'maxTokens', 'interrupted', 'question', 'approval', 'planReview',
] as const

/** Required services (cordis fiber inject; the namespace appears once mounted). */
export const inject = ['slots', 'locale', 'remote'] as const

/** Browser-facing settings view (barkUrl stripped Host-side). */
export type { BarkSettingsView } from '../remote-contract.ts'

/** Section snapshot published by the controller. */
export interface BarkSectionSnapshot {
  status: 'loading' | 'ready' | 'error'
  settings: BarkSettingsView | null
  urlConfigured: boolean
  urlMasked: string
  saveError: string | null
  saving: boolean
  testing: boolean
  testResult: { ok: boolean; message: string } | null
}

/**
 * Host transport for the section: reads the masked status, writes new
 * settings, and fires test pushes through the mounted barkNotify namespace.
 * Calls wait for the mount before the first request; failures land in the
 * snapshot's error face the section renders.
 */
export class BarkSectionController {
  readonly store: SnapshotStore<BarkSectionSnapshot> = createSnapshotStore<BarkSectionSnapshot>({
    status: 'loading',
    settings: null,
    urlConfigured: false,
    urlMasked: '',
    saveError: null,
    saving: false,
    testing: false,
    testResult: null,
  })

  private queue: Promise<void> = Promise.resolve()
  private pendingSaves = 0

  constructor(private readonly namespace: BarkNotifyRemoteApi, private readonly mounted: Promise<unknown>) {
    void this.load()
  }

  private async fetchIntoStore(preserveError: boolean): Promise<void> {
    try {
      await this.mounted
      const result = await this.namespace.get()
      if (!result.ok) throw new Error(result.error.message)
      const value = result.value as BarkGetValue
      this.store.update((draft) => {
        draft.status = 'ready'
        draft.settings = value.settings
        draft.urlConfigured = value.status.configured
        draft.urlMasked = value.status.masked
        if (!preserveError) draft.saveError = null
      })
    } catch (error) {
      if (preserveError) return
      const message = error instanceof Error ? error.message : String(error)
      this.store.update((draft) => {
        if (draft.settings === null) draft.status = 'error'
        draft.saveError = message
      })
    }
  }

  async load(): Promise<void> {
    const task = this.queue.then(async () => {
      if (this.pendingSaves > 0) return
      await this.fetchIntoStore(false)
    })
    this.queue = task.catch(() => {})
    return task
  }

  async save(patch: BarkSetPatch): Promise<void> {
    this.pendingSaves += 1
    this.store.update((draft) => {
      draft.saving = true
      draft.saveError = null
      if (draft.settings !== null) {
        const next = { ...draft.settings }
        if (patch.enabled !== undefined) next.enabled = patch.enabled
        if (patch.events !== undefined) next.events = { ...next.events, ...patch.events }
        if (patch.includeAssistantText !== undefined) next.includeAssistantText = patch.includeAssistantText
        if (patch.maxBodyChars !== undefined) next.maxBodyChars = patch.maxBodyChars
        if (patch.group !== undefined) next.group = patch.group
        draft.settings = next
      }
    })
    const task = this.queue.then(async () => {
      try {
        await this.mounted
        const result = await this.namespace.set(patch)
        if (!result.ok) throw new Error(result.error.message)
        if (this.pendingSaves === 1) {
          await this.fetchIntoStore(false)
        }
      } catch (error) {
        this.store.update((draft) => {
          draft.saveError = error instanceof Error ? error.message : String(error)
        })
        if (this.pendingSaves === 1) {
          await this.fetchIntoStore(true)
        }
      } finally {
        this.pendingSaves -= 1
        if (this.pendingSaves === 0) {
          this.store.update((draft) => {
            draft.saving = false
          })
        }
      }
    })
    this.queue = task.catch(() => {})
    return task
  }

  async test(group: string): Promise<void> {
    this.store.update((draft) => {
      draft.testing = true
      draft.testResult = null
    })
    try {
      await this.mounted
      const result = await this.namespace.test(group)
      if (!result.ok) throw new Error(result.error.message)
      this.store.update((draft) => {
        draft.testResult = { ok: true, message: 'sent' }
      })
    } catch (error) {
      this.store.update((draft) => {
        draft.testResult = { ok: false, message: error instanceof Error ? error.message : String(error) }
      })
    } finally {
      this.store.update((draft) => {
        draft.testing = false
      })
    }
  }
}

/**
 * Register the Bark dictionaries and the settings section.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-notify-bark: dictionaries')

  // Mount the barkNotify contribution on the plugin fiber; every Consumer
  // awaits the handle before its first call.
  const mounted = ctx.remote.$mount(barkRemote)
  ctx.inject(['slots', 'locale', 'remote', 'remote.barkNotify'], (scope) => {
    const controller = new BarkSectionController(scope.get('remote.barkNotify') as BarkNotifyRemoteApi, mounted)
    const bound = scope.locale.bind(NS)
    // The component consumes a broad string-keyed translate; the binder is
    // typed to the namespace key union, so widen it here.
    const t = (key: string, params?: Record<string, string>): string => bound(key as BarkNotifyKey, params)
    const injected = () => ({ controller, t, hooks: { snapshot: controller.store } })

    scope.slots.inject('settings.section', () => scope.slots.register({
      name: 'settings.section',
      id: 'bark-notify',
      order: 40,
      label: () => t('nav'),
      inject: injected,
    }, BarkSettingsSection))
  })
}

/** Selector-hook face the framework synthesizes for the section (doc anchor). */
export type SectionHooks = { snapshot: SnapshotSelectorHook<BarkSectionSnapshot> }