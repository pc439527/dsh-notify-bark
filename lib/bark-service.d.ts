/**
 * dsh-notify-bark Bark HTTP sender: one JSON POST to the configured endpoint
 * with a bounded timeout and a stable error taxonomy. The endpoint is treated
 * as a credential — callers must never log it.
 * @module dsh-notify-bark/bark-service
 */
import { type BarkLevel } from './settings-store.ts';
/** Payload accepted by the Bark V2 server (POST <base> as JSON). */
export interface BarkPayload {
    title: string;
    body: string;
    group?: string;
    level?: BarkLevel;
    sound?: string;
    url?: string;
}
/** Stable send-failure taxonomy surfaced to the settings section. */
export declare const BARK_ERROR_CODES: {
    readonly NOT_CONFIGURED: "BARK_NOT_CONFIGURED";
    readonly HTTP_ERROR: "BARK_HTTP_ERROR";
    readonly NETWORK_ERROR: "BARK_NETWORK_ERROR";
    readonly TIMEOUT: "BARK_TIMEOUT";
};
/** A Bark delivery failure with a stable machine code. */
export declare class BarkSendError extends Error {
    /** Stable machine code from {@link BARK_ERROR_CODES}. */
    code: string;
    constructor(message: string, code: string);
}
/**
 * POST a Bark notification to `endpoint`.
 * @param endpoint - full Bark endpoint (https://api.day.app/<key> or a self-hosted server).
 * @param payload - Bark V2 JSON payload.
 * @param timeoutMs - abort bound for the whole request.
 * @throws {BarkSendError} on missing endpoint, non-2xx, timeout, or network failure.
 */
export declare function sendBark(endpoint: string, payload: BarkPayload, timeoutMs?: number): Promise<void>;
/**
 * Build the test-notification payload. The test fires from the settings
 * section, so the workspace title is fixed copy.
 */
export declare function buildTestPayload(group: string): BarkPayload;
//# sourceMappingURL=bark-service.d.ts.map