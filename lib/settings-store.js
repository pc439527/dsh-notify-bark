/**
 * dsh-notify-bark settings model: schema, defaults, and event metadata.
 *
 * On DSH 0.2 the plugin entry's own config IS the settings namespace: the
 * Host `Config` schema below is registered by the Loader, exposed to the
 * settings transport (redacted, with `role('secret')` fields stripped), and
 * hot-reloaded in place. Every editable field is `volatile()`, so the Loader
 * hands `apply` stable `{ get() }` references instead of a frozen snapshot —
 * reads always follow the current document without remounting the plugin.
 *
 * The browser never touches this schema directly: the settings section reads
 * and writes through the /dsh-notify-bark RPC, and the Bark URL is only ever
 * sent browser → Host (never echoed back).
 * @module dsh-notify-bark/settings-store
 */
import z from '@deepseek-ai/schemastery';
/** Composition defaults — what a fresh install ships with. */
export const DEFAULT_SETTINGS = {
    enabled: true,
    barkUrl: '',
    events: {
        completed: true,
        error: true,
        blocked: true,
        aborted: false,
        maxTokens: true,
        interrupted: true,
        question: true,
        approval: true,
        planReview: false,
    },
    includeAssistantText: true,
    maxBodyChars: 300,
    group: 'DeepSeek Harness',
};
/**
 * The plugin's Loader config schema. Every editable field is `volatile()` so
 * the settings transport can edit it live; `barkUrl` is `role('secret')` so
 * any redacted describe never carries it.
 */
export const Config = z.object({
    enabled: z.boolean().default(true).volatile(),
    barkUrl: z.string().role('secret').default('').volatile(),
    events: z.object({
        completed: z.boolean().default(true),
        error: z.boolean().default(true),
        blocked: z.boolean().default(true),
        aborted: z.boolean().default(false),
        maxTokens: z.boolean().default(true),
        interrupted: z.boolean().default(true),
        question: z.boolean().default(true),
        approval: z.boolean().default(true),
        planReview: z.boolean().default(false),
    }).volatile(),
    includeAssistantText: z.boolean().default(true).volatile(),
    maxBodyChars: z.number().min(1).max(4000).default(300).volatile(),
    group: z.string().default('DeepSeek Harness').volatile(),
});
/**
 * Read a detached plain settings object from the live volatile config.
 * @param config - resolved config handed to `apply`.
 * @returns the current settings, defaults applied.
 */
export function readBarkSettings(config) {
    return {
        enabled: config.enabled.get(),
        barkUrl: config.barkUrl.get(),
        events: { ...DEFAULT_SETTINGS.events, ...config.events.get() },
        includeAssistantText: config.includeAssistantText.get(),
        maxBodyChars: config.maxBodyChars.get(),
        group: config.group.get(),
    };
}
/**
 * Map a `turn/end` reason kind onto the settings event flag. Kinds outside
 * the official set (plugin extensions) yield undefined and stay silent.
 */
export const TURN_END_EVENT_FLAG = {
    completed: 'completed',
    error: 'error',
    blocked: 'blocked',
    aborted: 'aborted',
    'max-tokens': 'maxTokens',
    interrupted: 'interrupted',
};
/** Event metadata keyed by the settings event flag. */
export const EVENT_META = {
    completed: { headline: '✅ 任务完成', level: 'active' },
    error: { headline: '❌ 执行失败', level: 'timeSensitive' },
    blocked: { headline: '🚫 执行被阻塞', level: 'timeSensitive' },
    aborted: { headline: '⏹ 已中止', level: 'passive' },
    maxTokens: { headline: '⚠️ Token 达到上限', level: 'timeSensitive' },
    interrupted: { headline: '⏸ 异常中断', level: 'timeSensitive' },
    question: { headline: '❓ 等待你的回答', level: 'timeSensitive' },
    approval: { headline: '🔐 等待你的授权', level: 'timeSensitive' },
    planReview: { headline: '📋 计划待确认', level: 'timeSensitive' },
};
/**
 * Normalize a Bark endpoint.
 *
 * The settings field expects the plain V2 base URL (`https://api.day.app/<key>`
 * or a self-hosted equivalent) — the plugin POSTs a JSON body to it. Bark's
 * docs show `curl -X GET 'https://api.day.app/<key>/title/body?group=…'`
 * examples, which users often paste verbatim; accept those too and reduce them
 * to the base so the saved secret and the outgoing request stay usable.
 *
 * @param input - raw field value (may be a whole curl command or a GET-style URL).
 * @returns the normalized base URL, or `''` when the value is blank or is not a
 *   usable http(s) URL.
 */
export function sanitizeBarkUrl(input) {
    let value = input.trim();
    if (value.length === 0)
        return '';
    // 1) Extract the URL out of a pasted curl command or quoted example.
    //    e.g. `curl -X GET 'https://api.day.app/KEY/title/body?group=x&ttl=600'`
    const embedded = value.match(/https?:\/\/[^\s'"`<>\\]+/i);
    if (embedded !== null && embedded[0].length < value.length)
        value = embedded[0];
    // 2) Parse strictly: a pasted command that is not a URL at all becomes ''.
    let parsed;
    try {
        parsed = new URL(value);
    }
    catch {
        return '';
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
        return '';
    // 3) Bark's legacy GET form appends `/:title/:body` (and often a query
    //    string) to the key. Reduce it back to origin + first path segment.
    //    A two-segment path is left alone: self-hosted servers may legitimately
    //    mount Bark under a prefix such as `/bark/<key>`.
    const segments = parsed.pathname.split('/').filter((part) => part.length > 0);
    if (segments.length >= 3)
        parsed.pathname = `/${segments[0]}`;
    // Query/hash never belong to the base endpoint; they come from GET examples.
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString().replace(/\/+$/, '');
}
/**
 * Mask a Bark URL for display: the URL carries the device key, so only a
 * configured/unconfigured fact plus the last four characters cross the wire.
 */
export function maskBarkUrl(url) {
    const normalized = sanitizeBarkUrl(url);
    if (normalized.length === 0)
        return { configured: false, masked: '' };
    return { configured: true, masked: `••••••••${normalized.slice(-4)}` };
}
//# sourceMappingURL=settings-store.js.map