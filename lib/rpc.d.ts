/**
 * dsh-notify-bark Host RPC: registers the /dsh-notify-bark loopback channel
 * (the same pattern dsh-codex-auth uses) so the settings section can read the
 * masked status, write new settings, and fire test pushes — all Host-side.
 * @module dsh-notify-bark/rpc
 */
import type { Context } from '@deepseek-ai/cordis';
import { type BarkSettings } from './settings-store.ts';
/** What the RPC layer needs from the plugin body. */
export interface BarkRpcDeps {
    /** Live resolved settings (follows the settings section). */
    getSettings(): BarkSettings;
    /** Persist a partial patch into the plugin's settings namespace. */
    update(patch: object): Promise<void>;
}
/**
 * Register the plugin's RPC channel. Registered through `ctx.inject` so a
 * profile without the connection service still runs the event listener.
 * @param ctx - plugin context.
 * @param deps - settings read/write access.
 */
export declare function registerBarkRpc(ctx: Context, deps: BarkRpcDeps): void;
//# sourceMappingURL=rpc.d.ts.map