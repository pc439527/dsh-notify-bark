/**
 * dsh-notify-bark settings section component (React).
 *
 * Mirrored by the shipped module-loader bundle (lib/client.js). The section
 * renders: master switch, a write-only endpoint field with a masked status and
 * a test-push button, the nine event checkboxes, and the content options.
 * @module dsh-notify-bark/client/BarkSettings
 */

import { useState } from 'react'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import { EVENT_KEYS, type BarkSectionController, type BarkSectionSnapshot } from './index.ts'
import * as styles from './BarkSettings.module.css'

/** Props composed by the settings.section slot registration. */
export interface BarkSettingsSectionProps {
  /** Locale function bound to this section's namespace. */
  t(key: string, params?: Record<string, string>): string
  /** Host RPC controller for the bark namespace. */
  controller: BarkSectionController
  /** Selector hook over the controller's snapshot store. */
  useBark: SnapshotSelectorHook<BarkSectionSnapshot>
}

/** Render the Bark notifications settings section. */
export function BarkSettingsSection(props: BarkSettingsSectionProps): React.ReactElement | null {
  const { t, controller, useBark } = props
  const snap = useBark((snapshot) => snapshot)
  const [urlDraft, setUrlDraft] = useState('')
  const [groupDraft, setGroupDraft] = useState('')
  const [bodyCharsDraft, setBodyCharsDraft] = useState('')

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

  const toggleEvent = (key: string): void => {
    const next = { ...settings.events, [key]: !settings.events[key] }
    controller.store.update((draft) => {
      draft.settings = { ...draft.settings!, events: next }
    })
    void controller.save({ events: next })
  }

  const saveUrl = (): void => {
    const value = urlDraft.trim()
    if (value.length === 0) return
    setUrlDraft('')
    void controller.save({ barkUrl: value })
  }

  const saveGroup = (): void => {
    const value = groupDraft.trim()
    if (value.length === 0) return
    setGroupDraft('')
    void controller.save({ group: value })
  }

  const saveBodyChars = (): void => {
    const parsed = Number(bodyCharsDraft)
    if (!Number.isFinite(parsed)) {
      setBodyCharsDraft('')
      return
    }
    const clamped = Math.min(4000, Math.max(1, Math.round(parsed)))
    setBodyCharsDraft('')
    void controller.save({ maxBodyChars: clamped })
  }

  const onTest = (): void => {
    const group = groupDraft.trim().length > 0 ? groupDraft : settings.group
    void controller.test(group)
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.heading}>{t('title')}</h2>
      <p className={styles.intro}>{t('intro')}</p>

      <div className={styles.group}>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(event) => {
              const next = event.target.checked
              controller.store.update((draft) => {
                draft.settings = { ...draft.settings!, enabled: next }
              })
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
        {snap.saveError !== null ? (
          <p className={styles.statusError} role="alert">
            {t('saveFailed', { error: snap.saveError })}
          </p>
        ) : null}
      </div>

      <div className={styles.group}>
        <p className={styles.groupTitle}>{t('eventsTitle')}</p>
        {EVENT_KEYS.map((key) => (
          <label key={key} className={styles.check}>
            <input type="checkbox" checked={settings.events[key]} onChange={() => toggleEvent(key)} />
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
              controller.store.update((draft) => {
                draft.settings = { ...draft.settings!, includeAssistantText: next }
              })
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
            type="number"
            min={1}
            max={4000}
            value={bodyCharsDraft.length > 0 ? bodyCharsDraft : settings.maxBodyChars}
            onChange={(event) => setBodyCharsDraft(event.target.value)}
            onBlur={saveBodyChars}
            onKeyDown={(event) => {
              if (event.key === 'Enter') saveBodyChars()
            }}
          />
        </div>
        <div className={styles.row}>
          <span className={styles.label}>{t('groupLabel')}</span>
          <input
            className={styles.input}
            type="text"
            value={groupDraft.length > 0 ? groupDraft : settings.group}
            onChange={(event) => setGroupDraft(event.target.value)}
            onBlur={saveGroup}
            onKeyDown={(event) => {
              if (event.key === 'Enter') saveGroup()
            }}
          />
        </div>
        <p className={styles.hint}>{t('groupHint')}</p>
      </div>
    </div>
  )
}
