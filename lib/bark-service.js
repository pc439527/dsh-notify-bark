/**
 * dsh-notify-bark Bark HTTP sender: one JSON POST to the configured endpoint
 * with a bounded timeout and a stable error taxonomy. The endpoint is treated
 * as a credential — callers must never log it.
 * @module dsh-notify-bark/bark-service
 */
import { sanitizeBarkUrl } from "./settings-store.js";
/** Stable send-failure taxonomy surfaced to the settings section. */
export const BARK_ERROR_CODES = {
    NOT_CONFIGURED: 'BARK_NOT_CONFIGURED',
    HTTP_ERROR: 'BARK_HTTP_ERROR',
    NETWORK_ERROR: 'BARK_NETWORK_ERROR',
    TIMEOUT: 'BARK_TIMEOUT',
    CANCELLED: 'BARK_CANCELLED',
};
/** A Bark delivery failure with a stable machine code. */
export class BarkSendError extends Error {
    /** Stable machine code from {@link BARK_ERROR_CODES}. */
    code;
    constructor(message, code) {
        super(message);
        this.name = 'BarkSendError';
        this.code = code;
    }
}
/**
 * POST a Bark notification to `endpoint`.
 * @param endpoint - full Bark endpoint (https://api.day.app/<key> or a self-hosted server).
 * @param payload - Bark V2 JSON payload.
 * @param timeoutMs - abort bound for the whole request.
 * @param lifetime - optional signal that cancels delivery when the plugin unloads.
 * @throws {BarkSendError} on invalid endpoint, non-2xx, cancellation, timeout, or network failure.
 */
export async function sendBark(endpoint, payload, timeoutMs = 5000, lifetime) {
    const base = sanitizeBarkUrl(endpoint);
    if (base.length === 0) {
        const message = endpoint.trim().length === 0
            ? '未配置 Bark 推送地址'
            : 'Bark 推送地址不是合法 http(s) URL，请检查基础地址';
        throw new BarkSendError(message, BARK_ERROR_CODES.NOT_CONFIGURED);
    }
    const timeout = new AbortController();
    const signal = lifetime === undefined ? timeout.signal : AbortSignal.any([lifetime, timeout.signal]);
    const timer = setTimeout(() => timeout.abort(), timeoutMs);
    try {
        signal.throwIfAborted();
        const response = await fetch(base, {
            method: 'POST',
            headers: { 'content-type': 'application/json; charset=utf-8' },
            body: JSON.stringify(payload),
            signal,
        });
        // The response body and transport errors can echo the endpoint or payload.
        void response.body?.cancel().catch(() => { });
        if (!response.ok) {
            throw new BarkSendError(`Bark HTTP ${response.status}`, BARK_ERROR_CODES.HTTP_ERROR);
        }
    }
    catch (error) {
        if (error instanceof BarkSendError)
            throw error;
        if (timeout.signal.aborted && signal.reason === timeout.signal.reason) {
            throw new BarkSendError(`Bark 请求超时（${timeoutMs}ms）`, BARK_ERROR_CODES.TIMEOUT);
        }
        if (lifetime?.aborted)
            throw new BarkSendError('Bark 推送已取消', BARK_ERROR_CODES.CANCELLED);
        throw new BarkSendError('Bark 网络请求失败，请检查连接和推送地址', BARK_ERROR_CODES.NETWORK_ERROR);
    }
    finally {
        clearTimeout(timer);
    }
}
/**
 * Build the test-notification payload. The test fires from the settings
 * section, so the workspace title is fixed copy.
 */
export function buildTestPayload(group) {
    return {
        title: 'DeepSeek Harness',
        body: '🔔 Bark 通知已连通\n这是一条来自 DSH 的测试推送。',
        group,
        level: 'active',
    };
}
//# sourceMappingURL=bark-service.js.map