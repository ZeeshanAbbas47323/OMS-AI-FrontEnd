import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { transformSync } from 'esbuild'

function transport() {
  const requests = [], events = []
  let status = 200
  const window = {
    location: { href: 'http://localhost:5173/agents/orio' },
    fetch: async (input, init) => { requests.push({ input, init }); return { status } },
    dispatchEvent: event => events.push(event),
  }
  const module = { exports: {} }
  const source = readFileSync(new URL('../src/config.js', import.meta.url), 'utf8')
  const code = transformSync(source, { format: 'cjs', define: {
    'import.meta.env': JSON.stringify({ VITE_API_URL: 'http://localhost:8001', VITE_API_KEY: 'obsolete-build-key' }),
  } }).code
  vm.runInNewContext(code, { module, exports: module.exports, window, URL, Headers,
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail } } })
  module.exports.setApiKey('synthetic-session')
  module.exports.installApiKeyInterceptor()
  return { api: module.exports, window, requests, events, setStatus: value => { status = value } }
}

test('credentials go only to the exact backend origin', async () => {
  const t = transport()
  await t.window.fetch('http://localhost:8001/api/models')
  assert.equal(t.requests[0].init.headers.get('X-API-Key'), 'synthetic-session')
  for (const url of ['http://localhost:8001.attacker.invalid/api/models',
    'http://localhost:80010/api/models', 'https://example.com/api/models']) {
    await t.window.fetch(url)
    assert.equal(t.requests.at(-1).init.headers, undefined)
  }
})

test('session rejection produces a logout event for that credential', async () => {
  const t = transport()
  t.setStatus(401)
  await t.window.fetch('http://localhost:8001/api/agent/threads')
  assert.equal(t.events.length, 1)
  assert.equal(t.events[0].type, 'orio:unauthorized')
  assert.equal(t.events[0].detail.key, 'synthetic-session')
})

test('bad password and permission rejection do not log out an unrelated session', async () => {
  const t = transport()
  t.setStatus(401)
  await t.window.fetch('http://localhost:8001/api/auth/login')
  t.setStatus(403)
  await t.window.fetch('http://localhost:8001/admin/stats')
  assert.equal(t.events.length, 0)
})


test('sign-out cannot fall back to a bundled shared API key', async () => {
  const t = transport()
  t.api.setApiKey('')
  await t.window.fetch('http://localhost:8001/api/models')
  assert.equal(t.api.getApiKey(), '')
  assert.equal(t.requests[0].init.headers, undefined)
})
