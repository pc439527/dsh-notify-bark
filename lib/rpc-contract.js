/**
 * dsh-notify-bark RPC contract: the /dsh-notify-bark loopback channel the
 * settings section talks to. The browser never receives the Bark URL — the
 * Host answers with a masked status and accepts new values only.
 * @module dsh-notify-bark/rpc-contract
 */
/** Logical RPC channel owned by this plugin (registered with loopback authority). */
export const BARK_RPC_CHANNEL = '/dsh-notify-bark';
/** Success branch helper. */
export function ok(value) {
    return { ok: true, value };
}
/** Error branch helper (internal code; details always empty for our channel). */
export function err(message) {
    return { ok: false, error: { code: 'internal', message, details: {} } };
}
//# sourceMappingURL=rpc-contract.js.map