import test from 'node:test'
import assert from 'node:assert/strict'
import { BARK_ERROR_CODES, BarkSendError, buildTestPayload, sendBark } from '../lib/bark-service.js'

const ENDPOINT = 'https://api.day.app/testkey/'

test('sendBark posts JSON to the normalized endpoint and accepts 2xx', async () => {
  let captured = null
  globalThis.fetch = async (url, init) => {
    captured = { url, init }
    return new Response('{"code":200,"message":"success"}', { status: 200 })
  }
  await sendBark(ENDPOINT, { title: 't', body: 'b', group: 'g', level: 'active' })
  assert.equal(captured.url, 'https://api.day.app/testkey')
  assert.equal(captured.init.method, 'POST')
  assert.equal(captured.init.headers['content-type'], 'application/json; charset=utf-8')
  const body = JSON.parse(captured.init.body)
  assert.equal(body.title, 't')
  assert.equal(body.body, 'b')
  assert.equal(body.group, 'g')
  assert.equal(body.level, 'active')
})

test('sendBark reports only the HTTP status and cancels the unread body', async () => {
  let cancelled = false
  globalThis.fetch = async () => new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(`Rejected ${ENDPOINT}`))
    },
    cancel() {
      cancelled = true
    },
  }), { status: 400 })
  await assert.rejects(
    () => sendBark(ENDPOINT, { title: 't', body: 'b' }),
    (error) => error instanceof BarkSendError && error.code === BARK_ERROR_CODES.HTTP_ERROR && error.message === 'Bark HTTP 400',
  )
  assert.equal(cancelled, true)
})

test('sendBark throws NOT_CONFIGURED for an empty endpoint', async () => {
  await assert.rejects(
    () => sendBark('   ', { title: 't', body: 'b' }),
    (error) => error instanceof BarkSendError && error.code === BARK_ERROR_CODES.NOT_CONFIGURED,
  )
})

test('sendBark normalizes a pasted curl command to the base instead of failing to parse', async () => {
  let captured = null
  globalThis.fetch = async (url) => {
    captured = url
    return new Response('{"code":200,"message":"success"}', { status: 200 })
  }
  await sendBark("curl -X GET 'https://api.day.app/abc/title/body?group=x&ttl=600'", { title: 't', body: 'b' })
  assert.equal(captured, 'https://api.day.app/abc')
})

test('sendBark reports a clear NOT_CONFIGURED error for non-URL text', async () => {
  await assert.rejects(
    () => sendBark('this is not a url at all', { title: 't', body: 'b' }),
    (error) => error instanceof BarkSendError && error.code === BARK_ERROR_CODES.NOT_CONFIGURED,
  )
})

test('sendBark aborts on timeout and reports BARK_TIMEOUT', async () => {
  globalThis.fetch = async (_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => {
      const error = new Error('aborted')
      error.name = 'AbortError'
      reject(error)
    })
  })
  await assert.rejects(
    () => sendBark(ENDPOINT, { title: 't', body: 'b' }, 50),
    (error) => error instanceof BarkSendError && error.code === BARK_ERROR_CODES.TIMEOUT,
  )
})

test('sendBark folds network failures into BARK_NETWORK_ERROR', async () => {
  globalThis.fetch = async () => { throw new TypeError(`fetch failed for ${ENDPOINT}`) }
  await assert.rejects(
    () => sendBark(ENDPOINT, { title: 't', body: 'b' }),
    (error) => error instanceof BarkSendError && error.code === BARK_ERROR_CODES.NETWORK_ERROR && !error.message.includes('testkey'),
  )
})

test('buildTestPayload carries the group and an active level', () => {
  const payload = buildTestPayload('DeepSeek Harness')
  assert.equal(payload.group, 'DeepSeek Harness')
  assert.equal(payload.level, 'active')
  assert.ok(payload.body.includes('Bark'))
})
