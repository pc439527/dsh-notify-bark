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
export declare const BARK_SETTINGS_NAMESPACE: "bark";
/** The nine notification events the section can toggle. */
export interface BarkEventSettings {
    /** ✅ turn ended completed. */
    completed: boolean;
    /** ❌ turn ended with an error. */
    error: boolean;
    /** 🚫 turn ended blocked (waiting on something the agent cannot do alone). */
    blocked: boolean;
    /** ⏹ turn aborted by the user. */
    aborted: boolean;
    /** ⚠️ a step hit its output-token ceiling. */
    maxTokens: boolean;
    /** ⏸ a crash-orphaned turn was closed on reload. */
    interrupted: boolean;
    /** ❓ ask_user_question is waiting for an answer. */
    question: boolean;
    /** 🔐 an approval request is waiting for a decision. */
    approval: boolean;
    /** 📋 exit_plan_mode presented a plan for review. */
    planReview: boolean;
}
/** Complete Bark plugin settings. */
export interface BarkSettings {
    /** Master switch; when off nothing is sent. */
    enabled: boolean;
    /** Full Bark endpoint, e.g. https://api.day.app/<key> — treated as a secret. */
    barkUrl: string;
    /** Per-event notification switches. */
    events: BarkEventSettings;
    /** Append the AI's last reply to turn-end notifications. */
    includeAssistantText: boolean;
    /** Truncation bound for the notification body. */
    maxBodyChars: number;
    /** Bark group the notifications land in. */
    group: string;
}
/** Composition defaults — what a fresh install ships with. */
export declare const DEFAULT_SETTINGS: BarkSettings;
/**
 * Settings schema: what the settings surface edits and how the stored section
 * resolves. `barkUrl` is `role('secret')` so any wire describe of this
 * namespace strips it; the Host RPC never sends it either way.
 */
export declare const barkSettingsSchema: z<Schemastery.ObjectS<{
    enabled: z<boolean, boolean>;
    barkUrl: z<string, string>;
    events: z<Schemastery.ObjectS<{
        completed: z<boolean, boolean>;
        error: z<boolean, boolean>;
        blocked: z<boolean, boolean>;
        aborted: z<boolean, boolean>;
        maxTokens: z<boolean, boolean>;
        interrupted: z<boolean, boolean>;
        question: z<boolean, boolean>;
        approval: z<boolean, boolean>;
        planReview: z<boolean, boolean>;
    }>, Schemastery.ObjectT<{
        completed: z<boolean, boolean>;
        error: z<boolean, boolean>;
        blocked: z<boolean, boolean>;
        aborted: z<boolean, boolean>;
        maxTokens: z<boolean, boolean>;
        interrupted: z<boolean, boolean>;
        question: z<boolean, boolean>;
        approval: z<boolean, boolean>;
        planReview: z<boolean, boolean>;
    }>>;
    includeAssistantText: z<boolean, boolean>;
    maxBodyChars: z<number, number>;
    group: z<string, string>;
}>, Schemastery.ObjectT<{
    enabled: z<boolean, boolean>;
    barkUrl: z<string, string>;
    events: z<Schemastery.ObjectS<{
        completed: z<boolean, boolean>;
        error: z<boolean, boolean>;
        blocked: z<boolean, boolean>;
        aborted: z<boolean, boolean>;
        maxTokens: z<boolean, boolean>;
        interrupted: z<boolean, boolean>;
        question: z<boolean, boolean>;
        approval: z<boolean, boolean>;
        planReview: z<boolean, boolean>;
    }>, Schemastery.ObjectT<{
        completed: z<boolean, boolean>;
        error: z<boolean, boolean>;
        blocked: z<boolean, boolean>;
        aborted: z<boolean, boolean>;
        maxTokens: z<boolean, boolean>;
        interrupted: z<boolean, boolean>;
        question: z<boolean, boolean>;
        approval: z<boolean, boolean>;
        planReview: z<boolean, boolean>;
    }>>;
    includeAssistantText: z<boolean, boolean>;
    maxBodyChars: z<number, number>;
    group: z<string, string>;
}>>;
/**
 * Map a `turn/end` reason kind onto the settings event flag. Kinds outside
 * the six official ones (plugin extensions) yield undefined and stay silent.
 */
export declare const TURN_END_EVENT_FLAG: Record<string, keyof BarkEventSettings>;
/**
 * Bark push levels, mirroring the user's suggestion:
 * completed → active; waiting/error states → timeSensitive; aborted → passive.
 * critical is intentionally never used by default.
 */
export type BarkLevel = 'active' | 'timeSensitive' | 'passive' | 'critical';
/** Per-event presentation metadata. */
export interface BarkEventMeta {
    /** One-line headline shown as the notification body's first line. */
    headline: string;
    /** Bark level for this event. */
    level: BarkLevel;
}
/** Event metadata keyed by the settings event flag. */
export declare const EVENT_META: Record<keyof BarkEventSettings, BarkEventMeta>;
/**
 * Normalize a Bark endpoint: trim and strip trailing slashes so the JSON POST
 * hits exactly the server root (Bark V2 accepts `POST <base>` with a JSON
 * body carrying title/body/group/level).
 */
export declare function sanitizeBarkUrl(input: string): string;
/**
 * Mask a Bark URL for display: the URL carries the device key, so only a
 * configured/unconfigured fact plus the last four characters cross the wire.
 */
export declare function maskBarkUrl(url: string): {
    configured: boolean;
    masked: string;
};
//# sourceMappingURL=settings-store.d.ts.map