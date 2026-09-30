import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE } from '../config'
import './Inbox.css'

const API = API_BASE

const STATUS = {
  received:  { label: 'received',  hint: 'From the customer or courier' },
  recorded:  { label: 'recorded',  hint: 'Stored, not delivered (sandbox)' },
  queued:    { label: 'queued',    hint: 'Waiting to go out' },
  sent:      { label: 'sent',      hint: 'WhatsApp accepted it — not yet confirmed delivered' },
  delivered: { label: 'delivered', hint: 'Confirmed on their phone' },
  read:      { label: 'read',      hint: 'They opened it' },
  blocked:   { label: 'blocked',   hint: 'Held back by the allowlist' },
  failed:    { label: 'failed',    hint: 'WhatsApp refused it' },
}

/**
 * A claim/return attachment — fetched on demand rather than eagerly, since
 * a thread can hold several and most are never opened. `fetch` already
 * carries the X-API-Key header (installApiKeyInterceptor patches it app-
 * wide), so a plain `<img src>`/`<a href>` to the media endpoint would not
 * authenticate; this fetches the bytes itself and hands the bubble an
 * object URL instead.
 */
function MediaAttachment({ messageId, mediaType, error }) {
  const [url, setUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/agent/inbound/${messageId}/media`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      setUrl(URL.createObjectURL(blob))
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return <div className="bubble-attachment failed">📎 Attachment failed to save: {error}</div>
  }

  if (url) {
    if (mediaType === 'image') return <img className="bubble-media" src={url} alt="attachment" />
    if (mediaType === 'video') return <video className="bubble-media" src={url} controls />
    return <a className="bubble-attachment" href={url} download>📎 Download document</a>
  }

  return (
    <button className="bubble-attachment" onClick={load} disabled={loading}>
      {loading ? 'Loading…' : failed ? '⚠️ Could not load — retry' : `📎 View ${mediaType || 'attachment'}`}
    </button>
  )
}

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

function clockTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function Inbox() {
  const [threads, setThreads] = useState([])
  const [meta, setMeta] = useState({})
  const [selectedId, setSelectedId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/agent/threads?limit=200`)
      if (!res.ok) throw new Error(`Could not load conversations (${res.status})`)
      const data = await res.json()
      setThreads(data.threads || [])
      setMeta({ mode: data.mode, redirectTo: data.redirect_to, autoReply: data.auto_reply })
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => { load().finally(() => setLoading(false)) }, [load])

  const key = (t) => (t.order_id == null ? 'unmatched' : String(t.order_id))

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return threads.filter((t) => {
      if (filter === 'unanswered' && !t.unanswered) return false
      if (filter === 'failed' && !t.failed) return false
      if (!q) return true
      return [t.customer_name, t.courier, String(t.order_id || ''),
              ...t.messages.map((m) => m.text)]
        .some((f) => (f || '').toLowerCase().includes(q))
    })
  }, [threads, filter, search])

  const selected = useMemo(
    () => visible.find((t) => key(t) === selectedId) || visible[0] || null,
    [visible, selectedId],
  )

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [selected])

  const totals = useMemo(() => ({
    unanswered: threads.reduce((n, t) => n + t.unanswered, 0),
    failed: threads.reduce((n, t) => n + t.failed, 0),
  }), [threads])

  const sendReply = async () => {
    if (!selected?.order_id || !draft.trim()) return
    setSending(true)
    try {
      const res = await fetch(`${API}/api/agent/threads/${selected.order_id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: draft.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Failed (${res.status})`)
      setDraft('')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="inbox-page"><div className="inbox-loading">Loading conversations…</div></div>

  return (
    <div className="inbox-page">
      <header className="inbox-header">
        <Link to="/agents" className="inbox-back">← Agents</Link>
        <div className="inbox-title">
          <h1>💬 Inbox</h1>
          <p>WhatsApp conversations, one per order</p>
        </div>
        <button className="inbox-refresh" onClick={load}>↻ Refresh</button>
      </header>

      <div className="inbox-banners">
        <div className={`inbox-flag ${meta.mode === 'live' ? 'live' : 'sandbox'}`}>
          <strong>{meta.mode === 'live' ? 'LIVE' : 'SANDBOX'}</strong>
          {meta.redirectTo
            ? <span>Every customer message is diverted to {meta.redirectTo}. No customer is being reached.</span>
            : meta.mode === 'live'
              ? <span>Messages go to the real recipient.</span>
              : <span>Messages are recorded, never delivered.</span>}
        </div>
        {/* Whether the agent answers on its own is the thing that decides
            how closely a person has to watch this page. */}
        <div className={`inbox-flag ${meta.autoReply ? 'auto-on' : 'auto-off'}`}>
          <strong>{meta.autoReply ? 'AUTO-REPLY ON' : 'AUTO-REPLY OFF'}</strong>
          <span>{meta.autoReply
            ? 'The agent answers replies by itself.'
            : 'Replies wait for someone to answer them here.'}</span>
        </div>
      </div>

      {error && <div className="inbox-error">{error}</div>}

      <div className="inbox-body">
        <aside className="inbox-list">
          <input
            className="inbox-search"
            placeholder="Search order, name or text…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="inbox-filters">
            {[['all', `All ${threads.length}`],
              ['unanswered', `Unanswered ${totals.unanswered}`],
              ['failed', `Failed ${totals.failed}`]].map(([id, label]) => (
              <button
                key={id}
                className={`inbox-filter ${filter === id ? 'active' : ''} ${id}`}
                onClick={() => setFilter(id)}
              >{label}</button>
            ))}
          </div>

          {visible.length === 0 ? (
            <div className="inbox-empty">Nothing here.</div>
          ) : visible.map((t) => {
            const last = t.messages[t.messages.length - 1]
            return (
              <button
                key={key(t)}
                className={`inbox-item ${selected && key(selected) === key(t) ? 'active' : ''}`}
                onClick={() => setSelectedId(key(t))}
              >
                <div className="inbox-item-top">
                  <span className="inbox-item-order">
                    {t.order_id ? `#${t.order_id}` : 'No order'}
                  </span>
                  <span className="inbox-item-time">{timeAgo(t.last_activity)}</span>
                </div>
                <div className="inbox-item-name">{t.customer_name || 'Unknown'}</div>
                <div className="inbox-item-preview">{last?.text}</div>
                <div className="inbox-item-tags">
                  {t.courier && <span className="inbox-tag courier">{t.courier}</span>}
                  {t.unanswered > 0 && <span className="inbox-tag unanswered">{t.unanswered} unanswered</span>}
                  {t.failed > 0 && <span className="inbox-tag failed">{t.failed} failed</span>}
                </div>
              </button>
            )
          })}
        </aside>

        <section className="inbox-thread">
          {!selected ? (
            <div className="inbox-empty">Pick a conversation.</div>
          ) : (
            <>
              <div className="inbox-thread-head">
                <div>
                  <h2>{selected.customer_name || 'Unknown customer'}</h2>
                  <span>
                    {selected.order_id ? `Order #${selected.order_id}` : 'No matching order'}
                    {selected.customer_address && ` · ${selected.customer_address}`}
                    {selected.courier && ` · ${selected.courier}`}
                  </span>
                </div>
              </div>

              <div className="inbox-messages">
                {selected.messages.map((m, i) => (
                  <div key={`${m.id}-${i}`} className={`bubble-row ${m.direction} ${m.party}`}>
                    <div className={`bubble ${m.direction} ${m.party}`}>
                      {m.party === 'courier' && (
                        <div className="bubble-who">{m.who} · courier</div>
                      )}
                      <div className="bubble-text">{m.text}</div>
                      {(m.has_media || m.media_error) && (
                        <MediaAttachment messageId={m.id} mediaType={m.media_type}
                                        error={m.media_error} />
                      )}
                      <div className="bubble-meta">
                        <span>{clockTime(m.at)}</span>
                        <span className={`bubble-status ${m.status}`}
                              title={STATUS[m.status]?.hint || ''}>
                          {STATUS[m.status]?.label || m.status}
                        </span>
                        {m.redirected_to && <span className="bubble-redirect">→ {m.redirected_to}</span>}
                        {m.auto_reply && <span className="bubble-auto">agent answered</span>}
                      </div>
                      {m.error && <div className="bubble-error">{m.error}</div>}
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              {selected.order_id ? (
                <div className="inbox-composer">
                  <textarea
                    placeholder="Write a reply to the customer…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply()
                    }}
                    rows={2}
                  />
                  <button onClick={sendReply} disabled={sending || !draft.trim()}>
                    {sending ? 'Sending…' : 'Send'}
                  </button>
                </div>
              ) : (
                <div className="inbox-composer disabled">
                  This message matches no order, so there is no customer to reply to.
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
