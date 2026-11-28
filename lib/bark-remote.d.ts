/**
 * dsh-notify-bark Host Remote service — the barkNotify namespace.
 *
 * The service rides DSH's Typert Remote path: `TypertRemoteService` publishes
 * the binding, the Gateway discovers the `@Remote` methods (SRC mode derives
 * the descriptor from the live method signatures), and every browser call
 * crosses the authenticated shared /api channel the same way the official
 * surfaces do. The service stays business-only: validation, masked reads, and
 * Host-side persistence.
 * @module dsh-notify-bark/bark-remote
 */
import type { Context } from '@deepseek-ai/cordis';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { type BarkSettings } from './settings-store.ts';
import { type BarkGetValue, type BarkSetPatch, type BarkSetResult, type BarkTestResult } from './remote-contract.ts';
/** What the Remote service needs from the plugin body. */
export interface BarkRemoteDeps {
    /** Live resolved settings (follows the settings document). */
    getSettings(): BarkSettings;
    /** Cancels test deliveries when the plugin unloads. */
    deliverySignal?: AbortSignal;
    /** Persist a validated patch into the plugin's settings namespace. */
    update(patch: BarkSetPatch): Promise<void>;
}
/**
 * The barkNotify Remote service: get / set / test over the shared /api channel.
 * get answers with the masked status and never echoes the endpoint; set
 * accepts new values only; test sends one push from the configured endpoint.
 */
export declare class BarkSettingsRemote extends TypertRemoteService {
    private readonly deps;
    constructor(ctx: Context, deps: BarkRemoteDeps);
    get(): Promise<BarkGetValue>;
    set(patch: unknown): Promise<BarkSetResult>;
    test(group?: string): Promise<BarkTestResult>;
}
/**
 * Publish the Remote service for the plugin's fiber.
 * @param ctx - plugin context.
 * @param deps - settings read/write access.
 */
export declare function registerBarkRemote(ctx: Context, deps: BarkRemoteDeps): void;
//# sourceMappingURL=bark-remote.d.ts.map