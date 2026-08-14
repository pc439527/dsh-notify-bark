/**
 * dsh-notify-bark Bark HTTP sender: one JSON POST to the configured endpoint
 * with a bounded timeout and a stable error taxonomy. The endpoint is treated
 * as a credential — callers must never log it.
 * @module dsh-notify-bark/bark-service
 */

import { sanitizeBarkUrl, type BarkLevel } from './settings-store.ts'

/** Payload accepted by the Bark V2 server (POST <base> as JSON). */
export interface BarkPayload {
  title: string
  body: string
  group?: string
  level?: BarkLevel
  sound?: string
  url?: string
}

/** Stable send-failure taxonomy surfaced to the settings section. */
export const BARK_ERROR_CODES = {
  NOT_CONFIGURED: 'BARK_NOT_CONFIGURED',
  HTTP_ERROR: 'BARK_HTTP_ERROR',
  NETWORK_ERROR: 'BARK_NETWORK_ERROR',
  TIMEOUT: 'BARK_TIMEOUT',
} as const

/** A Bark delivery failure with a stable machine code. */
export class BarkSendError extends Error {
  /** Stable machine code from {@link BARK_ERROR_CODES}. */
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'BarkSendError'
    this.code = code
  }
}

/**
 * POST a Bark notification to `endpoint`.
 * @param endpoint - full Bark endpoint (https://api.day.app/<key> or a self-hosted server).
 * @param payload - Bark V2 JSON payload.
 * @param timeoutMs - abort bound for the whole request.
 * @throws {BarkSendError} on missing endpoint, non-2xx, timeout, or network failure.
 */
export async function sendBark(endpoint: string, payload: BarkPayload, timeoutMs = 5000): Promise<void> {
  const base = sanitizeBarkUrl(endpoint)
  if (base.length === 0) throw new BarkSendError('未配置 Bark 推送地址', BARK_ERROR_CODES.NOT_CONFIGURED)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(base, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    if (!response.ok) {
      const text = (await response.text().catch(() => '')).slice(0, 200)
      throw new BarkSendError(
        `Bark HTTP ${response.status}${text.length > 0 ? `: ${text}` : ''}`,
        BARK_ERROR_CODES.HTTP_ERROR,
      )
    }
  } catch (error) {
    if (error instanceof BarkSendError) throw error
    const timedOut = error instanceof Error && error.name === 'AbortError'
    if (timedOut) throw new BarkSendError(`Bark 请求超时（${timeoutMs}ms）`, BARK_ERROR_CODES.TIMEOUT)
    const detail = error instanceof Error ? error.message : String(error)
    throw new BarkSendError(`Bark 请求失败: ${detail}`, BARK_ERROR_CODES.NETWORK_ERROR)
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Build the test-notification payload. The test fires from the settings
 * section, so the workspace title is fixed copy.
 */
export function buildTestPayload(group: string): BarkPayload {
  return {
    title: 'DeepSeek Harness',
    body: '🔔 Bark 通知已连通\n这是一条来自 DSH 的测试推送。',
    group,
    level: 'active',
  }
}
