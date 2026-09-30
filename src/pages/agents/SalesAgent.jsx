import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE, SALES_AGENT_WS_URL, getApiKey } from '../../config'
import MarkdownText from '../../components/MarkdownText'
import './OrioAgent.css'

/**
 * Sales Agent's own page — a separate product from the OMS agent
 * (OrioAgent.jsx), talking to its own socket (/ws/sales-agent) and its own
 * tool set (agent/sales_tools.py: leads and quotes, not orders/shipments).
 *
 * Deliberately a smaller, self-contained component rather than a mode flag
 * on OrioAgent: that component is 2000+ lines of OMS-specific machinery
 * (department routing, customer verification, chain-of-steps UI) most of
 * which the Sales Agent has no use for. It DOES need its own approval
 * queue — generate_quote reaches a real prospect, gated the same way
 * OMS's send_message is — but that's a small, self-contained piece here
 * (QuoteApprovalCard below) rather than importing OrioAgent's much larger
 * ApprovalCard, which is shaped around OMS order-change previews. Both
 * call the same generic REST endpoints (/api/agent/action-log/{id}/
 * approve|reject) — the backend's approval queue (agent/action_log.py) is
 * genuinely shared platform infra, not duplicated.
 */

const STATUS_LABELS = {
  new: 'New', contacted: 'Contacted', qualified: 'Qualified',
  quoted: 'Quoted', won: 'Won', lost: 'Lost',
}

function ThinkingStep({ message, status }) {
  return (
    <div className={`thinking-step ${status}`}>
      <div className="thinking-icon">
        {status === 'active' ? <span className="thinking-spinner" /> : '✓'}
      </div>
      <span className="thinking-text">{message}</span>
    </div>
  )
}

function LeadCard({ lead }) {
  if (!lead) return null
  return (
    <div className="detail-content">
      <div className="detail-stat-row">
        <div className="detail-stat">Lead <strong>#{lead.id}</strong></div>
        <div className="detail-stat">Status: <strong className={lead.status === 'won' ? 'is-good' : lead.status === 'lost' ? 'is-bad' : ''}>{STATUS_LABELS[lead.status] || lead.status}</strong></div>
      </div>
      <div className="detail-info-grid">
        <div><span className="detail-label">Name:</span> {lead.name}</div>
        {lead.company && <div><span className="detail-label">Company:</span> {lead.company}</div>}
        {lead.phone && <div><span className="detail-label">Phone:</span> {lead.phone}</div>}
        {lead.email && <div><span className="detail-label">Email:</span> {lead.email}</div>}
        <div><span className="detail-label">Source:</span> {lead.source}</div>
        {lead.expected_volume != null && <div><span className="detail-label">Expected Volume:</span> {lead.expected_volume}/month</div>}
      </div>
      {lead.notes && (
        <div className="detail-chips-section">
          <span className="detail-label">Notes:</span>
          <div className="detail-items-text" style={{ whiteSpace: 'pre-line' }}>{lead.notes}</div>
        </div>
      )}
    </div>
  )
}

