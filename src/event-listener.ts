/**
 * dsh-notify-bark Host event listener: watches the `session/event` firehose
 * and maps turn endings, user questions, plan reviews, and approval requests
 * onto Bark pushes. Everything runs on the Host, so the browser being closed
 * does not matter — the same path dsh-im-bridge uses for WeChat.
 * @module dsh-notify-bark/event-listener
 */

import { basename } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
// Type-only: pulls dsh-user-approval's session event-map augmentation, which
// adds the approval/asked event to the SessionEventMap interface.
import type {} from '@deepseek-ai/dsh-user-approval'
import { sendBark } from './bark-service.ts'
import {
  EVENT_META,
  TURN_END_EVENT_FLAG,
  sanitizeBarkUrl,
  type BarkEventSettings,
  type BarkSettings,
} from './settings-store.ts'

/** Workspace title for a session: last path segment of its cwd, else its id. */
export function workspaceNameOf(session: Session): string {
  const cwd = session.header.cwd
  return cwd !== undefined && cwd.length > 0 ? basename(cwd) : String(session.id)
}

/** A decided notification: which event fired, its headline, and extra detail. */
export interface NotificationIntent {
  /** The settings event flag this notification maps to. */
  flag: keyof BarkEventSettings
  /** Headline, e.g. "✅ 任务完成". */
  headline: string
  /** Event-specific detail line (error message, question text, …). */
  detail: string
}

/** Pull the last assistant reply's text blocks from the session log. */
export function lastAssistantText(session: Session): string {
  const events = session.events
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index] as SessionEvent | undefined
    if (event === undefined || event.type !== 'assistant/message') continue
    const blocks = event.data.message?.content ?? []
    const text = blocks
      .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim()
    if (text.length > 0) return text
  }
  return ''
}

/**
 * Decide whether a session event should notify, and with what content.
 *
 * `approval/asked` is declared by dsh-user-approval through a session
 * event-map augmentation (imported above), so it participates in the
 * discriminated union exactly like the core event types.
 * @returns the intent, or undefined when the event is not notifiable.
 */
export function intentOfEvent(event: SessionEvent): NotificationIntent | undefined {
  switch (event.type) {
    case 'turn/end': {
      const flag = TURN_END_EVENT_FLAG[event.data.reason.kind]
      if (flag === undefined) return undefined
      const meta = EVENT_META[flag]
      let detail = ''
      if (event.data.reason.kind === 'error') {
        detail = event.data.reason.error?.message ?? '任务执行出错'
      } else if (event.data.reason.kind === 'blocked') {
        detail = '任务被阻塞，等待你处理'
      } else if (event.data.reason.kind === 'max-tokens') {
        detail = '某一步骤达到输出 Token 上限'
      } else if (event.data.reason.kind === 'interrupted') {
        detail = '会话曾被异常中断，等待恢复'
      }
      return { flag, headline: meta.headline, detail }
    }
    case 'tool/call': {
      if (event.data.name === 'ask_user_question') {
        let question = ''
        try {
          const parsed = JSON.parse(event.data.arguments) as { questions?: Array<{ question?: string }> }
          question = parsed.questions?.[0]?.question ?? ''
        } catch {
          question = ''
        }
        return {
          flag: 'question',
          headline: EVENT_META.question.headline,
          detail: question,
        }
      }
      if (event.data.name === 'exit_plan_mode') {
        return {
          flag: 'planReview',
          headline: EVENT_META.planReview.headline,
          detail: 'Agent 已提交计划，等待你的确认',
        }
      }
      return undefined
    }
    case 'approval/asked': {
      const tool = event.data.toolName.length > 0 ? `工具 ${event.data.toolName}` : '一个操作'
      const reason = event.data.reason !== undefined && event.data.reason.length > 0 ? `：${event.data.reason}` : ''
      return {
        flag: 'approval',
        headline: EVENT_META.approval.headline,
        detail: `${tool} 需要授权${reason}`,
      }
    }
    default:
      return undefined
  }
}

/** Compose the final body, honoring the content-length bound. */
export function composeBody(intent: NotificationIntent, settings: BarkSettings, assistantText: string): string {
  const parts = [intent.headline]
  if (intent.detail.length > 0) parts.push(intent.detail)
  if (settings.includeAssistantText && assistantText.length > 0) parts.push('', assistantText)
  const body = parts.join('\n')
  return body.length > settings.maxBodyChars ? `${body.slice(0, settings.maxBodyChars)}…` : body
}

/** Bounded dedup ledger: one entry per session:seq, evicting the oldest. */
export function createDedupLedger(maxEntries = 500): { test(key: string): boolean } {
  const seen = new Map<string, number>()
  const windowMs = 24 * 60 * 60 * 1000
  return {
    test(key: string): boolean {
      const now = Date.now()
      const previous = seen.get(key)
      if (previous !== undefined && now - previous < windowMs) return false
      seen.set(key, now)
      if (seen.size > maxEntries) {
        const oldest = seen.keys().next().value
        if (oldest !== undefined) seen.delete(oldest)
      }
      return true
    },
  }
}

/**
 * Subscribe the plugin to `session/event` and push Bark notifications.
 * @param ctx - plugin context.
 * @param getSettings - live settings thunk (follows the settings section).
 * @returns the disposer removing the listener (cordis ctx.on returns one).
 */
export function createEventListener(ctx: Context, getSettings: () => BarkSettings): () => void {
  const dedup = createDedupLedger()

  const listener = (session: Session, event: SessionEvent): void => {
    // One push per logical event, even across reconnects or reloads.
    if (!dedup.test(`${session.id}:${event.seq}`)) return

    const settings = getSettings()
    if (!settings.enabled) return
    const endpoint = sanitizeBarkUrl(settings.barkUrl)
    if (endpoint.length === 0) return

    const intent = intentOfEvent(event)
    if (intent === undefined) return
    if (!settings.events[intent.flag]) return

    const assistantText = event.type === 'turn/end' ? lastAssistantText(session) : ''
    const meta = EVENT_META[intent.flag]
    const body = composeBody(intent, settings, assistantText)

    void sendBark(endpoint, {
      title: workspaceNameOf(session),
      body,
      group: settings.group,
      level: meta.level,
    }).catch((error: unknown) => {
      // Never log the endpoint (it carries the device key).
      const message = error instanceof Error ? error.message : String(error)
      ctx.logger.warn(`[bark-notify] 推送失败（已配置:${settings.barkUrl.length > 0}）: ${message}`)
    })
  }

  return ctx.on('session/event', listener)
}