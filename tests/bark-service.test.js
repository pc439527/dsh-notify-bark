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

test('sendBark rejects a non-2xx response with the HTTP code', async () => {
  globalThis.fetch = async () => new Response('{"code":400,"message":"bad"}', { status: 400 })
  await assert.rejects(
    () => sendBark(ENDPOINT, { title: 't', body: 'b' }),
    (error) => error instanceof BarkSendError && error.code === BARK_ERROR_CODES.HTTP_ERROR && /400/.test(error.message),
  )
})

test('sendBark throws NOT_CONFIGURED for an empty endpoint', async () => {
  await assert.rejects(
    () => sendBark('   ', { title: 't', body: 'b' }),
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
  globalThis.fetch = async () => { throw new TypeError('fetch failed') }
  await assert.rejects(
    () => sendBark(ENDPOINT, { title: 't', body: 'b' }),
    (error) => error instanceof BarkSendError && error.code === BARK_ERROR_CODES.NETWORK_ERROR,
  )
})

test('buildTestPayload carries the group and an active level', () => {
  const payload = buildTestPayload('DeepSeek Harness')
  assert.equal(payload.group, 'DeepSeek Harness')
  assert.equal(payload.level, 'active')
  assert.ok(payload.body.includes('Bark'))
})
