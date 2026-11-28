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
import { Context } from '@deepseek-ai/cordis';
import { Config } from './settings-store.ts';
/** Stable cordis plugin name (matches the cordis.patch.yml insert id). */
export declare const name = "bark-notify";
/**
 * Settings is optional: profiles without it can still send notifications
 * using the resolved Config.
 */
export declare const inject: string[];
/**
 * The plugin entry's profile id. DSH 0.2 addresses settings by profile entry
 * id, and `cordis.patch.yml` inserts this row as `bark-notify`; every write
 * through `ctx.settings` is keyed by this value.
 */
export declare const PROFILE_ENTRY_ID = "bark-notify";
export { Config };
/**
 * Plugin entry.
 * @param ctx - plugin context.
 * @param config - resolved volatile config: field access always follows the
 *   current settings document.
 */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map