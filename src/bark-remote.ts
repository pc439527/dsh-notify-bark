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

import type { Context } from '@deepseek-ai/cordis'
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { buildTestPayload, sendBark } from './bark-service.ts'
import { maskBarkUrl, sanitizeBarkUrl, type BarkSettings } from './settings-store.ts'
import {
  BARK_REMOTE_NAMESPACE,
  type BarkGetValue,
  type BarkSetPatch,
  type BarkSetResult,
  type BarkTestResult,
  validateSetPatch,
} from './remote-contract.ts'

/** What the Remote service needs from the plugin body. */
export interface BarkRemoteDeps {
  /** Live resolved settings (follows the settings document). */
  getSettings(): BarkSettings
  /** Persist a validated patch into the plugin's settings namespace. */
  update(patch: BarkSetPatch): Promise<void>
}

/**
 * The barkNotify Remote service: get / set / test over the shared /api channel.
 * get answers with the masked status and never echoes the endpoint; set
 * accepts new values only; test sends one push from the configured endpoint.
 */
export class BarkSettingsRemote extends TypertRemoteService {
  private readonly deps: BarkRemoteDeps

  constructor(ctx: Context, deps: BarkRemoteDeps) {
    super(ctx, BARK_REMOTE_NAMESPACE)
    this.deps = deps
  }

  @Remote async get(): Promise<BarkGetValue> {
    const settings = this.deps.getSettings()
    const { configured, masked } = maskBarkUrl(settings.barkUrl)
    return {
      settings: {
        enabled: settings.enabled,
        events: settings.events,
        includeAssistantText: settings.includeAssistantText,
        maxBodyChars: settings.maxBodyChars,
        group: settings.group,
      },
      status: { enabled: settings.enabled, configured, masked },
    }
  }

  @Remote async set(patch: unknown): Promise<BarkSetResult> {
    const verdict = validateSetPatch(patch)
    if (verdict.message !== undefined || verdict.patch === undefined) {
      throw new RemoteError('gateway/bad-request', verdict.message ?? 'set: patch must be an object', {})
    }
    await this.deps.update(verdict.patch)
    return { saved: true }
  }

  @Remote async test(group?: string): Promise<BarkTestResult> {
    const settings = this.deps.getSettings()
    const endpoint = sanitizeBarkUrl(settings.barkUrl)
    if (endpoint.length === 0) {
      throw new RemoteError('gateway/bad-request', '未配置有效的 Bark 推送地址（请只填写基础地址，不要粘贴 curl 命令），请先修正并保存', {})
    }
    const resolved = typeof group === 'string' && group.trim().length > 0 ? group.trim() : settings.group
    await sendBark(endpoint, buildTestPayload(resolved))
    return { sent: true }
  }
}

/**
 * Publish the Remote service for the plugin's fiber.
 * @param ctx - plugin context.
 * @param deps - settings read/write access.
 */
export function registerBarkRemote(ctx: Context, deps: BarkRemoteDeps): void {
  new BarkSettingsRemote(ctx, deps)
}