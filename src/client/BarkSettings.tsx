/**
 * dsh-notify-bark settings section component (React).
 *
 * Mirrored by the shipped module-loader bundle (lib/client.js). The section
 * renders: master switch, a write-only endpoint field with a masked status and
 * a test-push button, the nine event checkboxes, and the content options.
 * @module dsh-notify-bark/client/BarkSettings
 */

import { useEffect, useRef, useState, type ReactElement } from 'react'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-store'
import { MAX_BODY_CHARS, MIN_BODY_CHARS } from '../settings-store.ts'
import { EVENT_KEYS, type BarkSectionController, type BarkSectionSnapshot } from './index.ts'
import * as styles from './BarkSettings.module.css'

const FULLWIDTH_DIGITS = /[\uFF10-\uFF19]/g

/**
 * Parse a user-entered draft string for `maxBodyChars`.
 *
 * Returns `null` when the draft is empty or not a finite number (so the input
 * reverts to the currently saved value instead of overwriting it), and
 * otherwise returns an integer clamped to `[MIN_BODY_CHARS, MAX_BODY_CHARS]`.
 */
export function parseBodyCharsDraft(raw: string): number | null {
  const normalized = raw.replace(FULLWIDTH_DIGITS, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)).trim()
  if (normalized.length === 0) return null
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return null
  return Math.min(MAX_BODY_CHARS, Math.max(MIN_BODY_CHARS, Math.round(parsed)))
}

/** Props composed by the settings.section slot registration. */
export interface BarkSettingsSectionProps {
  /** Locale function bound to this section's namespace. */
  t(key: string, params?: Record<string, string>): string
  /** Host RPC controller for the bark namespace. */
  controller: BarkSectionController
  /** Selector hook over the controller's snapshot store. */
  useSnapshot: SnapshotSelectorHook<BarkSectionSnapshot>
}

