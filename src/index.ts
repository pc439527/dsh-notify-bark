/**
 * dsh-notify-bark — Host half.
 *
 * Mounts three pieces:
 *   1. a `bark` settings namespace (ctx.settings → $DSH_HOME/settings.yaml,
 *      live-applied), so the section's values survive restarts;
 *   2. the session/event listener that turns turn endings, user questions,
 *      plan reviews, and approval requests into Bark pushes (Host-side, so the
 *      browser being closed does not matter);
 *   3. the /dsh-notify-bark loopback RPC the settings section reads and writes
 *      through (the Bark URL never crosses the wire — only a masked status).
 *
 * The browser half (the `./client` entry) registers the settings section.
 * @module dsh-notify-bark
 */

import { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the ctx.connection merge from the Host connection service.
import type {} from '@deepseek-ai/dsh-client-connection'
// Type-only: pulls the ctx.settings merge from the settings seam.
import type {} from '@deepseek-ai/dsh-settings'
// Type-only: pulls the session/event listener types.
import type {} from '@deepseek-ai/dsh-session'
import { createEventListener } from './event-listener.ts'
import { registerBarkRpc } from './rpc.ts'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import {
  BARK_SETTINGS_NAMESPACE,
  DEFAULT_SETTINGS,
  barkSettingsSchema,
  type BarkSettings,
} from './settings-store.ts'

/** Stable cordis plugin name (matches the cordis.patch.yml insert id). */
export const name = 'bark-notify'

/**
 * Required services: none hard — the settings seam and the connection service
 * are each awaited through `ctx.inject` inside apply, so a profile lacking
 * either still runs the event listener with composed defaults.
 */
export const inject: string[] = []

/**
 * Plugin entry.
 * @param ctx - plugin context.
 * @param config - composition-layer overrides (entry config), merged below defaults.
 */
export function apply(ctx: Context, config: Partial<BarkSettings> = {}): void {
  const base: BarkSettings = {
    ...DEFAULT_SETTINGS,
    ...config,
    events: { ...DEFAULT_SETTINGS.events, ...config.events },
  }

  // Resolved settings; the default until the settings seam mounts.
  let current: () => BarkSettings = () => base
  // Persist handle; absent until the settings seam mounts.
  let persist: ((patch: object) => Promise<void>) | undefined

  ctx.inject(['settings'], (sctx) => {
    const scope = sctx.settings.register(settingsNamespace(BARK_SETTINGS_NAMESPACE), barkSettingsSchema, {
      base,
      applies: 'live',
    })
    current = () => scope.get()
    persist = (patch: object) => scope.update(patch)
    // When the registration fiber tears down (settings service disposal),
    // fall back to the composition defaults.
    sctx.effect(() => () => {
      current = () => base
      persist = undefined
    }, 'bark-notify: settings fallback')
  })

  registerBarkRpc(ctx, {
    getSettings: () => current(),
    update: async (patch: object) => {
      if (persist === undefined) throw new Error('设置服务不可用')
      await persist(patch)
    },
  })

  createEventListener(ctx, () => current())
}