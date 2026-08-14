/**
 * dsh-notify-bark settings model: schema, defaults, and event metadata.
 *
 * The namespace is registered Host-side through `ctx.settings` (so values
 * persist to $DSH_HOME/settings.yaml and hot-reload), and the browser never
 * touches it directly — the DSH web settings wire only exposes an explicit
 * allowlist of namespaces, and the Bark URL must stay on the Host. The
 * settings section reads and writes through the /dsh-notify-bark RPC instead.
 * @module dsh-notify-bark/settings-store
 */
import z from '@deepseek-ai/schemastery';
/** Settings namespace owned by this plugin. */
export const BARK_SETTINGS_NAMESPACE = 'bark';
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
 * Settings schema: what the settings surface edits and how the stored section
 * resolves. `barkUrl` is `role('secret')` so any wire describe of this
 * namespace strips it; the Host RPC never sends it either way.
 */
export const barkSettingsSchema = z.object({
    enabled: z.boolean().default(true),
    barkUrl: z.string().role('secret').default(''),
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
    }),
    includeAssistantText: z.boolean().default(true),
    maxBodyChars: z.number().min(1).max(4000).default(300),
    group: z.string().default('DeepSeek Harness'),
});
/**
 * Map a `turn/end` reason kind onto the settings event flag. Kinds outside
 * the six official ones (plugin extensions) yield undefined and stay silent.
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
 * Normalize a Bark endpoint: trim and strip trailing slashes so the JSON POST
 * hits exactly the server root (Bark V2 accepts `POST <base>` with a JSON
 * body carrying title/body/group/level).
 */
export function sanitizeBarkUrl(input) {
    return input.trim().replace(/\/+$/, '');
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