function LeadsListDetail({ data }) {
  const leads = data.leads || []
  return (
    <div className="detail-content">
      <div className="detail-stat-row">
        <div className="detail-stat"><strong>{data.found}</strong> leads found</div>
      </div>
      {leads.length > 0 && (
        <table className="detail-table">
          <thead>
            <tr><th>ID</th><th>Name</th><th>Company</th><th>Phone</th><th>Status</th><th>Expected Vol.</th></tr>
          </thead>
          <tbody>
            {leads.map(l => (
              <tr key={l.id}>
                <td>#{l.id}</td><td>{l.name}</td><td>{l.company || '—'}</td>
                <td>{l.phone || '—'}</td>
                <td><span className="mini-badge">{STATUS_LABELS[l.status] || l.status}</span></td>
                <td>{l.expected_volume ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function PlanRecommendationDetail({ data }) {
  if (data.error) return <div className="detail-content"><p>{data.error}</p></div>
  return (
    <div className="detail-content">
      <div className="report-stats">
        <div className="report-stat">
          <span className="report-stat-value">{data.recommended_plan?.toUpperCase()}</span>
          <span className="report-stat-label">Recommended Plan</span>
        </div>
        <div className="report-stat">
          <span className="report-stat-value">{data.expected_volume}</span>
          <span className="report-stat-label">Expected Volume/month</span>
        </div>
      </div>
      <p>{data.reasoning}</p>
      {data.benchmark?.length > 0 && (
        <table className="detail-table">
          <thead><tr><th>Plan</th><th className="num">Accounts</th><th className="num">Avg Volume</th></tr></thead>
          <tbody>
            {data.benchmark.map(b => (
              <tr key={b.plan}>
                <td>{b.plan}</td><td className="num">{b.account_count}</td>
                <td className="num">{b.avg_order_volume ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function QuoteDetail({ data }) {
  if (data.error) return <div className="detail-content"><p>{data.error}</p></div>
  const q = data.quote || {}
  return (
    <div className="detail-content">
      <div className="detail-stat-row">
        <div className="detail-stat">Plan: <strong>{q.plan}</strong></div>
        <div className="detail-stat">Rate: <strong>Rs. {q.pricing}{q.pricing_per !== 'none' ? `/${q.pricing_per}` : ''}</strong></div>
      </div>
      <div className="detail-items-text">{data.message}</div>
    </div>
  )
}

const TOOL_LABELS = {
  create_lead: '👤 Create Lead', list_leads: '📋 List Leads',
  update_lead: '✏️ Update Lead', recommend_plan: '💡 Recommend Plan',
  generate_quote: '🧾 Generate Quote',
}

/**
 * Approve/reject buttons for one pending action — the same REST calls
 * OrioAgent.jsx's ActionButtons makes, kept as its own small copy here
 * rather than imported: that component also carries OMS-only note/retry
 * UI this page has no use for.
 */
function QuoteActionButtons({ actionId, actionStatus, onAction }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (actionStatus === 'approved') {
    return <div className="action-status approved">✓ Sent for approval — quote sent</div>
  }
  if (actionStatus === 'rejected') {
    return <div className="action-status rejected">✕ Rejected — nothing was sent</div>
  }

  const handle = async (type) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/agent/action-log/${actionId}/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) onAction(actionId, type, data)
      else setError(data.error || 'Could not complete that.')
    } catch {
      setError('Could not reach the server.')
    }
    setLoading(false)
  }

  return (
    <div className="action-buttons">
      {error && <div className="action-error">{error}</div>}
      <div className="action-btn-row">
        <button className="action-btn approve" onClick={() => handle('approve')} disabled={loading}>
          {loading ? 'Working…' : '✓ Send Quote'}
        </button>
        <button className="action-btn reject" onClick={() => handle('reject')} disabled={loading}>
          ✕ Reject
        </button>
      </div>
    </div>
  )
}

function QuoteApprovalCard({ preview, actionId, actionStatus, onAction }) {
  return (
    <div className="approval-card risk-send">
      <div className="approval-head">
        <span className="approval-risk">Sends a WhatsApp quote</span>
      </div>
      <div className="approval-message">
        <div className="approval-message-to">
          <span className="approval-message-channel">💬 WhatsApp</span>
          <span>to <strong>{preview.lead_name}</strong> ({preview.recipient_address})</span>
        </div>
        <div className="approval-message-body">{preview.message}</div>
      </div>
      <div className="detail-stat-row">
        <div className="detail-stat">Plan: <strong>{preview.plan}</strong></div>
        <div className="detail-stat">Rate: <strong>Rs. {preview.pricing}{preview.pricing_per !== 'none' ? `/${preview.pricing_per}` : ''}</strong></div>
      </div>
      {!actionStatus && <div className="approval-notice">Nothing has been sent yet.</div>}
      <QuoteActionButtons actionId={actionId} actionStatus={actionStatus} onAction={onAction} />
    </div>
  )
}

function ToolResult({ tool, result, actionable, actionId, actionStatus, onAction }) {
  if (!result) return null
  if (actionable && tool === 'generate_quote') {
    return <QuoteApprovalCard preview={result} actionId={actionId} actionStatus={actionStatus} onAction={onAction} />
  }
  if (tool === 'create_lead' || tool === 'update_lead') return <LeadCard lead={result.lead} />
  if (tool === 'list_leads') return <LeadsListDetail data={result} />
  if (tool === 'recommend_plan') return <PlanRecommendationDetail data={result} />
  if (tool === 'generate_quote') return <QuoteDetail data={result} />
  return null
}

function ToolCard({ tool, params, result, actionable, actionId, actionStatus, onAction }) {
  const [expanded, setExpanded] = useState(true)
  return (
    <div className="tool-card">
      <div className="tool-card-header" onClick={() => setExpanded(e => !e)}>
        <div className="tool-card-title">
          <span className="tool-name">{TOOL_LABELS[tool] || tool}</span>
          {params && Object.keys(params).length > 0 && (
            <div className="tool-params">
              {Object.entries(params).map(([k, v]) => (
                <span key={k} className="tool-param-chip">{k}: {String(v)}</span>
              ))}
            </div>
          )}
        </div>
        <span className={`tool-expand-icon ${expanded ? 'open' : ''}`}>▶</span>
      </div>
      {expanded && result && (
        <div className="tool-card-detail">
          <ToolResult tool={tool} result={result} actionable={actionable}
                     actionId={actionId} actionStatus={actionStatus} onAction={onAction} />
        </div>
      )}
    </div>
  )
}

const TASK_STATUS_LABELS = {
  active: 'Active', pending_confirmation: 'Needs Confirmation',
  resolved: 'Resolved', paused: 'Paused',
}
const TASK_FILTERS = ['', 'active', 'pending_confirmation', 'resolved', 'paused']

async function apiCall(path, options) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' }, ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`)
  return data
}

function NewTaskForm({ onCreated, onCancel }) {
  const [targetType, setTargetType] = useState('courier')
  const [targetName, setTargetName] = useState('')
  const [goal, setGoal] = useState('')
  const [frequency, setFrequency] = useState('daily')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const submit = async () => {
    if (!targetName.trim() || !goal.trim()) return
    setSaving(true); setError(null)
    try {
      const data = await apiCall('/api/sales/tasks', {
        method: 'POST',
        body: JSON.stringify({ target_type: targetType, target_name: targetName.trim(),
                              goal: goal.trim(), frequency }),
      })
      onCreated(data.task)
    } catch (e) {
      setError(e.message)
    }
    setSaving(false)
  }

  return (
    <div className="tool-card-detail" style={{ marginBottom: 16 }}>
      <div className="detail-content">
        <div className="detail-info-grid">
          <div>
            <span className="detail-label">Target type</span><br />
            <select className="orio-input" style={{ width: '100%' }}
                   value={targetType} onChange={e => setTargetType(e.target.value)}>
              <option value="courier">Courier</option>
              <option value="lead">Lead</option>
            </select>
          </div>
          <div>
            <span className="detail-label">Frequency</span><br />
            <select className="orio-input" style={{ width: '100%' }}
                   value={frequency} onChange={e => setFrequency(e.target.value)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <span className="detail-label">{targetType === 'courier' ? 'Courier name (must have a WhatsApp contact configured)' : 'Lead ID or phone number'}</span>
          <input className="orio-input" style={{ width: '100%', marginTop: 4 }}
                value={targetName} onChange={e => setTargetName(e.target.value)}
                placeholder={targetType === 'courier' ? 'e.g. PostEx' : 'e.g. 923001234567'} />
        </div>
        <div style={{ marginTop: 10 }}>
          <span className="detail-label">Goal — what should be followed up on</span>
          <textarea className="orio-input" style={{ width: '100%', marginTop: 4, minHeight: 60 }}
                   value={goal} onChange={e => setGoal(e.target.value)}
                   placeholder="e.g. Last week's COD payment of Rs. 45,000 is still pending, follow up until it clears." />
        </div>
        {error && <div className="action-error" style={{ marginTop: 8 }}>{error}</div>}
        <div className="action-btn-row" style={{ marginTop: 10 }}>
          <button className="action-btn approve" onClick={submit} disabled={saving || !targetName.trim() || !goal.trim()}>
            {saving ? 'Creating…' : '✓ Create Task'}
          </button>
          <button className="action-btn reject" onClick={onCancel} disabled={saving}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

const EVENT_KIND_LABELS = {
  run: '📤 Sent', reply: '💬 Reply', ack: '↩️ We replied',
  flagged: '🚩 Flagged as possibly resolved', resolved: '✅ Resolved', reactivated: '↺ Reactivated',
}

function TaskActivity({ taskId }) {
  const [events, setEvents] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    apiCall(`/api/sales/tasks/${taskId}`)
      .then(data => { if (!cancelled) setEvents(data.events || []) })
      .catch(e => { if (!cancelled) setError(e.message) })
    return () => { cancelled = true }
  }, [taskId])

  if (error) return <div className="action-error" style={{ marginTop: 8 }}>{error}</div>
  if (events === null) return <p style={{ opacity: 0.7, marginTop: 8 }}>Loading activity…</p>
  if (events.length === 0) return <p style={{ opacity: 0.7, marginTop: 8 }}>Koi activity nahi hui abhi.</p>

  return (
    <div className="detail-items-text" style={{ marginTop: 8 }}>
      {events.map(e => (
        <div key={e.id} style={{ padding: '6px 0', borderTop: '1px solid var(--border, #e5e5e5)' }}>
          <div style={{ fontWeight: 600, fontSize: '0.85em' }}>
            {EVENT_KIND_LABELS[e.kind] || e.kind}
            <span style={{ fontWeight: 400, opacity: 0.6, marginLeft: 8 }}>{e.created_at?.slice(0, 16).replace('T', ' ')}</span>
          </div>
          {e.body && <div style={{ fontSize: '0.9em', opacity: 0.85 }}>{e.body}</div>}
        </div>
      ))}
    </div>
  )
}

function TaskCard({ task, onChanged }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [runResult, setRunResult] = useState(null)
  const [showResolveNote, setShowResolveNote] = useState(false)
  const [resolveNote, setResolveNote] = useState('')
  const [showActivity, setShowActivity] = useState(false)

  const act = async (path, body) => {
    setBusy(true); setError(null); setRunResult(null)
    try {
      const data = await apiCall(`/api/sales/tasks/${task.id}${path}`, {
        method: 'POST', body: JSON.stringify(body || {}),
      })
      if (path === '/run-now') setRunResult(data.result)
      else onChanged()
    } catch (e) {
      setError(e.message)
    }
    setBusy(false)
  }

  // An inline input, not window.prompt() — a native dialog is unreliable
  // across browser/automation contexts (some environments block or can
  // never dismiss it) and looks out of place next to the rest of this
  // panel's own inputs.
  const confirmResolve = () => {
    act('/resolve', { note: resolveNote })
    setShowResolveNote(false)
    setResolveNote('')
  }

  return (
    <div className="ca-card">
      <div className="ca-card-head">
        <div className="ca-card-title">{task.target_type === 'courier' ? '🚚' : '👤'} {task.title}</div>
        <span className={`ca-badge ${task.status === 'active' ? 'ca-badge-gold' : task.status === 'pending_confirmation' ? 'ca-badge-amber' : ''}`}>
          {TASK_STATUS_LABELS[task.status] || task.status}
        </span>
      </div>
      <span className="ca-service-chip">{task.target_name} · {task.target_contact} · {task.frequency}</span>
      <div className="detail-items-text" style={{ margin: '8px 0' }}>{task.goal}</div>
      <div className="detail-info-grid">
        <div><span className="detail-label">Next run:</span> {task.next_run_at}</div>
        <div><span className="detail-label">Runs so far:</span> {task.run_count}</div>
      </div>
      {task.status === 'pending_confirmation' && task.last_reply && (
        <div className="detail-note" style={{ marginTop: 8 }}>
          Reply received: "{task.last_reply}" — confirm below if this actually resolves it.
        </div>
      )}
      {runResult && (
        <div className="detail-note" style={{ marginTop: 8 }}>
          Test run: {runResult.status}{runResult.message ? ` — "${runResult.message}"` : ''}
        </div>
      )}
      {error && <div className="action-error" style={{ marginTop: 8 }}>{error}</div>}
      {showResolveNote && (
        <input
          className="action-note-input"
          style={{ marginTop: 8 }}
          placeholder="Resolve note (optional)..."
          value={resolveNote}
          onChange={e => setResolveNote(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') confirmResolve() }}
          autoFocus
        />
      )}
      <div className="action-btn-row" style={{ marginTop: 10 }}>
        <button className="action-btn note-toggle" onClick={() => setShowActivity(s => !s)}>
          {showActivity ? '▲ Hide Activity' : '▼ Show Activity'}
        </button>
        {task.status === 'active' && (
          <button className="action-btn note-toggle" onClick={() => act('/run-now')} disabled={busy}>
            ▶ Run Now (test)
          </button>
        )}
        {task.status === 'pending_confirmation' && (
          <button className="action-btn note-toggle" onClick={() => act('/reactivate')} disabled={busy}>
            ↺ Not Resolved, Keep Going
          </button>
        )}
        {task.status !== 'resolved' && !showResolveNote && (
          <button className="action-btn approve" onClick={() => setShowResolveNote(true)} disabled={busy}>
            ✓ Resolve
          </button>
        )}
        {showResolveNote && (
          <>
            <button className="action-btn approve" onClick={confirmResolve} disabled={busy}>
              {busy ? 'Working…' : '✓ Confirm Resolve'}
            </button>
            <button className="action-btn reject" onClick={() => setShowResolveNote(false)} disabled={busy}>
              Cancel
            </button>
          </>
        )}
      </div>
      {showActivity && <TaskActivity taskId={task.id} />}
    </div>
  )
}

function TasksPanel() {
  const [tasks, setTasks] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const data = await apiCall(`/api/sales/tasks${filter ? `?status=${filter}` : ''}`)
      setTasks(data.tasks || [])
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  return (
    <div className="orio-chat-area" style={{ padding: 16 }}>
      <div className="tool-params" style={{ marginBottom: 12 }}>
        {TASK_FILTERS.map(f => (
          <span key={f || 'all'}
               className="tool-param-chip"
               style={{ cursor: 'pointer', ...(filter === f ? { background: 'var(--accent, #1976d2)', color: '#fff' } : {}) }}
               onClick={() => setFilter(f)}>
            {f ? TASK_STATUS_LABELS[f] : 'All'}
          </span>
        ))}
      </div>

      {!showForm && (
        <button className="action-btn approve" onClick={() => setShowForm(true)} style={{ marginBottom: 12 }}>
          + New Follow-up Task
        </button>
      )}
      {showForm && (
        <NewTaskForm
          onCreated={() => { setShowForm(false); load() }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading && <p style={{ opacity: 0.7 }}>Loading…</p>}
      {error && <div className="action-error">{error}</div>}
      {!loading && tasks.length === 0 && (
        <div className="orio-empty-state">
          <div className="orio-empty-icon">📅</div>
          <p>Koi task nahi mila{filter ? ` (${TASK_STATUS_LABELS[filter]})` : ''}.</p>
        </div>
      )}
      <div className="ca-card-list">
        {tasks.map(t => <TaskCard key={t.id} task={t} onChanged={load} />)}
      </div>
    </div>
  )
}

export default function SalesAgent() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [thinkingSteps, setThinkingSteps] = useState([])
  const [currentTools, setCurrentTools] = useState([])
  const [streamingText, setStreamingText] = useState('')
  const [connected, setConnected] = useState(false)
  const [view, setView] = useState('chat')
  const [actionStatuses, setActionStatuses] = useState({})

  const wsRef = useRef(null)
  const conversationRef = useRef(null)
  const thinkingStepsRef = useRef([])
  const currentToolsRef = useRef([])
  const messagesEndRef = useRef(null)

  const connectWS = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return wsRef.current
    const ws = new WebSocket(SALES_AGENT_WS_URL)

    ws.addEventListener('open', () => {
      const key = getApiKey()
      ws.send(JSON.stringify({ auth: key, conversation_id: conversationRef.current }))
    }, { once: true })
    wsRef.current = ws

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      switch (data.type) {
        case 'authenticated':
          setConnected(true)
          if (data.conversation_id) conversationRef.current = data.conversation_id
          break
        case 'conversation_started':
          conversationRef.current = data.conversation_id
          break
        case 'thinking':
          setThinkingSteps(prev => {
            const next = [...prev.map(s => ({ ...s, status: 'done' })),
                          { message: data.message, status: 'active' }]
            thinkingStepsRef.current = next
            return next
          })
          break
        case 'tool_call':
          setCurrentTools(prev => {
            const next = [...prev, { tool: data.tool, params: data.params, result: null }]
            currentToolsRef.current = next
            return next
          })
          break
        case 'tool_result':
          setCurrentTools(prev => {
            const next = prev.map(t => t.tool === data.tool && !t.result
              ? {
                  ...t, result: data.full_result || data.result,
                  actionable: data.actionable || false, actionId: data.action_id || null,
                }
              : t)
            currentToolsRef.current = next
            return next
          })
          break
        case 'stream':
          setStreamingText(prev => prev + data.token)
          break
        case 'response': {
          setStreamingText('')
          const finishedTools = currentToolsRef.current
          setMessages(prev => [...prev, {
            role: 'agent', content: data.message, tools: finishedTools,
            timestamp: new Date(),
          }])
          setCurrentTools([]); currentToolsRef.current = []
          setThinkingSteps([]); thinkingStepsRef.current = []
          setIsProcessing(false)
          break
        }
        case 'error':
          setMessages(prev => [...prev, {
            role: 'agent', content: `Error: ${data.message}`, isError: true, timestamp: new Date(),
          }])
          setThinkingSteps([]); setCurrentTools([])
          setIsProcessing(false)
          break
        default:
          break
      }
    }

    ws.onclose = () => { setConnected(false) }
    return ws
  }

  // Connecting eagerly on mount — and closing on unmount — is exactly what
  // breaks under StrictMode's dev double-invoke: mount, cleanup (closes the
  // socket while it's still connecting), mount again, leaving no working
  // connection ("WebSocket is closed before the connection is established").
  // OrioAgent.jsx never has this problem because it never does this: it
  // opens the socket lazily, from send(), on first use. Matching that here
  // instead of trying to out-guard StrictMode's remount.
  useEffect(() => {
    return () => { wsRef.current?.close() }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText, thinkingSteps])

  const handleActionUpdate = (actionId, type, outcome) => {
    setActionStatuses(prev => ({ ...prev, [actionId]: type === 'approve' ? 'approved' : 'rejected' }))
  }

  const send = () => {
    const text = input.trim()
    if (!text || isProcessing) return
    const ws = connectWS()
    setMessages(prev => [...prev, { role: 'user', content: text, timestamp: new Date() }])
    setInput('')
    setIsProcessing(true)
    const doSend = () => ws.send(JSON.stringify({ prompt: text }))
    if (ws.readyState === WebSocket.OPEN) doSend()
    else ws.addEventListener('open', doSend, { once: true })
  }

  return (
    <div className="orio-agent-shell">
    <div className="orio-agent">
      <div className="orio-agent-header">
        <div className="orio-agent-back">
          <Link to="/agents" className="back-link">← Agents</Link>
          <div>
            <h1>✨ Sales Agent</h1>
            <p>{connected ? 'Online' : 'Connecting...'} — leads and quotes</p>
          </div>
        </div>
        <div className="tool-params">
          <span className="tool-param-chip" style={{ cursor: 'pointer', ...(view === 'chat' ? { background: 'var(--accent, #1976d2)', color: '#fff' } : {}) }}
               onClick={() => setView('chat')}>💬 Chat</span>
          <span className="tool-param-chip" style={{ cursor: 'pointer', ...(view === 'tasks' ? { background: 'var(--accent, #1976d2)', color: '#fff' } : {}) }}
               onClick={() => setView('tasks')}>📅 Tasks</span>
        </div>
      </div>

      {view === 'tasks' ? <TasksPanel /> : (
      <>
      <div className="orio-chat-area">
        {messages.length === 0 && (
          <div className="orio-empty-state">
            <div className="orio-empty-icon">✨</div>
            <p>Naya lead add karein, leads dikhayein, plan recommend karwayein, ya quote bhejwayein.</p>
            <p style={{ opacity: 0.7, fontSize: 13 }}>"naya lead add karo: Ahmed, phone 0300..., expected 500 orders/month" jaisay type karein.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`orio-message ${m.role} ${m.isError ? 'error' : ''}`}>
            <div className="orio-message-avatar">{m.role === 'user' ? '🧑' : '✨'}</div>
            <div className="orio-message-content">
              <div className="orio-message-text">
                {m.isError ? m.content : <MarkdownText>{m.content}</MarkdownText>}
              </div>
              {m.tools?.map((t, j) => (
                <ToolCard key={j} tool={t.tool} params={t.params} result={t.result}
                         actionable={t.actionable} actionId={t.actionId}
                         actionStatus={actionStatuses[t.actionId]} onAction={handleActionUpdate} />
              ))}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="orio-message agent processing">
            <div className="orio-message-avatar">✨</div>
            <div className="orio-message-content">
              {thinkingSteps.map((s, i) => <ThinkingStep key={i} message={s.message} status={s.status} />)}
              {currentTools.map((t, i) => (
                <ToolCard key={i} tool={t.tool} params={t.params} result={t.result}
                         actionable={t.actionable} actionId={t.actionId}
                         actionStatus={actionStatuses[t.actionId]} onAction={handleActionUpdate} />
              ))}
              {streamingText && <div className="orio-message-text"><MarkdownText>{streamingText}</MarkdownText></div>}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="orio-input-area">
        <div className="orio-input-wrapper">
          <textarea
            className="orio-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Type your message..."
            rows={1}
            disabled={isProcessing}
          />
          <button className="orio-send-btn" onClick={send} disabled={isProcessing || !input.trim()}>
            {isProcessing ? '⏳' : '➤'}
          </button>
        </div>
      </div>
      </>
      )}
    </div>
    </div>
  )
}
