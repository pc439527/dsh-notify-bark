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
import { sanitizeBarkUrl } from "./settings-store.js";
/** npm package that owns the Remote methods. */
export const BARK_REMOTE_PACKAGE = 'dsh-notify-bark';
/** Wire namespace of this plugin's Remote surface. */
export const BARK_REMOTE_NAMESPACE = 'barkNotify';
/** Stable Cordis service key and default wire namespace of the Host service. */
export const BARK_REMOTE_SERVICE = BARK_REMOTE_NAMESPACE;
/** Stable Cordis plugin name (matches the cordis.patch.yml insert id). */
export const BARK_PLUGIN_NAME = 'bark-notify';
/** Guard a set patch against unknown fields and wrong scalar types. */
export function validateSetPatch(patch) {
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
    const next = { ...record };
    if (typeof record.barkUrl === 'string') {
        const raw = record.barkUrl;
        const normalized = sanitizeBarkUrl(raw);
        if (raw.trim().length === 0) {
            // Explicitly blank means "leave the stored secret untouched".
            Reflect.deleteProperty(next, 'barkUrl');
        }
        else if (normalized.length === 0) {
            return { message: 'set: barkUrl must be a valid http(s) URL (paste the base endpoint only, not a curl command)' };
        }
        else {
            next.barkUrl = normalized;
        }
    }
    return { patch: next };
}
/** Re-exported so the Host service normalizes with the same helper. */
export { sanitizeBarkUrl };
/** Materialize an identity parser typed to one contract value. */
const codec = (typeSymbol) => ({
    mode: 'strict',
    typeSymbol,
    create: () => ({ parse: (value) => value }),
});
/** Client-strict codec of the get envelope. */
export const barkGetValueCodec = codec('dsh-notify-bark#BarkGetValue');
/** Client-strict codec of a set/test scalar result. */
export const barkRecordCodec = codec('dsh-notify-bark#BarkRecord');
/** Client-strict codec of the set patch. */
export const barkSetPatchCodec = codec('dsh-notify-bark#BarkSetPatch');
/** Client-strict codec of the optional Bark group of a test call. */
export const barkGroupCodec = codec('dsh-notify-bark#BarkGroup');
/** The Client contribution this package mounts: get / set / test. */
export const barkRemote = {
    package: BARK_REMOTE_PACKAGE,
    descriptors: [
        {
            id: `${BARK_REMOTE_PACKAGE}#barkNotify/get`,
            service: BARK_REMOTE_SERVICE,
            namespace: BARK_REMOTE_NAMESPACE,
            method: 'get',
            invocation: { kind: 'direct' },
            parameters: [],
            result: barkGetValueCodec,
        },
        {
            id: `${BARK_REMOTE_PACKAGE}#barkNotify/set`,
            service: BARK_REMOTE_SERVICE,
            namespace: BARK_REMOTE_NAMESPACE,
            method: 'set',
            invocation: { kind: 'direct' },
            parameters: [
                { name: 'patch', wire: 'patch', source: 'json', codec: barkSetPatchCodec },
            ],
            result: barkRecordCodec,
        },
        {
            id: `${BARK_REMOTE_PACKAGE}#barkNotify/test`,
            service: BARK_REMOTE_SERVICE,
            namespace: BARK_REMOTE_NAMESPACE,
            method: 'test',
            invocation: { kind: 'direct' },
            parameters: [
                { name: 'group', wire: 'group', source: 'json', codec: barkGroupCodec, acceptsUndefined: true },
            ],
            result: barkRecordCodec,
        },
    ],
};
//# sourceMappingURL=remote-contract.js.map