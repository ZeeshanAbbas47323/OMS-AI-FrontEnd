import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE } from '../config'
import './Tickets.css'

/**
 * Staff queue for customer write-requests that arrive over WhatsApp
 * (agent/approval_relay.py) — "move my order to Leopards" and similar.
 * Each ticket mirrors the SAME pending action an ops WhatsApp YES/NO reply
 * would resolve; this page is a second front door onto it
 * (approval_relay.resolve_and_notify), not a separate queue, so a ticket
 * closed here is exactly as closed as one closed from WhatsApp.
 */

const STATUS_META = {
  pending: { label: 'Pending', tone: 'pending' },
  approved: { label: 'Approved', tone: 'approved' },
  rejected: { label: 'Rejected', tone: 'rejected' },
}

const QUICK_REASONS = [
  'Order already booked',
  'Courier not serviceable',
  'Customer unreachable',
  'Not permitted',
]

async function apiCall(path, options) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' }, ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`)
  return data
}

function timeAgo(iso) {
  if (!iso) return ''
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

function fullTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  })
}

function prettyField(name) {
  return String(name).replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())
}

function StatusPill({ status }) {
  const meta = STATUS_META[status] || { label: status, tone: 'pending' }
  return <span className={`tk-pill tk-tone-${meta.tone}`}>{meta.label}</span>
}

function TicketRow({ ticket, selected, onSelect }) {
  const tone = (STATUS_META[ticket.status] || STATUS_META.pending).tone
  return (
    <button
      className={`tk-row tk-tone-${tone} ${selected ? 'is-selected' : ''}`}
      onClick={() => onSelect(ticket.id)}
    >
      <span className="tk-row-dot" aria-hidden="true" />
      <span className="tk-row-main">
        <span className="tk-row-title">{ticket.title || 'Approval request'}</span>
        <span className="tk-row-sub">
          {ticket.business_name || ticket.ag_acno} · {ticket.customer_phone}
        </span>
      </span>
      <span className="tk-row-side">
        <span className="tk-row-time">{timeAgo(ticket.sent_at)}</span>
        <span className="tk-row-no">{ticket.ticket_no}</span>
      </span>
    </button>
  )
}

function ChangeList({ details }) {
  const changes = details?.changes
  if (!changes || Object.keys(changes).length === 0) return null
  return (
    <div className="tk-changes">
      {Object.entries(changes).map(([field, change]) => (
        <div key={field} className="tk-change">
          <span className="tk-change-field">{prettyField(field)}</span>
          <span className="tk-change-from">{String(change?.from ?? '—')}</span>
          <span className="tk-change-arrow" aria-hidden="true">→</span>
          <span className="tk-change-to">{String(change?.to ?? '—')}</span>
        </div>
      ))}
    </div>
  )
}

