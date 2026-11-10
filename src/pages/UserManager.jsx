import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import './UserManager.css'
import { API_BASE } from '../config'
import { useAuth } from '../context/AuthContext'

const ROLES = ['support', 'ops', 'accounts', 'supervisor']
const EMPTY_FORM = { full_name: '', email: '', password: '', role: 'support' }

function generatePassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return Array.from(bytes, b => chars[b % chars.length]).join('')
}

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function UserManager() {
  const { account } = useAuth()
  const canManage = account?.role === 'supervisor'
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [created, setCreated] = useState(null)
  const [copied, setCopied] = useState('')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/auth/users`)
      const body = await res.json()
      if (!res.ok) throw new Error(body.detail || body.error || 'Could not load users.')
      setUsers(body)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }, [])

  useEffect(() => { if (canManage) fetchUsers(); else setLoading(false) }, [canManage, fetchUsers])

  const openForm = () => {
    setForm({ ...EMPTY_FORM, password: generatePassword() })
    setFormError('')
    setShowForm(true)
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const body = await res.json()
      if (!res.ok || body.error) throw new Error(body.detail || body.error || 'Could not create the user.')
      // The API key is only returned this once; keep it with the password
      // so both can be handed over together.
      setCreated({ ...body, password: form.password })
      setShowForm(false)
      fetchUsers()
    } catch (err) {
      setFormError(err.message)
    }
    setSaving(false)
  }

  const rotateKey = async (user) => {
    if (!window.confirm(`Rotate the API key for ${user.email}? Their current key stops working.`)) return
    try {
      const res = await fetch(`${API_BASE}/api/auth/users/${user.account_no}/rotate-key`, { method: 'POST' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.detail || body.error || 'Could not rotate the key.')
      setCreated({ ...user, ...body, rotated: true })
    } catch (err) {
      setError(err.message)
    }
  }

  const copy = async (label, text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(''), 1500)
    } catch { /* Clipboard may be blocked; the value is still on screen. */ }
  }

  const term = search.trim().toLowerCase()
  const shown = term
    ? users.filter(u => [u.full_name, u.email, u.account_no, u.role].some(v => String(v || '').toLowerCase().includes(term)))
    : users

  return (
    <div className="um-page">
      <div className="um-header">
        <div>
          <Link to="/agents" className="um-back">← Agents</Link>
          <h1>👥 Users</h1>
          <p className="um-subtitle">Accounts that can sign in to the Orio AI Platform</p>
        </div>
        {canManage && <button className="um-btn um-btn-primary" onClick={openForm}>+ New User</button>}
      </div>

      {!canManage && !loading && (
        <div className="um-notice">Only a supervisor can view and create users.</div>
      )}
      {error && <div className="um-notice um-notice-error">{error}</div>}

      {canManage && (
        <>
          <div className="um-toolbar">
            <input className="um-search" placeholder="Search name, email, account no, role…"
                   value={search} onChange={e => setSearch(e.target.value)} />
            <span className="um-count">{shown.length} of {users.length}</span>
          </div>

          {loading ? <div className="um-empty">Loading…</div> : (
            <div className="um-table-wrap">
              <table className="um-table">
                <thead>
                  <tr>
                    <th>Account</th><th>Name</th><th>Email</th><th>Role</th>
                    <th>Status</th><th>Created</th><th>Last login</th><th />
                  </tr>
                </thead>
                <tbody>
                  {shown.map(u => (
                    <tr key={u.account_no}>
                      <td className="um-mono">{u.account_no}</td>
                      <td>{u.full_name || '—'}</td>
                      <td>{u.email}</td>
                      <td><span className={`um-badge um-role-${u.role}`}>{u.role}</span></td>
                      <td>
                        <span className={`um-badge ${u.is_active ? 'um-active' : 'um-inactive'}`}>
                          {u.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td>{formatDate(u.created_at)}</td>
                      <td>{formatDate(u.last_login_at)}</td>
                      <td><button className="um-link" onClick={() => rotateKey(u)}>Rotate key</button></td>
                    </tr>
                  ))}
                  {shown.length === 0 && (
                    <tr><td colSpan={8} className="um-empty">No users found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showForm && (
        <div className="um-overlay" onClick={() => setShowForm(false)}>
          <form className="um-modal" onClick={e => e.stopPropagation()} onSubmit={submit}>
            <h2>New User</h2>
            <label>Full name
              <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
            </label>
            <label>Email
              <input type="email" required value={form.email}
                     onChange={e => setForm({ ...form, email: e.target.value })} />
            </label>
            <label>Password
              <div className="um-row">
                <input required minLength={8} value={form.password}
                       onChange={e => setForm({ ...form, password: e.target.value })} />
                <button type="button" className="um-btn um-btn-secondary"
                        onClick={() => setForm({ ...form, password: generatePassword() })}>Generate</button>
              </div>
            </label>
            <label>Role
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            {formError && <div className="um-notice um-notice-error">{formError}</div>}
            <div className="um-actions">
              <button type="button" className="um-btn um-btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="um-btn um-btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create user'}</button>
            </div>
          </form>
        </div>
      )}

      {created && (
        <div className="um-overlay">
          <div className="um-modal">
            <h2>{created.rotated ? 'New API key' : 'User created'}</h2>
            <p className="um-warn">Copy these now — the API key is shown only once.</p>
            {[
              ['Account no', created.account_no],
              ['Email', created.email],
              ...(created.password ? [['Password', created.password]] : []),
              ['API key', created.api_key],
            ].map(([label, value]) => (
              <div className="um-cred" key={label}>
                <span className="um-cred-label">{label}</span>
                <code>{value}</code>
                <button className="um-link" onClick={() => copy(label, value)}>
                  {copied === label ? 'Copied' : 'Copy'}
                </button>
              </div>
            ))}
            <div className="um-actions">
              <button className="um-btn um-btn-primary" onClick={() => setCreated(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManager
