/**
 * dsh-notify-bark Remote contract — the payload vocabulary, validation, codecs,
 * and invocation descriptors shared by the Host service and the browser
 * section.
 *
 * The section talks to the Host through a Typert Remote namespace served on the
 * shared /api channel (DSH 0.2 standard, same path every official and
 * third-party Remote surface uses). The Bark URL only ever travels
 * browser → Host on a set call; reads answer with the masked status and never
 * echo the value back.
 * @module dsh-notify-bark/remote-contract
 */
import type { RemoteResult, TypertCodec, TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol';
import { sanitizeBarkUrl, type BarkSettings as Settings } from './settings-store.ts';
/** npm package that owns the Remote methods. */
export declare const BARK_REMOTE_PACKAGE = "dsh-notify-bark";
/** Wire namespace of this plugin's Remote surface. */
export declare const BARK_REMOTE_NAMESPACE = "barkNotify";
/** Stable Cordis service key and default wire namespace of the Host service. */
export declare const BARK_REMOTE_SERVICE = "barkNotify";
/** Stable Cordis plugin name (matches the cordis.patch.yml insert id). */
export declare const BARK_PLUGIN_NAME = "bark-notify";
/** Browser-facing view of the Bark URL: configured fact + masked tail only. */
export interface BarkStatusView {
    /** Whether the section master switch is on. */
    enabled: boolean;
    /** Whether a Bark endpoint is configured. */
    configured: boolean;
    /** Masked endpoint tail, e.g. "••••••••3F82" (empty when unconfigured). */
    masked: string;
}
/** Settings view sent to the browser — barkUrl is never included. */
export type BarkSettingsView = Omit<Settings, 'barkUrl'>;
/** get response value. */
export interface BarkGetValue {
    settings: BarkSettingsView;
    status: BarkStatusView;
}
/** set response value. */
export interface BarkSetResult {
    saved: true;
}
/** test response value. */
export interface BarkTestResult {
    sent: true;
}
/**
 * set business parameter: the settings patch to persist. barkUrl is optional
 * and carries a NEW value only — the section never restates the stored secret.
 */
export type BarkSetPatch = Partial<Omit<Settings, 'barkUrl'>> & {
    barkUrl?: string;
};
/** Guard a set patch against unknown fields and wrong scalar types. */
export declare function validateSetPatch(patch: unknown): {
    message?: string;
    patch?: BarkSetPatch;
};
/** Re-exported so the Host service normalizes with the same helper. */
export { sanitizeBarkUrl };
/** Client-strict codec of the get envelope. */
export declare const barkGetValueCodec: TypertCodec;
/** Client-strict codec of a set/test scalar result. */
export declare const barkRecordCodec: TypertCodec;
/** Client-strict codec of the set patch. */
export declare const barkSetPatchCodec: TypertCodec;
/** Client-strict codec of the optional Bark group of a test call. */
export declare const barkGroupCodec: TypertCodec;
/** The Client contribution this package mounts: get / set / test. */
export declare const barkRemote: TypertRemoteContribution;
/** The mounted Client namespace face this section consumes. */
export interface BarkNotifyRemoteApi {
    get(): Promise<RemoteResult<BarkGetValue>>;
    set(patch: BarkSetPatch): Promise<RemoteResult<BarkSetResult>>;
    test(group: string): Promise<RemoteResult<BarkTestResult>>;
}
declare module '@deepseek-ai/dsh-typert-protocol' {
    interface TypertRemoteMap {
        /** Read the masked status and the edit view. */
        'barkNotify/get': BarkGetValue;
        /** Persist a settings patch (barkUrl is accepted, new value only). */
        'barkNotify/set': BarkSetResult;
        /** Send a test Bark push with the configured endpoint. */
        'barkNotify/test': BarkTestResult;
    }
}
//# sourceMappingURL=remote-contract.d.ts.map