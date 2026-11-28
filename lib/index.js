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
import { createEventListener } from "./event-listener.js";
import { registerBarkRemote } from "./bark-remote.js";
import { Config, readBarkSettings } from "./settings-store.js";
/** Stable cordis plugin name (matches the cordis.patch.yml insert id). */
export const name = 'bark-notify';
/**
 * Settings is optional: profiles without it can still send notifications
 * using the resolved Config.
 */
export const inject = [];
/**
 * The plugin entry's profile id. DSH 0.2 addresses settings by profile entry
 * id, and `cordis.patch.yml` inserts this row as `bark-notify`; every write
 * through `ctx.settings` is keyed by this value.
 */
export const PROFILE_ENTRY_ID = 'bark-notify';
// Re-export the schema so the Loader registers it as this entry's Config.
export { Config };
/**
 * Plugin entry.
 * @param ctx - plugin context.
 * @param config - resolved volatile config: field access always follows the
 *   current settings document.
 */
export function apply(ctx, config) {
    const read = () => readBarkSettings(config);
    const delivery = new AbortController();
    ctx.effect(() => () => delivery.abort(), 'bark-notify: cancel pending deliveries');
    // The settings service may be absent (headless compositions); writes then
    // reject with an actionable message instead of failing plugin load.
    let settings;
    ctx.inject(['settings'], (sctx) => {
        settings = sctx.settings;
        // This plugin owns its own settings section: suppress the auto-generated
        // page so the Plugins inventory does not render a second one.
        sctx.effect(() => sctx.settings.configure({ auto: false }, ctx.fiber), 'bark-notify: settings page policy');
        // When the registration fiber tears down (settings service disposal),
        // writes fail soft again.
        sctx.effect(() => () => {
            settings = undefined;
        }, 'bark-notify: settings fallback');
    });
    let updateQueue = Promise.resolve();
    registerBarkRemote(ctx, {
        getSettings: read,
        deliverySignal: delivery.signal,
        update: async (patch) => {
            const run = async () => {
                const forms = settings;
                if (forms === undefined)
                    throw new Error('设置服务不可用');
                const row = forms.describe({ redactSecrets: true }).find((entry) => entry.ns === PROFILE_ENTRY_ID);
                if (row === undefined)
                    throw new Error('Bark 通知设置条目不可用，请刷新后重试');
                await forms.update(PROFILE_ENTRY_ID, patch, row.revision);
            };
            const task = updateQueue.then(run, run);
            updateQueue = task.catch(() => { });
            await task;
        },
    });
    createEventListener(ctx, read, delivery.signal);
}
//# sourceMappingURL=index.js.map