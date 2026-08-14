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
import { Context } from '@deepseek-ai/cordis';
import { type BarkSettings } from './settings-store.ts';
/** Stable cordis plugin name (matches the cordis.patch.yml insert id). */
export declare const name = "bark-notify";
/**
 * Required services: none hard — the settings seam and the connection service
 * are each awaited through `ctx.inject` inside apply, so a profile lacking
 * either still runs the event listener with composed defaults.
 */
export declare const inject: string[];
/**
 * Plugin entry.
 * @param ctx - plugin context.
 * @param config - composition-layer overrides (entry config), merged below defaults.
 */
export declare function apply(ctx: Context, config?: Partial<BarkSettings>): void;
//# sourceMappingURL=index.d.ts.map