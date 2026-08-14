/**
 * dsh-notify-bark RPC contract: the /dsh-notify-bark loopback channel the
 * settings section talks to. The browser never receives the Bark URL — the
 * Host answers with a masked status and accepts new values only.
 * @module dsh-notify-bark/rpc-contract
 */

import type { RpcResult } from '@deepseek-ai/dsh-host-apiproxy/api'
import type { BarkSettings } from './settings-store.ts'

/** Logical RPC channel owned by this plugin (registered with loopback authority). */
export const BARK_RPC_CHANNEL = '/dsh-notify-bark' as const

/** Endpoints on the channel. */
export type BarkRpcEndpoint = 'get' | 'set' | 'test'

/** Browser-facing view of the Bark URL: configured fact + masked tail only. */
export interface BarkStatusView {
  /** Whether the section master switch is on. */
  enabled: boolean
  /** Whether a Bark endpoint is configured. */
  configured: boolean
  /** Masked endpoint tail, e.g. "••••••••3F82" (empty when unconfigured). */
  masked: string
}

/** Settings view sent to the browser — barkUrl is never included. */
export type BarkSettingsView = Omit<BarkSettings, 'barkUrl'>

/** `get` response value. */
export interface BarkGetValue {
  settings: BarkSettingsView
  status: BarkStatusView
}

/**
 * `set` request payload. `barkUrl` is optional and carries a NEW value only:
 * the section never restates the stored secret, so omitting it preserves it.
 */
export interface BarkSetPayload {
  patch: Partial<Omit<BarkSettings, 'barkUrl'>> & { barkUrl?: string }
}

/** `test` request payload (optional group override for the test push). */
export interface BarkTestPayload {
  group?: string
}

/** Success branch helper. */
export function ok<T>(value: T): RpcResult<T> {
  return { ok: true, value }
}

/** Error branch helper (internal code; details always empty for our channel). */
export function err(message: string): RpcResult<never> {
  return { ok: false, error: { code: 'internal', message, details: {} } }
}
