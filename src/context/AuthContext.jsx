import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { API_BASE, setApiKey } from '../config'

const AuthContext = createContext(null)
const STORAGE_KEY = 'orio.auth'

function readStored() {
  try {
    const account = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    // Old builds stored a non-expiring integration key. Require a fresh login
    // once so the browser uses a revocable, expiring session instead.
    if (account?.api_key && account.expires_at * 1000 > Date.now()) return account
    localStorage.removeItem(STORAGE_KEY)
  } catch { /* Invalid local data is not an authenticated session. */ }
  return null
}

export function AuthProvider({ children }) {
  const [account, setAccount] = useState(readStored)
  const [checking, setChecking] = useState(Boolean(account))

  const signOut = useCallback(() => {
    const previous = readStored()
    localStorage.removeItem(STORAGE_KEY)
    setApiKey('')
    setAccount(null)
    setChecking(false)
    if (previous?.api_key) {
      // Explicitly send the old credential before losing it; logout revokes
      // this session server-side without revoking other logged-in devices.
      fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST', headers: { 'X-API-Key': previous.api_key },
      }).catch(() => {})
    }
  }, [])

  const signIn = (details) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(details))
    setApiKey(details.api_key)
    setAccount(details)
  }

  useEffect(() => {
    setApiKey(account?.api_key || '')
    if (!account?.api_key) {
      setChecking(false)
      return
    }
    let cancelled = false
    fetch(`${API_BASE}/api/auth/me`, { headers: { 'X-API-Key': account.api_key } })
      .then(res => (res.ok ? res.json() : null))
      .then(body => {
        if (cancelled) return
        if (!body?.authenticated) signOut()
        setChecking(false)
      })
      .catch(() => !cancelled && setChecking(false))
    const timer = setTimeout(signOut, Math.max(0, account.expires_at * 1000 - Date.now()))
    const expired = (event) => {
      if (event.detail?.key === account.api_key) signOut()
    }
    window.addEventListener('orio:unauthorized', expired)
    return () => {
      cancelled = true
      clearTimeout(timer)
      window.removeEventListener('orio:unauthorized', expired)
    }
  }, [account, signOut])

  useEffect(() => {
    const changed = (event) => {
      if (event.key === STORAGE_KEY) setAccount(readStored())
    }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  }, [])

  return (
    <AuthContext.Provider value={{ account, checking, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
