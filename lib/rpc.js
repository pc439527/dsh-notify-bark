/**
 * dsh-notify-bark Host RPC: registers the /dsh-notify-bark loopback channel
 * (the same pattern dsh-codex-auth uses) so the settings section can read the
 * masked status, write new settings, and fire test pushes — all Host-side.
 * @module dsh-notify-bark/rpc
 */
import { buildTestPayload, sendBark } from "./bark-service.js";
import { maskBarkUrl, sanitizeBarkUrl } from "./settings-store.js";
import { BARK_RPC_CHANNEL, err, ok, } from "./rpc-contract.js";
/** Guard a set patch against unknown fields and wrong scalar types. */
function validatePatch(patch) {
    if (typeof patch !== 'object' || patch === null || Array.isArray(patch)) {
        return { message: 'set: patch must be an object' };
    }
    const record = patch;
    const allowed = new Set([
        'enabled',
        'barkUrl',
        'events',
        'includeAssistantText',
        'maxBodyChars',
        'group',
    ]);
    for (const [key, value] of Object.entries(record)) {
        if (!allowed.has(key))
            return { message: `set: unknown field ${key}` };
        if (key === 'enabled' || key === 'includeAssistantText') {
            if (typeof value !== 'boolean')
                return { message: `set: ${key} must be a boolean` };
        }
        else if (key === 'maxBodyChars') {
            if (typeof value !== 'number' || !Number.isFinite(value))
                return { message: 'set: maxBodyChars must be a number' };
        }
        else if (key === 'barkUrl' || key === 'group') {
            if (typeof value !== 'string')
                return { message: `set: ${key} must be a string` };
        }
        else if (key === 'events') {
            if (typeof value !== 'object' || value === null || Array.isArray(value)) {
                return { message: 'set: events must be an object' };
            }
        }
    }
    return {};
}
/**
 * Register the plugin's RPC channel. Registered through `ctx.inject` so a
 * profile without the connection service still runs the event listener.
 * @param ctx - plugin context.
 * @param deps - settings read/write access.
 */
export function registerBarkRpc(ctx, deps) {
    ctx.inject(['connection'], (sctx) => {
        const handler = async (endpoint, payload) => {
            try {
                switch (endpoint) {
                    case 'get': {
                        const settings = deps.getSettings();
                        const { configured, masked } = maskBarkUrl(settings.barkUrl);
                        const value = {
                            settings: {
                                enabled: settings.enabled,
                                events: settings.events,
                                includeAssistantText: settings.includeAssistantText,
                                maxBodyChars: settings.maxBodyChars,
                                group: settings.group,
                            },
                            status: { enabled: settings.enabled, configured, masked },
                        };
                        return ok(value);
                    }
                    case 'set': {
                        const body = payload;
                        const verdict = validatePatch(body?.patch);
                        if (verdict.message !== undefined)
                            return err(verdict.message);
                        // Persist only the keys present; barkUrl is written verbatim (new value).
                        const patch = body.patch;
                        if (patch.barkUrl !== undefined)
                            patch.barkUrl = sanitizeBarkUrl(String(patch.barkUrl));
                        await deps.update(patch);
                        return ok({ saved: true });
                    }
                    case 'test': {
                        const settings = deps.getSettings();
                        const endpoint = sanitizeBarkUrl(settings.barkUrl);
                        if (endpoint.length === 0)
                            return err('未配置 Bark 推送地址，请先填写并保存');
                        const body = payload;
                        const group = typeof body?.group === 'string' && body.group.length > 0 ? body.group : settings.group;
                        await sendBark(endpoint, buildTestPayload(group));
                        return ok({ sent: true });
                    }
                    default:
                        return err(`unknown endpoint: ${String(endpoint)}`);
                }
            }
            catch (error) {
                return err(error instanceof Error ? error.message : String(error));
            }
        };
        sctx.effect(() => {
            const dispose = sctx.connection.rpc.handle(BARK_RPC_CHANNEL, handler, { authority: 'loopback' });
            return () => {
                void dispose();
            };
        }, 'bark-notify: rpc channel');
    });
}
//# sourceMappingURL=rpc.js.map