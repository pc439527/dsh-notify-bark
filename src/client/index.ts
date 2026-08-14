/**
 * dsh-notify-bark browser half — registers the "Bark 通知" settings section
 * and talks to the Host exclusively through the /dsh-notify-bark loopback RPC
 * (the Bark endpoint is a secret and never crosses the wire).
 *
 * NOTE: the shipped bundle (lib/client.js) is the module-loader build of this
 * entry; this file is the readable TypeScript source it mirrors. Regenerate
 * with the plugin's build toolchain when available.
 * @module dsh-notify-bark/client
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the ui-slots Context merge (ctx.slots) and the locale map.
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-web-react'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import { BarkSettingsSection } from './BarkSettings.tsx'
import { en, zh, type BarkNotifyKey } from './locales.ts'

export { BarkSettingsSection } from './BarkSettings.tsx'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** dsh-notify-bark settings copy. */
    'bark-notify': BarkNotifyKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'bark-notify'

/** Logical RPC channel owned by this plugin. */
export const RPC_CHANNEL = '/dsh-notify-bark'

/** Settings event flags, in display order. */
export const EVENT_KEYS = [
  'completed', 'error', 'blocked', 'aborted',
  'maxTokens', 'interrupted', 'question', 'approval', 'planReview',
] as const

/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale', 'connection'] as const

/** Browser-facing settings view (barkUrl stripped Host-side). */
export interface BarkSettingsView {
  enabled: boolean
  events: Record<string, boolean>
  includeAssistantText: boolean
  maxBodyChars: number
  group: string
}

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
 * settings, and fires test pushes through the /dsh-notify-bark RPC.
 */
export class BarkSectionController {
  readonly store = createSnapshotStore<BarkSectionSnapshot>({
    status: 'loading',
    settings: null,
    urlConfigured: false,
    urlMasked: '',
    saveError: null,
    saving: false,
    testing: false,
    testResult: null,
  })

  constructor(private readonly connection: { rpc: { call(channel: string, endpoint: string, payload: unknown): Promise<{ ok: boolean; value?: unknown; error?: { message: string } }> } }) {
    void this.load()
  }

  async load(): Promise<void> {
    try {
      const result = await this.connection.rpc.call(RPC_CHANNEL, 'get', {})
      if (!result.ok) throw new Error(result.error?.message ?? 'RPC failed')
      const value = result.value as { settings: BarkSettingsView; status: { configured: boolean; masked: string } }
      this.store.update((draft) => {
        draft.status = 'ready'
        draft.settings = value.settings
        draft.urlConfigured = value.status.configured
        draft.urlMasked = value.status.masked
        draft.saveError = null
      })
    } catch (error) {
      this.store.update((draft) => {
        draft.status = 'error'
        draft.saveError = error instanceof Error ? error.message : String(error)
      })
    }
  }

  async save(patch: Record<string, unknown>): Promise<void> {
    this.store.update((draft) => {
      draft.saving = true
      draft.saveError = null
    })
    try {
      const result = await this.connection.rpc.call(RPC_CHANNEL, 'set', { patch })
      if (!result.ok) throw new Error(result.error?.message ?? 'RPC failed')
      await this.load()
    } catch (error) {
      this.store.update((draft) => {
        draft.saveError = error instanceof Error ? error.message : String(error)
      })
    } finally {
      this.store.update((draft) => {
        draft.saving = false
      })
    }
  }

  async test(group: string): Promise<void> {
    this.store.update((draft) => {
      draft.testing = true
      draft.testResult = null
    })
    try {
      const result = await this.connection.rpc.call(RPC_CHANNEL, 'test', { group })
      if (!result.ok) throw new Error(result.error?.message ?? 'RPC failed')
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

  ctx.inject(['slots', 'locale', 'connection'], (scope) => {
    const connection = scope.get('connection') as { rpc: { call(channel: string, endpoint: string, payload: unknown): Promise<unknown> } }
    const controller = new BarkSectionController(connection as never)
    const useBark = bindSnapshotSelector(controller.store)
    const t = scope.locale.bind(NS)

    scope.slots.inject('settings.section', () => scope.slots.register({
      name: 'settings.section',
      id: 'bark-notify',
      order: 40,
      label: () => t('nav'),
      locale: NS,
      inject: () => ({ controller, useBark }),
    }, BarkSettingsSection))
  })
}
