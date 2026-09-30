/**
 * Backend endpoints, resolved once.
 *
 * Set VITE_API_URL at build time to point the app at a deployed backend;
 * it falls back to the local dev server. The WebSocket base is derived from
 * it, so https deployments get wss automatically.
 */
export const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:8001'

export const WS_BASE = API_BASE.replace(/^http/, 'ws')

/** WebSocket URL for the main agent stream. */
export const AGENT_WS_URL = `${WS_BASE}/ws/agent`

/** WebSocket URL for the Sales Agent — its own socket, own domain. */
export const SALES_AGENT_WS_URL = `${WS_BASE}/ws/sales-agent`

/** Browser requests use only the current signed-in session. */
let currentKey = ''

export function setApiKey(key) {
  currentKey = key || ''
}

export function getApiKey() {
  return currentKey
}

/**
 * Attaches the API key to every request this app makes to the backend.
 *
 * Installed once at startup instead of threading a wrapper through the ~30
 * call sites, which would leave new fetches silently unauthenticated.
 */
export function installApiKeyInterceptor() {
  if (typeof window === 'undefined') return

  const originalFetch = window.fetch.bind(window)
  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url ?? ''
    const key = getApiKey()
    let isBackend = false
    try {
      const target = new URL(url, window.location.href)
      const base = new URL(API_BASE)
      isBackend = target.origin === base.origin &&
        (target.pathname === base.pathname || target.pathname.startsWith(base.pathname.replace(/\/$/, '') + '/'))
    } catch { /* Leave malformed requests to fetch. */ }
    if (!key || !isBackend) return originalFetch(input, init)

    const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined))
    if (!headers.has('X-API-Key')) headers.set('X-API-Key', key)
    return originalFetch(input, { ...init, headers }).then(response => {
      if (response.status === 401 && !url.includes('/api/auth/')) {
        window.dispatchEvent(new CustomEvent('orio:unauthorized', {
          detail: { key: headers.get('X-API-Key') },
        }))
      }
      return response
    })
  }
}
