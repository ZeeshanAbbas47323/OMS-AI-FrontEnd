import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../config'
import { useAuth } from '../context/AuthContext'
import './Login.css'

/**
 * Signing in, and creating the first account.
 *
 * Registration is shown as a tab because the very first account has to be
 * created somehow; the backend closes it once one exists, and anyone
 * reaching it after that is told a supervisor has to invite them.
 */
export default function Login() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('support')
  const [error, setError] = useState('')
  const [issuedKey, setIssuedKey] = useState(null)
  const [busy, setBusy] = useState(false)

  const { signIn } = useAuth()
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const body = mode === 'login'
        ? { email, password }
        : { email, password, full_name: fullName, role }

      const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error || data.detail || 'That did not work.')
        return
      }

      if (mode === 'register') {
        // The key is shown once and never again, so it is not signed in
        // automatically — the account holder needs to copy it first.
        setIssuedKey(data)
        return
      }

      signIn(data)
      navigate('/agents/orio')
    } catch {
      setError('Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  if (issuedKey) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>Account created</h1>
          <p className="login-sub">
            Account <strong>{issuedKey.account_no}</strong> · {issuedKey.role}
          </p>
          <div className="login-keybox">
            <span className="login-keylabel">API key — shown once</span>
            <code className="login-key">{issuedKey.api_key}</code>
            <button
              type="button"
              className="login-copy"
              onClick={() => navigator.clipboard?.writeText(issuedKey.api_key)}
            >
              Copy
            </button>
          </div>
          <p className="login-note">
            Keep this integration key somewhere safe. It is shown here once;
            replace a lost key using key rotation. Browser login uses a separate expiring session.
          </p>
          <button
            className="login-submit"
            onClick={() => { setIssuedKey(null); setMode('login') }}
          >
            Continue to sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <h1>🤖 Orio</h1>
        <p className="login-sub">Sign in to the agent portal</p>

        <div className="login-tabs">
          <button type="button"
                  className={mode === 'login' ? 'active' : ''}
                  onClick={() => { setMode('login'); setError('') }}>
            Sign in
          </button>
          <button type="button"
                  className={mode === 'register' ? 'active' : ''}
                  onClick={() => { setMode('register'); setError('') }}>
            Create account
          </button>
        </div>

        {mode === 'register' && (
          <>
            <label>
              Full name
              <input value={fullName} onChange={e => setFullName(e.target.value)}
                     placeholder="Ali Hassan" />
            </label>
            <label>
              Role
              <select value={role} onChange={e => setRole(e.target.value)}>
                <option value="supervisor">Supervisor</option>
                <option value="ops">Operations</option>
                <option value="accounts">Accounts</option>
                <option value="support">Support</option>
              </select>
            </label>
          </>
        )}

        <label>
          Email
          <input type="email" required value={email}
                 onChange={e => setEmail(e.target.value)}
                 placeholder="you@getorio.com" />
        </label>

        <label>
          Password
          <input type="password" required value={password}
                 onChange={e => setPassword(e.target.value)}
                 placeholder={mode === 'register' ? 'At least 8 characters' : ''} />
        </label>

        {error && <div className="login-error">{error}</div>}

        <button className="login-submit" type="submit" disabled={busy}>
          {busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>

        {mode === 'register' && (
          <p className="login-note">
            Only the first account can be created here. After that a
            supervisor creates accounts for the team.
          </p>
        )}
      </form>
    </div>
  )
}