function TicketDetail({ ticket, onBack, onChanged, onToast }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [note, setNote] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const reasonRef = useRef(null)

  // A different ticket selected: never carry a half-typed note or an open
  // reject form across to it.
  useEffect(() => {
    setNote(''); setReason(''); setRejecting(false); setError(null)
  }, [ticket.id])

  useEffect(() => {
    if (rejecting) reasonRef.current?.focus()
  }, [rejecting])

  const act = async (kind) => {
    setBusy(true); setError(null)
    try {
      await apiCall(`/api/tickets/${ticket.id}/${kind}`, {
        method: 'POST',
        body: JSON.stringify(kind === 'resolve' ? { note } : { reason }),
      })
      onToast(kind === 'resolve'
        ? `${ticket.ticket_no} approved — customer notified`
        : `${ticket.ticket_no} rejected — customer notified`)
      onChanged()
    } catch (e) {
      setError(e.message)
    }
    setBusy(false)
  }

  const details = ticket.details || {}
  const pending = ticket.status === 'pending'

  return (
    <div className="tk-detail">
      <button className="tk-back" onClick={onBack}>← All tickets</button>

      <div className="tk-detail-head">
        <div>
          <h2>{ticket.title || 'Approval request'}</h2>
          <div className="tk-detail-no">{ticket.ticket_no} · raised {fullTime(ticket.sent_at)}</div>
        </div>
        <StatusPill status={ticket.status} />
      </div>

      <dl className="tk-meta">
        <div><dt>Business</dt><dd>{ticket.business_name || ticket.ag_acno}</dd></div>
        <div><dt>Customer phone</dt><dd>{ticket.customer_phone}</dd></div>
        {details.order_id && <div><dt>Order</dt><dd>#{details.order_id}</dd></div>}
        {details.customer_name && <div><dt>Consignee</dt><dd>{details.customer_name}</dd></div>}
      </dl>

      {ticket.request_text && (
        <section className="tk-section">
          <h3>Customer request</h3>
          <blockquote className="tk-quote">{ticket.request_text}</blockquote>
        </section>
      )}

      {details.changes && Object.keys(details.changes).length > 0 && (
        <section className="tk-section">
          <h3>Requested change</h3>
          <ChangeList details={details} />
        </section>
      )}

      <section className="tk-section">
        <h3>System note</h3>
        <p className="tk-muted-text">{ticket.summary}</p>
      </section>

      {!pending && (
        <section className={`tk-resolution tk-tone-${ticket.status}`}>
          <div className="tk-resolution-head">
            <StatusPill status={ticket.status} />
            <span>
              {ticket.resolved_by ? `by ${ticket.resolved_by} · ` : ''}{fullTime(ticket.resolved_at)}
            </span>
          </div>
          {ticket.resolved_note && <p>“{ticket.resolved_note}”</p>}
        </section>
      )}

      {error && <div className="tk-error" role="alert">{error}</div>}

      {pending && (
        <section className="tk-actions">
          {!rejecting ? (
            <>
              <input
                className="tk-input"
                placeholder="Add a note for the record (optional)"
                value={note}
                onChange={e => setNote(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !busy) act('resolve') }}
              />
              <div className="tk-btn-row">
                <button className="tk-btn tk-btn-approve" onClick={() => act('resolve')} disabled={busy}>
                  {busy ? 'Working…' : 'Approve & notify customer'}
                </button>
                <button className="tk-btn tk-btn-ghost-danger" onClick={() => setRejecting(true)} disabled={busy}>
                  Reject…
                </button>
              </div>
            </>
          ) : (
            <>
              <label className="tk-label" htmlFor="tk-reason">Reason for rejecting <em>(sent to the customer)</em></label>
              <input
                id="tk-reason"
                ref={reasonRef}
                className="tk-input"
                placeholder="e.g. Order already booked"
                value={reason}
                onChange={e => setReason(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && reason.trim() && !busy) act('reject')
                  if (e.key === 'Escape') setRejecting(false)
                }}
              />
              <div className="tk-chips">
                {QUICK_REASONS.map(r => (
                  <button key={r} type="button" className="tk-chip" onClick={() => setReason(r)}>{r}</button>
                ))}
              </div>
              <div className="tk-btn-row">
                <button className="tk-btn tk-btn-danger" onClick={() => act('reject')} disabled={busy || !reason.trim()}>
                  {busy ? 'Working…' : 'Reject & notify customer'}
                </button>
                <button className="tk-btn tk-btn-ghost" onClick={() => setRejecting(false)} disabled={busy}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  )
}

export default function Tickets() {
  const [tickets, setTickets] = useState([])
  const [filter, setFilter] = useState('')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [toast, setToast] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const autoSelected = useRef(false)

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      const data = await apiCall('/api/tickets?limit=200')
      setTickets(data.tickets || [])
      setError(null)
      setUpdatedAt(new Date())
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const id = setInterval(load, 20000)
    return () => clearInterval(id)
  }, [load])

  // Land on the oldest waiting ticket the first time data arrives — what a
  // reviewer opening this page almost always wants to see first.
  useEffect(() => {
    if (autoSelected.current || tickets.length === 0) return
    autoSelected.current = true
    const waiting = tickets.filter(t => t.status === 'pending')
    if (waiting.length) setSelectedId(waiting[waiting.length - 1].id)
  }, [tickets])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(id)
  }, [toast])

  const counts = useMemo(() => ({
    pending: tickets.filter(t => t.status === 'pending').length,
    approved: tickets.filter(t => t.status === 'approved').length,
    rejected: tickets.filter(t => t.status === 'rejected').length,
  }), [tickets])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tickets.filter(t => {
      if (filter && t.status !== filter) return false
      if (!q) return true
      return [t.title, t.ticket_no, t.business_name, t.customer_phone, t.request_text]
        .some(v => String(v || '').toLowerCase().includes(q))
    })
  }, [tickets, filter, query])

  const selected = tickets.find(t => t.id === selectedId) || null

  const STATS = [
    { key: 'pending', label: 'Pending', hint: 'Waiting on review' },
    { key: 'approved', label: 'Approved', hint: 'Carried out' },
    { key: 'rejected', label: 'Rejected', hint: 'Declined with a reason' },
  ]

  return (
    <div className="tk-page">
      <header className="tk-header">
        <div>
          <Link to="/agents" className="tk-crumb">← Agents</Link>
          <h1>Tickets</h1>
          <p>Customer requests from WhatsApp that need a human decision.</p>
        </div>
        <div className="tk-header-side">
          {updatedAt && <span className="tk-updated">Updated {timeAgo(updatedAt.toISOString())}</span>}
          <button className={`tk-icon-btn ${refreshing ? 'is-spinning' : ''}`} onClick={() => load(true)} title="Refresh" aria-label="Refresh">
            ↻
          </button>
        </div>
      </header>

      <div className="tk-stats">
        {STATS.map(s => (
          <button
            key={s.key}
            className={`tk-stat tk-tone-${s.key} ${filter === s.key ? 'is-active' : ''}`}
            onClick={() => setFilter(filter === s.key ? '' : s.key)}
            aria-pressed={filter === s.key}
          >
            <span className="tk-stat-num">{counts[s.key]}</span>
            <span className="tk-stat-label">{s.label}</span>
            <span className="tk-stat-hint">{s.hint}</span>
          </button>
        ))}
      </div>

      {error && <div className="tk-error" role="alert">{error}</div>}

      <div className={`tk-layout ${selected ? 'has-selection' : ''}`}>
        <aside className="tk-list-pane">
          <div className="tk-search">
            <input
              className="tk-input"
              placeholder="Search ticket, order, business, phone…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              aria-label="Search tickets"
            />
          </div>

          <div className="tk-list" role="list">
            {loading && [0, 1, 2].map(i => <div key={i} className="tk-skeleton" />)}
            {!loading && visible.length === 0 && (
              <div className="tk-empty">
                <div className="tk-empty-icon" aria-hidden="true">✓</div>
                <strong>{tickets.length === 0 ? 'No tickets yet' : 'Nothing matches'}</strong>
                <span>
                  {tickets.length === 0
                    ? 'When a customer asks for a change on WhatsApp, it shows up here.'
                    : 'Try a different filter or search.'}
                </span>
              </div>
            )}
            {visible.map(t => (
              <TicketRow key={t.id} ticket={t} selected={t.id === selectedId} onSelect={setSelectedId} />
            ))}
          </div>
        </aside>

        <main className="tk-detail-pane">
          {selected ? (
            <TicketDetail
              ticket={selected}
              onBack={() => setSelectedId(null)}
              onChanged={() => load()}
              onToast={setToast}
            />
          ) : (
            <div className="tk-placeholder">
              <div className="tk-empty-icon" aria-hidden="true">🎫</div>
              <strong>Select a ticket</strong>
              <span>Pick one from the list to review the request and decide.</span>
            </div>
          )}
        </main>
      </div>

      {toast && <div className="tk-toast" role="status">{toast}</div>}
    </div>
  )
}
