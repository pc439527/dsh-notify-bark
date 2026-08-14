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
import { createEventListener } from "./event-listener.js";
import { registerBarkRpc } from "./rpc.js";
import { settingsNamespace } from '@deepseek-ai/dsh-settings';
import { BARK_SETTINGS_NAMESPACE, DEFAULT_SETTINGS, barkSettingsSchema, } from "./settings-store.js";
/** Stable cordis plugin name (matches the cordis.patch.yml insert id). */
export const name = 'bark-notify';
/**
 * Required services: none hard — the settings seam and the connection service
 * are each awaited through `ctx.inject` inside apply, so a profile lacking
 * either still runs the event listener with composed defaults.
 */
export const inject = [];
/**
 * Plugin entry.
 * @param ctx - plugin context.
 * @param config - composition-layer overrides (entry config), merged below defaults.
 */
export function apply(ctx, config = {}) {
    const base = {
        ...DEFAULT_SETTINGS,
        ...config,
        events: { ...DEFAULT_SETTINGS.events, ...config.events },
    };
    // Resolved settings; the default until the settings seam mounts.
    let current = () => base;
    // Persist handle; absent until the settings seam mounts.
    let persist;
    ctx.inject(['settings'], (sctx) => {
        const scope = sctx.settings.register(settingsNamespace(BARK_SETTINGS_NAMESPACE), barkSettingsSchema, {
            base,
            applies: 'live',
        });
        current = () => scope.get();
        persist = (patch) => scope.update(patch);
        // When the registration fiber tears down (settings service disposal),
        // fall back to the composition defaults.
        sctx.effect(() => () => {
            current = () => base;
            persist = undefined;
        }, 'bark-notify: settings fallback');
    });
    registerBarkRpc(ctx, {
        getSettings: () => current(),
        update: async (patch) => {
            if (persist === undefined)
                throw new Error('设置服务不可用');
            await persist(patch);
        },
    });
    createEventListener(ctx, () => current());
}
//# sourceMappingURL=index.js.map