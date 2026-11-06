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

import type { RemoteResult, TypertCodec, TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol'
import { sanitizeBarkUrl, type BarkSettings as Settings } from './settings-store.ts'

/** npm package that owns the Remote methods. */
export const BARK_REMOTE_PACKAGE = 'dsh-notify-bark'

/** Wire namespace of this plugin's Remote surface. */
export const BARK_REMOTE_NAMESPACE = 'barkNotify'

/** Stable Cordis service key and default wire namespace of the Host service. */
export const BARK_REMOTE_SERVICE = BARK_REMOTE_NAMESPACE

/** Stable Cordis plugin name (matches the cordis.patch.yml insert id). */
export const BARK_PLUGIN_NAME = 'bark-notify'

/** Browser-facing view of the Bark URL: configured fact + masked tail only. */
export interface BarkStatusView {
  /** Whether the section master switch is on. */
  enabled: boolean
  /** Whether a Bark endpoint is configured. */
  configured: boolean
  /** Masked endpoint tail, e.g. "••••••••3F82" (empty when unconfigured). */
  masked: string
}

/** Settings view sent to the browser — barkUrl is never included. */
export type BarkSettingsView = Omit<Settings, 'barkUrl'>

/** get response value. */
export interface BarkGetValue {
  settings: BarkSettingsView
  status: BarkStatusView
}

/** set response value. */
export interface BarkSetResult {
  saved: true
}

/** test response value. */
export interface BarkTestResult {
  sent: true
}

/**
 * set business parameter: the settings patch to persist. barkUrl is optional
 * and carries a NEW value only — the section never restates the stored secret.
 */
export type BarkSetPatch = Partial<Omit<Settings, 'barkUrl'>> & { barkUrl?: string }

/** Guard a set patch against unknown fields and wrong scalar types. */
export function validateSetPatch(patch: unknown): { message?: string; patch?: BarkSetPatch } {
  if (typeof patch !== 'object' || patch === null || Array.isArray(patch)) {
    return { message: 'set: patch must be an object' }
  }
  const record = patch as Record<string, unknown>
  const allowed = new Set([
    'enabled',
    'barkUrl',
    'events',
    'includeAssistantText',
    'maxBodyChars',
    'group',
  ])
  for (const [key, value] of Object.entries(record)) {
    if (!allowed.has(key)) return { message: `set: unknown field ${key}` }
    if (key === 'enabled' || key === 'includeAssistantText') {
      if (typeof value !== 'boolean') return { message: `set: ${key} must be a boolean` }
    } else if (key === 'maxBodyChars') {
      if (typeof value !== 'number' || !Number.isFinite(value)) return { message: 'set: maxBodyChars must be a number' }
    } else if (key === 'barkUrl' || key === 'group') {
      if (typeof value !== 'string') return { message: `set: ${key} must be a string` }
    } else if (key === 'events') {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return { message: 'set: events must be an object' }
      }
    }
  }
  const next = { ...record }
  if (typeof record.barkUrl === 'string') {
    const raw = record.barkUrl
    const normalized = sanitizeBarkUrl(raw)
    if (raw.trim().length === 0) {
      // Explicitly blank means "leave the stored secret untouched".
      Reflect.deleteProperty(next, 'barkUrl')
    } else if (normalized.length === 0) {
      return { message: 'set: barkUrl must be a valid http(s) URL (paste the base endpoint only, not a curl command)' }
    } else {
      next.barkUrl = normalized
    }
  }
  return { patch: next as BarkSetPatch }
}

/** Re-exported so the Host service normalizes with the same helper. */
export { sanitizeBarkUrl }

/** Materialize an identity parser typed to one contract value. */
const codec = <T>(typeSymbol: string): TypertCodec => ({
  mode: 'strict',
  typeSymbol,
  create: () => ({ parse: (value: unknown) => value as T }),
})

/** Client-strict codec of the get envelope. */
export const barkGetValueCodec: TypertCodec = codec<BarkGetValue>('dsh-notify-bark#BarkGetValue')

/** Client-strict codec of a set/test scalar result. */
export const barkRecordCodec: TypertCodec = codec<BarkSetResult | BarkTestResult>('dsh-notify-bark#BarkRecord')

/** Client-strict codec of the set patch. */
export const barkSetPatchCodec: TypertCodec = codec<BarkSetPatch>('dsh-notify-bark#BarkSetPatch')

/** Client-strict codec of the optional Bark group of a test call. */
export const barkGroupCodec: TypertCodec = codec<string>('dsh-notify-bark#BarkGroup')

/** The Client contribution this package mounts: get / set / test. */
export const barkRemote: TypertRemoteContribution = {
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
}

/** The mounted Client namespace face this section consumes. */
export interface BarkNotifyRemoteApi {
  get(): Promise<RemoteResult<BarkGetValue>>
  set(patch: BarkSetPatch): Promise<RemoteResult<BarkSetResult>>
  test(group: string): Promise<RemoteResult<BarkTestResult>>
}

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface TypertRemoteMap {
    /** Read the masked status and the edit view. */
    'barkNotify/get': BarkGetValue
    /** Persist a settings patch (barkUrl is accepted, new value only). */
    'barkNotify/set': BarkSetResult
    /** Send a test Bark push with the configured endpoint. */
    'barkNotify/test': BarkTestResult
  }
}