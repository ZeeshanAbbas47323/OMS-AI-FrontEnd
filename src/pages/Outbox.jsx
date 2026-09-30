import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE } from '../config'
import './Outbox.css'

const API = API_BASE

/** What each status means, in the words the operator needs. */
const STATUS = {
  recorded: { label: 'Recorded', hint: 'Composed and stored — not delivered (sandbox)' },
  sent:     { label: 'Sent',     hint: 'Accepted by WhatsApp — not yet confirmed delivered' },
  delivered:{ label: 'Delivered', hint: 'Confirmed on the recipient\u2019s phone' },
  read:     { label: 'Read',      hint: 'Opened by the recipient' },
  queued:   { label: 'Queued',   hint: 'Waiting to go out' },
  blocked:  { label: 'Blocked',  hint: 'Live mode, but this address is not allowlisted' },
  failed:   { label: 'Failed',   hint: 'The provider rejected it' },
}

const CHANNEL_ICON = { whatsapp: '💬', email: '✉️' }

function timeAgo(iso) {
  if (!iso) return ''
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function Outbox() {
  const [messages, setMessages] = useState([])
  const [mode, setMode] = useState('')
  const [allowlistSize, setAllowlistSize] = useState(0)
  const [awaiting, setAwaiting] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [channelFilter, setChannelFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [marking, setMarking] = useState('')

  const load = useCallback(async () => {
    try {
      const [outRes, awaitRes] = await Promise.all([
        fetch(`${API}/api/agent/outbox?limit=200`),
        fetch(`${API}/api/agent/outbox/awaiting-reply?hours=24`),
      ])
      if (!outRes.ok) throw new Error(`Outbox request failed (${outRes.status})`)
      const out = await outRes.json()
      setMessages(out.messages || [])
      setMode(out.mode || '')
      setAllowlistSize(out.allowlist_size || 0)
      const wait = awaitRes.ok ? await awaitRes.json() : { messages: [] }
      setAwaiting(wait.messages || [])
      setError('')
    } catch (err) {
      setError(err.message || 'Could not load the outbox.')
    }
  }, [])

  useEffect(() => { load().finally(() => setLoading(false)) }, [load])

  const awaitingIds = useMemo(
    () => new Set(awaiting.map((m) => m.message_id)),
    [awaiting],
  )

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return messages.filter((m) => {
      if (channelFilter !== 'all' && m.channel !== channelFilter) return false
      if (statusFilter !== 'all' && m.status !== statusFilter) return false
      if (!q) return true
      return [m.recipient_name, m.recipient_address, m.body, m.subject, String(m.order_id || '')]
        .some((f) => (f || '').toLowerCase().includes(q))
    })
  }, [messages, channelFilter, statusFilter, search])

  const counts = useMemo(() => {
    const by = {}
    for (const m of messages) by[m.status] = (by[m.status] || 0) + 1
    return by
  }, [messages])

  const markReplied = async (messageId) => {
    setMarking(messageId)
    try {
      const res = await fetch(`${API}/api/agent/outbox/${messageId}/replied`, { method: 'POST' })
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setMarking('')
    }
  }

  if (loading) return <div className="outbox-page"><div className="outbox-loading">Loading outbox…</div></div>

  return (
    <div className="outbox-page">
      <header className="outbox-header">
        <Link to="/agents" className="outbox-back">← Agents</Link>
        <div className="outbox-title">
          <h1>📤 Outbox</h1>
          <p>Every message the agent has composed — delivered or not</p>
        </div>
        <button className="outbox-refresh" onClick={load}>↻ Refresh</button>
      </header>

      {/* The single most important fact on this page: whether these messages
          actually reach customers. Stated plainly, not as a subtle badge. */}
      <div className={`outbox-mode ${mode === 'live' ? 'live' : 'sandbox'}`}>
        {mode === 'live' ? (
          <>
            <strong>LIVE</strong>
            <span>
              Messages are delivered to real customers.
              {allowlistSize > 0
                ? ` Only ${allowlistSize} allowlisted address${allowlistSize > 1 ? 'es' : ''} can receive them.`
                : ' The allowlist is empty, so everything is blocked.'}
            </span>
          </>
        ) : (
          <>
            <strong>SANDBOX</strong>
            <span>Messages are composed and stored, but never delivered. Nothing here has reached a customer.</span>
          </>
        )}
      </div>

      {error && <div className="outbox-error">{error}</div>}

      <div className="outbox-stats">
        <div className="outbox-stat"><span className="n">{messages.length}</span><span className="k">total</span></div>
        {Object.entries(counts).map(([status, n]) => (
          <div key={status} className="outbox-stat">
            <span className="n">{n}</span>
            <span className="k">{(STATUS[status] || { label: status }).label.toLowerCase()}</span>
          </div>
        ))}
        <div className="outbox-stat awaiting">
          <span className="n">{awaiting.length}</span><span className="k">awaiting reply</span>
        </div>
      </div>

      <div className="outbox-filters">
        <input
          className="outbox-search"
          placeholder="Search name, number, order or text…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}>
          <option value="all">All channels</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">Email</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {Object.keys(STATUS).map((s) => (
            <option key={s} value={s}>{STATUS[s].label}</option>
          ))}
        </select>
      </div>

      {visible.length === 0 ? (
        <div className="outbox-empty">
          {messages.length === 0
            ? 'The agent has not composed any messages yet.'
            : 'No messages match these filters.'}
        </div>
      ) : (
        <div className="outbox-list">
          {visible.map((m) => {
            const status = STATUS[m.status] || { label: m.status, hint: '' }
            const isAwaiting = awaitingIds.has(m.message_id)
            return (
              <div
                key={m.message_id}
                className={`outbox-card ${m.status}`}
                onClick={() => setSelected(m)}
              >
                <div className="outbox-card-top">
                  <span className="outbox-channel" title={m.channel}>
                    {CHANNEL_ICON[m.channel] || '•'}
                  </span>
                  <span className="outbox-to">
                    <strong>{m.recipient_name || 'Unknown'}</strong>
                    <span className="outbox-addr">{m.recipient_address}</span>
                  </span>
                  <span className={`outbox-status ${m.status}`} title={status.hint}>
                    {status.label}
                  </span>
                  <span className="outbox-time">{timeAgo(m.created_at)}</span>
                </div>

                <div className="outbox-body">{m.body}</div>

                <div className="outbox-card-bottom">
                  {m.order_id && <span className="outbox-tag">Order #{m.order_id}</span>}
                  <span className="outbox-tag id">{m.message_id}</span>
                  {isAwaiting && <span className="outbox-tag awaiting">Awaiting reply</span>}
                  {m.error && <span className="outbox-tag failed">{m.error}</span>}
                  {isAwaiting && (
                    <button
                      className="outbox-mark"
                      disabled={marking === m.message_id}
                      onClick={(e) => { e.stopPropagation(); markReplied(m.message_id) }}
                    >
                      {marking === m.message_id ? 'Saving…' : 'Mark replied'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selected && (
        <div className="outbox-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="outbox-modal" onClick={(e) => e.stopPropagation()}>
            <div className="outbox-modal-head">
              <h2>{CHANNEL_ICON[selected.channel] || '•'} {selected.recipient_name}</h2>
              <button onClick={() => setSelected(null)}>✕</button>
            </div>
            <dl className="outbox-meta">
              <dt>To</dt><dd>{selected.recipient_address} ({selected.recipient_kind})</dd>
              <dt>Channel</dt><dd>{selected.channel}</dd>
              {selected.subject && <><dt>Subject</dt><dd>{selected.subject}</dd></>}
              {selected.order_id ? <><dt>Order</dt><dd>#{selected.order_id}</dd></> : null}
              <dt>Status</dt>
              <dd>
                {(STATUS[selected.status] || {}).label || selected.status}
                <span className="outbox-hint"> — {(STATUS[selected.status] || {}).hint}</span>
              </dd>
              <dt>Mode at send</dt><dd>{selected.mode}</dd>
              <dt>Composed</dt><dd>{new Date(selected.created_at).toLocaleString()}</dd>
              {selected.sent_at && <><dt>Sent</dt><dd>{new Date(selected.sent_at).toLocaleString()}</dd></>}
              {selected.replied_at && <><dt>Replied</dt><dd>{new Date(selected.replied_at).toLocaleString()}</dd></>}
              {selected.provider_message_id && <><dt>Provider ID</dt><dd>{selected.provider_message_id}</dd></>}
              {selected.error && <><dt>Error</dt><dd className="outbox-err">{selected.error}</dd></>}
              <dt>Message ID</dt><dd>{selected.message_id}</dd>
            </dl>
            <div className="outbox-modal-body">{selected.body}</div>
          </div>
        </div>
      )}
    </div>
  )
}
