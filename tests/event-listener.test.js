import test from 'node:test'
import assert from 'node:assert/strict'
import {
  composeBody,
  createDedupLedger,
  intentOfEvent,
  lastAssistantText,
  workspaceNameOf,
} from '../lib/event-listener.js'
import { DEFAULT_SETTINGS } from '../lib/settings-store.js'

/** Minimal session stub satisfying the fields the listener reads. */
function session({ id = 's1', cwd, events = [] } = {}) {
  const header = {}
  if (cwd !== undefined) header.cwd = cwd
  return { id, header, events }
}

function sessionWithCwd(cwd) {
  return session({ cwd })
}

function event(type, data, seq = 1) {
  return { type, seq, time: Date.now(), data }
}

test('workspaceNameOf derives the workspace title from the cwd basename', () => {
  assert.equal(workspaceNameOf(sessionWithCwd('/home/u/dsh-notify-bark')), 'dsh-notify-bark')
  assert.equal(workspaceNameOf(session()), 's1')
  assert.equal(workspaceNameOf(sessionWithCwd('')), 's1')
})

test('intentOfEvent maps all six turn/end reasons', () => {
  const cases = [
    ['completed', 'completed', '✅ 任务完成'],
    ['error', 'error', '❌ 执行失败'],
    ['blocked', 'blocked', '🚫 执行被阻塞'],
    ['aborted', 'aborted', '⏹ 已中止'],
    ['max-tokens', 'maxTokens', '⚠️ Token 达到上限'],
    ['interrupted', 'interrupted', '⏸ 异常中断'],
  ]
  for (const [kind, flag, headline] of cases) {
    const intent = intentOfEvent(event('turn/end', { turn: 1, reason: { kind } }))
    assert.equal(intent?.flag, flag, kind)
    assert.equal(intent?.headline, headline, kind)
  }
})

test('intentOfEvent carries the error message for error turns', () => {
  const intent = intentOfEvent(event('turn/end', { turn: 1, reason: { kind: 'error', error: { message: 'npm build failed' } } }))
  assert.equal(intent?.detail, 'npm build failed')
})

test('intentOfEvent maps ask_user_question tool calls to the question intent', () => {
  const intent = intentOfEvent(event('tool/call', {
    turn: 1,
    step: 1,
    callId: 'c1',
    name: 'ask_user_question',
    arguments: JSON.stringify({ questions: [{ id: 'q1', question: '请选择通知消息的展示方式' }] }),
  }))
  assert.equal(intent?.flag, 'question')
  assert.equal(intent?.detail, '请选择通知消息的展示方式')
  assert.equal(intent?.headline, '❓ 等待你的回答')
})

test('intentOfEvent maps exit_plan_mode tool calls to the plan-review intent', () => {
  const intent = intentOfEvent(event('tool/call', { turn: 1, step: 1, callId: 'c2', name: 'exit_plan_mode', arguments: '{}' }))
  assert.equal(intent?.flag, 'planReview')
})

test('intentOfEvent maps approval/asked events to the approval intent', () => {
  const intent = intentOfEvent(event('approval/asked', { id: 'a1', toolName: 'bash', reason: '命令需要授权' }))
  assert.equal(intent?.flag, 'approval')
  assert.ok(intent?.detail.includes('bash'))
  assert.ok(intent?.detail.includes('需要授权'))
})

test('unrelated events produce no intent', () => {
  assert.equal(intentOfEvent(event('user/message', { turn: 1, content: [], source: { kind: 'user' } })), undefined)
  assert.equal(intentOfEvent(event('tool/call', { turn: 1, step: 1, callId: 'c3', name: 'bash', arguments: '{}' })), undefined)
})

test('lastAssistantText returns the newest assistant text block', () => {
  const events = [
    event('assistant/message', { turn: 1, step: 1, message: { content: [{ type: 'text', text: 'older' }] } }, 1),
    event('assistant/message', { turn: 2, step: 1, message: { content: [{ type: 'text', text: 'newest reply' }] } }, 2),
    event('tool/call', { turn: 2, step: 2, callId: 'c', name: 'bash', arguments: '{}' }, 3),
  ]
  assert.equal(lastAssistantText(session({ events })), 'newest reply')
  assert.equal(lastAssistantText(session({ events: [] })), '')
})

test('composeBody appends assistant text only when enabled', () => {
  const intent = { flag: 'completed', headline: '✅ 任务完成', detail: '' }
  const withText = composeBody(intent, { ...DEFAULT_SETTINGS, includeAssistantText: true }, '完成啦')
  assert.ok(withText.includes('完成啦'))
  const without = composeBody(intent, { ...DEFAULT_SETTINGS, includeAssistantText: false }, '完成啦')
  assert.ok(!without.includes('完成啦'))
})

test('composeBody truncates to maxBodyChars with an ellipsis', () => {
  const intent = { flag: 'completed', headline: '✅ 任务完成', detail: 'x'.repeat(500) }
  const body = composeBody(intent, { ...DEFAULT_SETTINGS, maxBodyChars: 50 }, '')
  assert.ok(body.length <= 51)
  assert.ok(body.endsWith('…'))
})

test('dedup ledger admits each key once', () => {
  const ledger = createDedupLedger(10)
  assert.equal(ledger.test('s1:5'), true)
  assert.equal(ledger.test('s1:5'), false)
  assert.equal(ledger.test('s1:6'), true)
})
