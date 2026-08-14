/**
 * dsh-notify-bark settings section copy (zh/en).
 * @module dsh-notify-bark/client/locales
 */

/** Dictionary namespace this package registers. */
export const NS = 'bark-notify'

/** Simplified Chinese copy. */
export const zh = {
  'nav': 'Bark 通知',
  'title': 'Bark 通知',
  'intro': 'DSH Host 在回合结束、等待回答、等待授权等事件发生时，通过 Bark Server 推送到 iPhone。浏览器关掉也不影响。',
  'loading': '加载中…',
  'loadError': '设置加载失败：{error}',
  'master': '启用 Bark 通知',
  'masterHint': '关闭后不再发送任何推送。',
  'urlLabel': 'Bark 推送地址',
  'urlPlaceholder': 'https://api.day.app/xxxxxxxx',
  'urlHint': '填写完整推送地址：官方 Bark 或自建 Bark Server 均可。地址不会回显，仅显示脱敏状态。',
  'urlConfigured': '已配置：{masked}',
  'urlUnconfigured': '未配置',
  'urlSave': '保存地址',
  'eventsTitle': '通知事件',
  'contentTitle': '通知内容',
  'includeAssistant': '附带 AI 最后一段回复',
  'includeAssistantHint': '任务完成类通知附带模型最后一段回复。',
  'maxBodyChars': '最大内容长度',
  'groupLabel': 'Bark Group',
  'groupHint': '同一 Group 的推送在手机上聚合。',
  'test': '测试推送',
  'testing': '发送中…',
  'testSent': '测试推送已发送',
  'saving': '保存中…',
  'saveFailed': '保存失败：{error}',
  'event.completed': '任务完成',
  'event.error': '执行错误',
  'event.blocked': '执行被阻塞',
  'event.aborted': '手动中止',
  'event.maxTokens': 'Token 达到上限',
  'event.interrupted': '异常中断',
  'event.question': '等待我回答',
  'event.approval': '等待授权',
  'event.planReview': '等待计划确认',
} as const

/** English copy. */
export const en = {
  'nav': 'Bark notifications',
  'title': 'Bark notifications',
  'intro': 'The DSH Host pushes to your iPhone through a Bark server when turns end, the agent waits for your answer, or an approval is requested — even with the browser closed.',
  'loading': 'Loading…',
  'loadError': 'Failed to load settings: {error}',
  'master': 'Enable Bark notifications',
  'masterHint': 'When off, nothing is pushed.',
  'urlLabel': 'Bark push endpoint',
  'urlPlaceholder': 'https://api.day.app/xxxxxxxx',
  'urlHint': 'Full endpoint URL — official Bark or a self-hosted server. The value is never shown back; only a masked status is.',
  'urlConfigured': 'Configured: {masked}',
  'urlUnconfigured': 'Not configured',
  'urlSave': 'Save endpoint',
  'eventsTitle': 'Notification events',
  'contentTitle': 'Notification content',
  'includeAssistant': "Include the AI's last reply",
  'includeAssistantHint': "Turn-end notifications append the model's last reply.",
  'maxBodyChars': 'Max body length',
  'groupLabel': 'Bark group',
  'groupHint': 'Pushes sharing a group aggregate on the phone.',
  'test': 'Send test push',
  'testing': 'Sending…',
  'testSent': 'Test push sent',
  'saving': 'Saving…',
  'saveFailed': 'Failed to save: {error}',
  'event.completed': 'Task completed',
  'event.error': 'Execution error',
  'event.blocked': 'Blocked',
  'event.aborted': 'Aborted',
  'event.maxTokens': 'Token limit reached',
  'event.interrupted': 'Interrupted',
  'event.question': 'Waiting for my answer',
  'event.approval': 'Waiting for approval',
  'event.planReview': 'Plan review',
} as const

/** Key union for this namespace. */
export type BarkNotifyKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** dsh-notify-bark settings copy. */
    'bark-notify': BarkNotifyKey
  }
}
