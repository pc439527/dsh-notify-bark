/**
 * dsh-notify-bark — Host half.
 *
 * Mounts three pieces:
 *   1. the plugin's Loader `Config` schema (volatile fields → live references
 *      persisted through DSH's settings document and hot-applied in place);
 *   2. the session/event listener that turns turn endings, user questions,
 *      plan reviews, and approval requests into Bark pushes (Host-side, so the
 *      browser being closed does not matter);
 *   3. the barkNotify Typert Remote the settings section reads and writes
 *      through the shared /api channel (the Bark URL never rides a read).
 *
 * The browser half (the `./client` entry) registers the settings section.
 * @module dsh-notify-bark
 */

import { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the ctx.settings merge from the settings seam.
import type { SettingsForms } from '@deepseek-ai/dsh-settings'
// Type-only: pulls the session/event listener types.
import type {} from '@deepseek-ai/dsh-session'
// Type-only: pulls dsh-user-approval's session event-map augmentation, which
// adds the approval/asked event to the SessionEventMap interface.
import type {} from '@deepseek-ai/dsh-user-approval'
import { createEventListener } from './event-listener.ts'
import { registerBarkRemote } from './bark-remote.ts'
import { Config, readBarkSettings, type BarkSettings } from './settings-store.ts'
import type { BarkSetPatch } from './remote-contract.ts'

/** Stable cordis plugin name (matches the cordis.patch.yml insert id). */
export const name = 'bark-notify'

/**
 * Required services: none hard — the settings seam and the connection service
 * are each awaited through `ctx.inject` inside apply, so a profile lacking
 * either still runs the event listener with the composition defaults.
 */
export const inject: string[] = []

/**
 * The plugin entry's profile id. DSH 0.2 addresses settings by profile entry
 * id, and `cordis.patch.yml` inserts this row as `bark-notify`; every write
 * through `ctx.settings` is keyed by this value.
 */
export const PROFILE_ENTRY_ID = 'bark-notify'

// Re-export the schema so the Loader registers it as this entry's Config.
export { Config }

/**
 * Plugin entry.
 * @param ctx - plugin context.
 * @param config - resolved volatile config: field access always follows the
 *   current settings document.
 */
export function apply(ctx: Context, config: Config): void {
  const read = (): BarkSettings => readBarkSettings(config)

  // The settings service may be absent (headless compositions); writes then
  // reject with an actionable message instead of failing plugin load.
  let settings: SettingsForms | undefined

  ctx.inject(['settings'], (sctx) => {
    settings = sctx.settings
    // This plugin owns its own settings section: suppress the auto-generated
    // page so the Plugins inventory does not render a second one.
    sctx.effect(() => sctx.settings.configure({ auto: false }, ctx.fiber), 'bark-notify: settings page policy')
    // When the registration fiber tears down (settings service disposal),
    // writes fail soft again.
    sctx.effect(() => () => {
      settings = undefined
    }, 'bark-notify: settings fallback')
  })

  let updateQueue: Promise<void> = Promise.resolve()

  registerBarkRemote(ctx, {
    getSettings: read,
    update: async (patch: BarkSetPatch) => {
      const run = async (): Promise<void> => {
        const forms = settings
        if (forms === undefined) throw new Error('设置服务不可用')
        const row = forms.describe().find((entry) => String(entry.ns) === PROFILE_ENTRY_ID)
        await forms.update(PROFILE_ENTRY_ID, patch, row?.revision)
      }
      const task = updateQueue.then(run, run)
      updateQueue = task.catch(() => {})
      await task
    },
  })

  createEventListener(ctx, read)
}