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
import type { Volatile } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
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
/**
 * The resolved plugin config the Loader hands `apply`: every used field is a
 * retained volatile reference, so reading it inside the event listener always
 * follows the latest settings write.
 */
export interface Config {
    /** Master switch; when off nothing is sent. */
    enabled: Volatile<boolean>;
    /** Full Bark endpoint — treated as a secret and never echoed to the browser. */
    barkUrl: Volatile<string>;
    /** Per-event notification switches (one volatile object). */
    events: Volatile<BarkEventSettings>;
    /** Append the AI's last reply to turn-end notifications. */
    includeAssistantText: Volatile<boolean>;
    /** Truncation bound for the notification body. */
    maxBodyChars: Volatile<number>;
    /** Bark group the notifications land in. */
    group: Volatile<string>;
}
/** Composition defaults — what a fresh install ships with. */
export declare const DEFAULT_SETTINGS: BarkSettings;
/**
 * The plugin's Loader config schema. Every editable field is `volatile()` so
 * the settings transport can edit it live; `barkUrl` is `role('secret')` so
 * any redacted describe never carries it.
 */
export declare const Config: z<Schemastery.ObjectS<NoInfer<{
    enabled: z<boolean, boolean, "volatile-defined">;
    barkUrl: z<string, string, "volatile-defined">;
    events: z<NoInfer<Schemastery.ObjectS<NoInfer<{
        completed: z<boolean, boolean, "defined">;
        error: z<boolean, boolean, "defined">;
        blocked: z<boolean, boolean, "defined">;
        aborted: z<boolean, boolean, "defined">;
        maxTokens: z<boolean, boolean, "defined">;
        interrupted: z<boolean, boolean, "defined">;
        question: z<boolean, boolean, "defined">;
        approval: z<boolean, boolean, "defined">;
        planReview: z<boolean, boolean, "defined">;
    }>>>, NoInfer<Schemastery.ObjectT<NoInfer<{
        completed: z<boolean, boolean, "defined">;
        error: z<boolean, boolean, "defined">;
        blocked: z<boolean, boolean, "defined">;
        aborted: z<boolean, boolean, "defined">;
        maxTokens: z<boolean, boolean, "defined">;
        interrupted: z<boolean, boolean, "defined">;
        question: z<boolean, boolean, "defined">;
        approval: z<boolean, boolean, "defined">;
        planReview: z<boolean, boolean, "defined">;
    }>>>, "volatile">;
    includeAssistantText: z<boolean, boolean, "volatile-defined">;
    maxBodyChars: z<number, number, "volatile-defined">;
    group: z<string, string, "volatile-defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    enabled: z<boolean, boolean, "volatile-defined">;
    barkUrl: z<string, string, "volatile-defined">;
    events: z<NoInfer<Schemastery.ObjectS<NoInfer<{
        completed: z<boolean, boolean, "defined">;
        error: z<boolean, boolean, "defined">;
        blocked: z<boolean, boolean, "defined">;
        aborted: z<boolean, boolean, "defined">;
        maxTokens: z<boolean, boolean, "defined">;
        interrupted: z<boolean, boolean, "defined">;
        question: z<boolean, boolean, "defined">;
        approval: z<boolean, boolean, "defined">;
        planReview: z<boolean, boolean, "defined">;
    }>>>, NoInfer<Schemastery.ObjectT<NoInfer<{
        completed: z<boolean, boolean, "defined">;
        error: z<boolean, boolean, "defined">;
        blocked: z<boolean, boolean, "defined">;
        aborted: z<boolean, boolean, "defined">;
        maxTokens: z<boolean, boolean, "defined">;
        interrupted: z<boolean, boolean, "defined">;
        question: z<boolean, boolean, "defined">;
        approval: z<boolean, boolean, "defined">;
        planReview: z<boolean, boolean, "defined">;
    }>>>, "volatile">;
    includeAssistantText: z<boolean, boolean, "volatile-defined">;
    maxBodyChars: z<number, number, "volatile-defined">;
    group: z<string, string, "volatile-defined">;
}>>, "plain">;
/**
 * Read a detached plain settings object from the live volatile config.
 * @param config - resolved config handed to `apply`.
 * @returns the current settings, defaults applied.
 */
export declare function readBarkSettings(config: Config): BarkSettings;
/**
 * Map a `turn/end` reason kind onto the settings event flag. Kinds outside
 * the official set (plugin extensions) yield undefined and stay silent.
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