/** Render the Bark notifications settings section. */
export function BarkSettingsSection(props: BarkSettingsSectionProps): ReactElement | null {
  const { t, controller, useSnapshot } = props
  const snap = useSnapshot((snapshot) => snapshot)
  const [urlDraft, setUrlDraft] = useState('')
  const [groupDraft, setGroupDraft] = useState<string | null>(null)
  const [bodyCharsDraft, setBodyCharsDraft] = useState<string | null>(null)
  const [lastSaveArea, setLastSaveArea] = useState<'url' | 'content'>('url')
  const skipBodyBlurRef = useRef(false)
  const skipGroupBlurRef = useRef(false)

  useEffect(() => {
    void controller.load()
  }, [controller])

  if (snap.status === 'loading') {
    return <p className={styles.hint}>{t('loading')}</p>
  }
  if (snap.status === 'error') {
    return (
      <p className={styles.statusError} role="alert">
        {t('loadError', { error: snap.saveError ?? '?' })}
      </p>
    )
  }

  const settings = snap.settings!
  const urlPlaceholder = snap.urlConfigured ? t('urlConfigured', { masked: snap.urlMasked }) : t('urlUnconfigured')

  const toggleEvent = (key: keyof typeof settings.events): void => {
    const next = { ...settings.events, [key]: !settings.events[key] }
    setLastSaveArea('url')
    void controller.save({ events: next })
  }

  const saveUrl = (): void => {
    const value = urlDraft.trim()
    if (value.length === 0) return
    setUrlDraft('')
    setLastSaveArea('url')
    void controller.save({ barkUrl: value })
  }

  const commitGroup = (draft: string | null): void => {
    if (draft === null) return
    const value = draft.trim()
    setGroupDraft(null)
    const current = controller.store.getSnapshot().settings?.group ?? settings.group
    if (value.length === 0 || value === current) return
    setLastSaveArea('content')
    void controller.save({ group: value })
  }

  const saveGroup = (): void => {
    if (skipGroupBlurRef.current) {
      skipGroupBlurRef.current = false
      return
    }
    commitGroup(groupDraft)
  }

  const commitBodyChars = (draft: string | null): void => {
    if (draft === null) return
    const parsed = parseBodyCharsDraft(draft)
    setBodyCharsDraft(null)
    const current = controller.store.getSnapshot().settings?.maxBodyChars ?? settings.maxBodyChars
    if (parsed === null || parsed === current) return
    setLastSaveArea('content')
    void controller.save({ maxBodyChars: parsed })
  }

  const saveBodyChars = (): void => {
    if (skipBodyBlurRef.current) {
      skipBodyBlurRef.current = false
      return
    }
    commitBodyChars(bodyCharsDraft)
  }

  const onTest = (): void => {
    const group = groupDraft !== null && groupDraft.trim().length > 0 ? groupDraft.trim() : settings.group
    void controller.test(group)
  }

  return (
    <div className={styles.section}>
      <p className={styles.intro}>{t('intro')}</p>

      <div className={styles.group}>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(event) => {
              const next = event.target.checked
              setLastSaveArea('url')
              void controller.save({ enabled: next })
            }}
          />
          <span className={styles.checkLabel}>{t('master')}</span>
        </label>
        <p className={styles.hint}>{t('masterHint')}</p>
      </div>

      <div className={styles.group}>
        <p className={styles.groupTitle}>{t('urlLabel')}</p>
        <div className={styles.rowWide}>
          <input
            className={styles.input}
            type="text"
            placeholder={urlPlaceholder}
            value={urlDraft}
            onChange={(event) => setUrlDraft(event.target.value)}
            onBlur={saveUrl}
            onKeyDown={(event) => {
              if (event.key === 'Enter') saveUrl()
            }}
          />
          <button type="button" className={styles.button} disabled={urlDraft.trim().length === 0 || snap.saving} onClick={saveUrl}>
            {t('urlSave')}
          </button>
          <button type="button" className={styles.button} disabled={snap.testing || snap.saving} onClick={onTest}>
            {snap.testing ? t('testing') : t('test')}
          </button>
        </div>
        <p className={styles.hint}>{t('urlHint')}</p>
        {snap.testResult !== null ? (
          <p className={snap.testResult.ok ? styles.statusOk : styles.statusError} role="status">
            {snap.testResult.ok ? t('testSent') : snap.testResult.message}
          </p>
        ) : null}
        {snap.saveError !== null && lastSaveArea !== 'content' ? (
          <p className={styles.statusError} role="alert">
            {t('saveFailed', { error: snap.saveError })}
          </p>
        ) : null}
      </div>

      <div className={styles.group}>
        <p className={styles.groupTitle}>{t('eventsTitle')}</p>
        {EVENT_KEYS.map((key) => (
          <label key={key} className={styles.check}>
            <input type="checkbox" checked={settings.events[key as keyof typeof settings.events]} onChange={() => toggleEvent(key as keyof typeof settings.events)} />
            <span className={styles.checkLabel}>{t(`event.${key}`)}</span>
          </label>
        ))}
      </div>

      <div className={styles.group}>
        <p className={styles.groupTitle}>{t('contentTitle')}</p>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={settings.includeAssistantText}
            onChange={(event) => {
              const next = event.target.checked
              setLastSaveArea('content')
              void controller.save({ includeAssistantText: next })
            }}
          />
          <span className={styles.checkLabel}>{t('includeAssistant')}</span>
        </label>
        <p className={styles.hint}>{t('includeAssistantHint')}</p>
        <div className={styles.row}>
          <span className={styles.label}>{t('maxBodyChars')}</span>
          <input
            className={`${styles.input} ${styles.num}`}
            type="text"
            inputMode="numeric"
            aria-label={t('maxBodyChars')}
            placeholder={String(settings.maxBodyChars)}
            value={bodyCharsDraft ?? String(settings.maxBodyChars)}
            onChange={(event) => {
              skipBodyBlurRef.current = false
              setBodyCharsDraft(event.target.value)
            }}
            onBlur={saveBodyChars}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commitBodyChars(bodyCharsDraft)
              } else if (event.key === 'Escape') {
                skipBodyBlurRef.current = true
                setBodyCharsDraft(null)
                event.currentTarget.blur()
              }
            }}
          />
        </div>
        <div className={styles.row}>
          <span className={styles.label}>{t('groupLabel')}</span>
          <input
            className={styles.input}
            type="text"
            aria-label={t('groupLabel')}
            placeholder={settings.group}
            value={groupDraft ?? settings.group}
            onChange={(event) => {
              skipGroupBlurRef.current = false
              setGroupDraft(event.target.value)
            }}
            onBlur={saveGroup}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commitGroup(groupDraft)
              } else if (event.key === 'Escape') {
                skipGroupBlurRef.current = true
                setGroupDraft(null)
                event.currentTarget.blur()
              }
            }}
          />
        </div>
        <p className={styles.hint}>{t('groupHint')}</p>
        {snap.saveError !== null && lastSaveArea === 'content' ? (
          <p className={styles.statusError} role="alert">
            {t('saveFailed', { error: snap.saveError })}
          </p>
        ) : null}
      </div>

      <a className={styles.repositoryLink} href="https://github.com/Finb/Bark" target="_blank" rel="noopener noreferrer">
        {t('repository')}
      </a>
    </div>
  )
}