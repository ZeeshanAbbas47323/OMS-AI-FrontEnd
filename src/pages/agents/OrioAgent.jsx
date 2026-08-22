import { useState, useRef, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { Link } from 'react-router-dom'
import './OrioAgent.css'

const WS_URL = 'ws://localhost:8001/ws/agent'

function ThinkingStep({ step, message, status }) {
  return (
    <div className={`thinking-step ${status}`}>
      <div className="thinking-icon">
        {status === 'active' ? <span className="thinking-spinner" /> : '✓'}
      </div>
      <span className="thinking-text">{message}</span>
    </div>
  )
}

function ChainProgress({ plan, currentStep, total }) {
  if (!plan || plan.length === 0) return null
  return (
    <div className="chain-progress">
      <div className="chain-progress-header">
        <span className="chain-progress-label">🔗 Chain Progress</span>
        <span className="chain-progress-count">{currentStep} / {total}</span>
      </div>
      <div className="chain-progress-bar">
        <div className="chain-progress-fill" style={{ width: `${(currentStep / total) * 100}%` }} />
      </div>
      <div className="chain-steps-list">
        {plan.map((step, i) => (
          <div key={i} className={`chain-step-item ${i < currentStep ? 'done' : i === currentStep ? 'active' : 'pending'}`}>
            <span className="chain-step-indicator">
              {i < currentStep ? '✓' : i === currentStep ? <span className="thinking-spinner" /> : (i + 1)}
            </span>
            <span className="chain-step-text">{step}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChainSummary({ summary, tools }) {
  if (!summary || !summary.plan) return null
  return (
    <div className="chain-summary-card">
      <div className="chain-summary-header">
        <span className="chain-summary-icon">🔗</span>
        <span className="chain-summary-title">Chain Complete</span>
        <span className="chain-summary-badge">{summary.completed} steps</span>
      </div>
      <div className="chain-summary-steps">
        {summary.plan.map((step, i) => {
          const tool = tools?.[i]
          return (
            <div key={i} className="chain-summary-step">
              <span className="chain-summary-check">✓</span>
              <span className="chain-summary-text">{step}</span>
              {tool && <span className="chain-summary-tool">{tool.tool}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function HandoffCard({ handoffId, reason }) {
  return (
    <div className="handoff-card">
      <div className="handoff-card-icon">🙋</div>
      <div className="handoff-card-content">
        <div className="handoff-card-title">Transferred to Human Agent</div>
        <div className="handoff-card-reason">{reason}</div>
        <div className="handoff-card-id">Ticket: {handoffId}</div>
      </div>
    </div>
  )
}

function WebSearchBadge({ webSources }) {
  if (!webSources || webSources.length === 0) return null
  return (
    <div className="web-search-badge">
      <span className="web-search-badge-icon">🌐</span>
      <span className="web-search-badge-text">Answered from web search</span>
      <div className="web-search-sources">
        {webSources.map((s, i) => (
          <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="web-source-link">
            {s.title}
          </a>
        ))}
      </div>
    </div>
  )
}

function LearnedBadge({ learnedFrom }) {
  if (!learnedFrom) return null
  return (
    <div className="learned-badge">
      <span className="learned-badge-icon">🧠</span>
      <span className="learned-badge-text">
        Answered from knowledge base (confidence: {Math.round(learnedFrom.match_score * 100)}%)
      </span>
    </div>
  )
}

function AgentBadge({ assignedAgent }) {
  if (!assignedAgent) return null
  return (
    <div className="agent-badge">
      <span className="agent-badge-avatar">{assignedAgent.avatar || '👤'}</span>
      <span className="agent-badge-text">
        Answered by <strong>{assignedAgent.name}</strong>
      </span>
      <span className="agent-badge-dept">
        {assignedAgent.department_icon} {assignedAgent.department}
      </span>
    </div>
  )
}

function ActionButtons({ actionId, actionStatus, onAction }) {
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [loading, setLoading] = useState(false)

  if (actionStatus === 'approved') {
    return <div className="action-status approved">✓ Approved</div>
  }
  if (actionStatus === 'rejected') {
    return <div className="action-status rejected">✕ Rejected</div>
  }

  const handleAction = async (type) => {
    setLoading(true)
    try {
      const res = await fetch(`http://localhost:8001/api/agent/action-log/${actionId}/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      })
      if (res.ok) {
        onAction(actionId, type)
      }
    } catch (e) {
      console.error('Action failed:', e)
    }
    setLoading(false)
  }

  return (
    <div className="action-buttons">
      {showNote && (
        <input
          className="action-note-input"
          placeholder="Add a note (optional)..."
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      )}
      <div className="action-btn-row">
        <button
          className="action-btn approve"
          onClick={() => handleAction('approve')}
          disabled={loading}
        >
          {loading ? '...' : '✓ Approve'}
        </button>
        <button
          className="action-btn reject"
          onClick={() => handleAction('reject')}
          disabled={loading}
        >
          ✕ Reject
        </button>
        <button
          className="action-btn note-toggle"
          onClick={() => setShowNote(!showNote)}
        >
          📝
        </button>
      </div>
    </div>
  )
}

function ToolCard({ tool, params, result, fullResult, expanded, onToggle, actionable, actionId, actionStatus, onAction }) {
  const toolIcons = {
    search_orders: '🔍',
    analyze_shipment: '📦',
    generate_reply: '💬',
    generate_report: '📊',
    create_escalation: '🚨',
    detect_anomalies: '⚠️',
    recommend_action: '💡',
    bulk_status_check: '📋',
    risk_assessment: '🛡️',
    draft_notification: '📧',
  }
  const toolLabels = {
    search_orders: 'Search Orders',
    analyze_shipment: 'Analyze Shipment',
    generate_reply: 'Generate Reply',
    generate_report: 'Generate Report',
    create_escalation: 'Create Escalation',
    detect_anomalies: 'Detect Anomalies',
    recommend_action: 'Recommend Action',
    bulk_status_check: 'Bulk Status Check',
    risk_assessment: 'Risk Assessment',
    draft_notification: 'Draft Notification',
  }

  return (
    <div className="tool-card">
      <div className="tool-card-header" onClick={onToggle}>
        <div className="tool-card-title">
          <span className="tool-icon">{toolIcons[tool] || '⚙️'}</span>
          <span className="tool-name">{toolLabels[tool] || tool}</span>
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

      {result && !expanded && (
        <div className="tool-card-summary">
          {tool === 'search_orders' && result.found !== undefined && (
            <span>Found {result.found} orders • Rs. {(result.total_value || 0).toLocaleString()} total value</span>
          )}
          {tool === 'analyze_shipment' && result.risk_level && (
            <span>Risk: {result.risk_level} (Score: {result.risk_score}) • {result.recommendations?.[0]}</span>
          )}
          {tool === 'generate_reply' && result.reply && (
            <span className="reply-preview">"{result.reply.slice(0, 80)}..."</span>
          )}
          {tool === 'generate_report' && result.report_type && (
            <span>Report: {result.report_type}</span>
          )}
          {tool === 'create_escalation' && result.ticket_id && (
            <span>Ticket {result.ticket_id} • Priority: {result.priority} • Assigned: {result.assigned_to}</span>
          )}
          {tool === 'detect_anomalies' && result.total_anomalies !== undefined && (
            <span>{result.total_anomalies} anomalies found • {result.critical || 0} critical, {result.high || 0} high</span>
          )}
          {tool === 'recommend_action' && result.total_actions && (
            <span>{result.total_actions} actions recommended for #{result.order_id}</span>
          )}
          {tool === 'bulk_status_check' && result.total_orders && (
            <span>{result.total_orders} orders grouped by {result.group_by} • {result.problem_areas?.length || 0} issues</span>
          )}
          {tool === 'risk_assessment' && result.total_assessed !== undefined && (
            <span>{result.total_assessed} at-risk orders • Rs. {(result.total_value_at_risk || 0).toLocaleString()} at risk</span>
          )}
          {tool === 'draft_notification' && result.target && (
            <span>Notification for {result.target}: {result.subject}</span>
          )}
        </div>
      )}

      {expanded && fullResult && (
        <div className="tool-card-detail">
          {tool === 'search_orders' && <SearchResultDetail data={fullResult} />}
          {tool === 'analyze_shipment' && <AnalysisDetail data={fullResult} />}
          {tool === 'generate_reply' && <ReplyDetail data={fullResult} />}
          {tool === 'generate_report' && <ReportDetail data={fullResult} />}
          {tool === 'create_escalation' && <EscalationDetail data={fullResult} />}
          {tool === 'detect_anomalies' && <AnomaliesDetail data={fullResult} />}
          {tool === 'recommend_action' && <ActionDetail data={fullResult} />}
          {tool === 'bulk_status_check' && <BulkStatusDetail data={fullResult} />}
          {tool === 'risk_assessment' && <RiskDetail data={fullResult} />}
          {tool === 'draft_notification' && <NotificationDetail data={fullResult} />}
        </div>
      )}

      {actionable && (
        <ActionButtons
          actionId={actionId}
          actionStatus={actionStatus}
          onAction={onAction}
        />
      )}
    </div>
  )
}

function SearchResultDetail({ data }) {
  const orders = data.orders || []
  return (
    <div className="detail-content">
      <div className="detail-stat-row">
        <div className="detail-stat"><strong>{data.found}</strong> orders found</div>
        <div className="detail-stat">Rs. <strong>{(data.total_value || 0).toLocaleString()}</strong> total</div>
      </div>
      {orders.length > 0 && (
        <table className="detail-table">
          <thead>
            <tr><th>ID</th><th>Customer</th><th>Status</th><th>Courier</th><th>Amount</th></tr>
          </thead>
          <tbody>
            {orders.slice(0, 15).map(o => (
              <tr key={o.order_id}>
                <td>#{o.order_id}</td>
                <td>{o.customer_name}</td>
                <td><span className={`mini-badge status-${o.status.toLowerCase().replace(/\s+/g, '-')}`}>{o.status}</span></td>
                <td>{o.courier}</td>
                <td>Rs. {o.order_amount?.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {data.truncated && <div className="detail-note">Showing first 15 of {data.found} results</div>}
    </div>
  )
}

function AnalysisDetail({ data }) {
  const o = data.order || {}
  return (
    <div className="detail-content">
      <div className="detail-stat-row">
        <div className="detail-stat">Order <strong>#{o.order_id}</strong></div>
        <div className="detail-stat">Age: <strong>{data.age_days}d</strong></div>
        <div className="detail-stat">Risk: <strong className={`risk-${data.risk_level?.toLowerCase()}`}>{data.risk_level}</strong> ({data.risk_score})</div>
      </div>
      <div className="detail-info-grid">
        <div><span className="detail-label">Customer:</span> {o.customer_name} — {o.customer_city}</div>
        <div><span className="detail-label">Status:</span> {o.status}</div>
        <div><span className="detail-label">Courier:</span> {o.courier}</div>
        <div><span className="detail-label">Amount:</span> Rs. {o.order_amount?.toLocaleString()} ({o.payment_method})</div>
        <div><span className="detail-label">Attempts:</span> {o.delivery_attempts}</div>
        <div><span className="detail-label">Profit:</span> Rs. {data.profit?.toLocaleString()}</div>
      </div>
      {data.risk_factors?.length > 0 && (
        <div className="detail-chips-section">
          <span className="detail-label">Risk Factors:</span>
          <div className="detail-chips">
            {data.risk_factors.map((f, i) => <span key={i} className="detail-chip risk">{f}</span>)}
          </div>
        </div>
      )}
      {data.recommendations?.length > 0 && (
        <div className="detail-chips-section">
          <span className="detail-label">Recommendations:</span>
          <div className="detail-chips">
            {data.recommendations.map((r, i) => <span key={i} className="detail-chip action">{r}</span>)}
          </div>
        </div>
      )}
    </div>
  )
}

function ReplyDetail({ data }) {
  const [copied, setCopied] = useState(false)
  const reply = data.generated_reply || ''
  const handleCopy = () => {
    navigator.clipboard.writeText(reply)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="detail-content">
      <div className="detail-stat-row">
        <div className="detail-stat">Order <strong>#{data.order?.order_id}</strong></div>
        <div className="detail-stat">Tone: <strong>{data.tone}</strong></div>
      </div>
      <div className="reply-box">
        <p>{reply}</p>
        <button className="copy-btn" onClick={handleCopy}>{copied ? '✓ Copied' : '📋 Copy'}</button>
      </div>
    </div>
  )
}

function ReportDetail({ data }) {
  if (data.report_type === 'daily') {
    return (
      <div className="detail-content">
        <div className="detail-stat-row">
          <div className="detail-stat">Total: <strong>{data.total_orders}</strong></div>
          <div className="detail-stat">Delivered: <strong>{data.delivered}</strong> ({data.delivery_rate}%)</div>
          <div className="detail-stat">Returns: <strong>{data.returns}</strong> ({data.return_rate}%)</div>
          <div className="detail-stat">Revenue: <strong>Rs. {data.revenue?.toLocaleString()}</strong></div>
        </div>
        <div className="detail-stat-row">
          <div className="detail-stat">Stuck: <strong>{data.stuck}</strong></div>
          <div className="detail-stat">In Transit: <strong>{data.in_transit}</strong></div>
          <div className="detail-stat">NDR Cases: <strong>{data.ndr_cases}</strong></div>
        </div>
      </div>
    )
  }
  if (data.report_type === 'courier' && data.couriers) {
    return (
      <div className="detail-content">
        <table className="detail-table">
          <thead><tr><th>Courier</th><th>Total</th><th>Delivered</th><th>Returned</th><th>Rate</th></tr></thead>
          <tbody>
            {Object.entries(data.couriers).sort((a,b) => b[1].total - a[1].total).map(([c, s]) => (
              <tr key={c}>
                <td><strong>{c}</strong></td>
                <td>{s.total}</td>
                <td>{s.delivered}</td>
                <td>{s.returned}</td>
                <td>{s.delivery_rate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  return (
    <div className="detail-content">
      <pre className="detail-json">{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}

function EscalationDetail({ data }) {
  return (
    <div className="detail-content">
      <div className="detail-stat-row">
        <div className="detail-stat">Ticket: <strong>{data.ticket_id}</strong></div>
        <div className="detail-stat">Order: <strong>#{data.order_id}</strong></div>
        <div className="detail-stat">Priority: <strong className={`priority-${data.priority}`}>{data.priority?.toUpperCase()}</strong></div>
      </div>
      <div className="detail-info-grid">
        <div><span className="detail-label">Reason:</span> {data.reason}</div>
        <div><span className="detail-label">Assigned To:</span> {data.assigned_to}</div>
        <div><span className="detail-label">SLA:</span> {data.sla_hours}h deadline</div>
        <div><span className="detail-label">Customer:</span> {data.customer_name}</div>
        <div><span className="detail-label">Courier:</span> {data.courier}</div>
        <div><span className="detail-label">Amount:</span> Rs. {data.order_amount?.toLocaleString()}</div>
      </div>
    </div>
  )
}

function AnomaliesDetail({ data }) {
  const severityColors = { critical: '#c53030', high: '#d4740e', medium: '#b8860b', low: '#2d6a4f' }
  return (
    <div className="detail-content">
      <div className="detail-stat-row">
        <div className="detail-stat">Total: <strong>{data.total_anomalies}</strong></div>
        <div className="detail-stat" style={{color: severityColors.critical}}>Critical: <strong>{data.critical || 0}</strong></div>
        <div className="detail-stat" style={{color: severityColors.high}}>High: <strong>{data.high || 0}</strong></div>
        <div className="detail-stat" style={{color: severityColors.medium}}>Medium: <strong>{data.medium || 0}</strong></div>
      </div>
      {data.anomalies?.map((a, i) => (
        <div key={i} className={`anomaly-item severity-${a.severity}`}>
          <span className="anomaly-severity">{a.severity?.toUpperCase()}</span>
          <span className="anomaly-message">{a.message}</span>
        </div>
      ))}
    </div>
  )
}

function ActionDetail({ data }) {
  const prioIcons = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }
  return (
    <div className="detail-content">
      <div className="detail-stat-row">
        <div className="detail-stat">Order: <strong>#{data.order_id}</strong></div>
        <div className="detail-stat">Status: <strong>{data.status}</strong></div>
        <div className="detail-stat">Age: <strong>{data.age_days}d</strong></div>
        <div className="detail-stat">Amount: <strong>Rs. {data.amount?.toLocaleString()}</strong></div>
      </div>
      <div className="action-list">
        {data.actions?.map((a, i) => (
          <div key={i} className={`action-item priority-${a.priority}`}>
            <span className="action-icon">{prioIcons[a.priority] || '⚪'}</span>
            <div className="action-content">
              <strong>{a.action}</strong>
              <span className="action-reason">{a.reason}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BulkStatusDetail({ data }) {
  const groups = data.groups || {}
  const sorted = Object.entries(groups).sort((a, b) => b[1].count - a[1].count)
  return (
    <div className="detail-content">
      <div className="detail-stat-row">
        <div className="detail-stat">Total: <strong>{data.total_orders}</strong></div>
        <div className="detail-stat">Grouped by: <strong>{data.group_by}</strong></div>
      </div>
      <table className="detail-table">
        <thead><tr><th>{data.group_by}</th><th>Count</th><th>%</th><th>Value</th></tr></thead>
        <tbody>
          {sorted.map(([key, val]) => (
            <tr key={key}>
              <td><strong>{key}</strong></td>
              <td>{val.count}</td>
              <td>{val.percentage}%</td>
              <td>Rs. {val.total_value?.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.problem_areas?.length > 0 && (
        <div className="detail-chips-section">
          <span className="detail-label">Problem Areas:</span>
          <div className="detail-chips">
            {data.problem_areas.map((p, i) => <span key={i} className="detail-chip risk">{p}</span>)}
          </div>
        </div>
      )}
    </div>
  )
}

function RiskDetail({ data }) {
  const levelColors = { Critical: '#c53030', High: '#d4740e', Medium: '#b8860b', Low: '#2d6a4f' }
  return (
    <div className="detail-content">
      <div className="detail-stat-row">
        <div className="detail-stat">At Risk: <strong>{data.total_assessed}</strong> / {data.total_pending} pending</div>
        <div className="detail-stat">Value at Risk: <strong>Rs. {data.total_value_at_risk?.toLocaleString()}</strong></div>
      </div>
      <div className="detail-stat-row">
        {Object.entries(data.by_level || {}).map(([level, count]) => (
          <div key={level} className="detail-stat" style={{color: levelColors[level]}}>
            {level}: <strong>{count}</strong>
          </div>
        ))}
      </div>
      {data.top_risks?.length > 0 && (
        <table className="detail-table">
          <thead><tr><th>Order</th><th>Customer</th><th>Risk</th><th>Amount</th><th>Factors</th></tr></thead>
          <tbody>
            {data.top_risks.slice(0, 10).map(r => (
              <tr key={r.order_id}>
                <td>#{r.order_id}</td>
                <td>{r.customer}</td>
                <td><span className={`mini-badge risk-${r.risk_level?.toLowerCase()}`}>{r.risk_level}</span></td>
                <td>Rs. {r.amount?.toLocaleString()}</td>
                <td>{r.factors?.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function NotificationDetail({ data }) {
  const [copied, setCopied] = useState(false)
  const body = data.notification_body || ''
  const handleCopy = () => {
    navigator.clipboard.writeText(body)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="detail-content">
      <div className="detail-stat-row">
        <div className="detail-stat">To: <strong>{data.target}</strong></div>
        <div className="detail-stat">Subject: <strong>{data.subject}</strong></div>
      </div>
      <div className="reply-box">
        <p>{body}</p>
        <button className="copy-btn" onClick={handleCopy}>{copied ? '✓ Copied' : '📋 Copy'}</button>
      </div>
    </div>
  )
}

export default function OrioAgent() {
  const { theme, toggleTheme } = useTheme()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [thinkingSteps, setThinkingSteps] = useState([])
  const [currentTools, setCurrentTools] = useState([])
  const [expandedTools, setExpandedTools] = useState({})
  const [actionStatuses, setActionStatuses] = useState({})
  const [showActionLog, setShowActionLog] = useState(false)
  const [actionLog, setActionLog] = useState([])
  const [chainPlan, setChainPlan] = useState(null)
  const [chainStep, setChainStep] = useState(0)
  const [autonomousMode, setAutonomousMode] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [alertCount, setAlertCount] = useState(0)
  const [showAlerts, setShowAlerts] = useState(false)
  const [memoryContext, setMemoryContext] = useState([])
  const [streamingText, setStreamingText] = useState('')
  const autonomousRef = useRef(null)
  const wsRef = useRef(null)
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)
  const currentToolsRef = useRef([])
  const thinkingStepsRef = useRef([])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinkingSteps, currentTools, streamingText])

  useEffect(() => {
    fetchAlertCount()
    fetchMemoryContext()
  }, [])

  useEffect(() => {
    if (autonomousMode) {
      runAutonomousCheck()
      autonomousRef.current = setInterval(runAutonomousCheck, 60000)
    } else {
      if (autonomousRef.current) clearInterval(autonomousRef.current)
    }
    return () => { if (autonomousRef.current) clearInterval(autonomousRef.current) }
  }, [autonomousMode])

  const runAutonomousCheck = async () => {
    try {
      await fetch('http://localhost:8001/api/agent/autonomous/run', { method: 'POST' })
      fetchAlertCount()
      fetchAlerts()
    } catch (e) {
      console.error('Autonomous check failed:', e)
    }
  }

  const fetchAlertCount = async () => {
    try {
      const res = await fetch('http://localhost:8001/api/agent/alerts/count')
      if (res.ok) {
        const data = await res.json()
        setAlertCount(data.count)
      }
    } catch (e) {}
  }

  const fetchAlerts = async () => {
    try {
      const res = await fetch('http://localhost:8001/api/agent/alerts?limit=20')
      if (res.ok) {
        const data = await res.json()
        setAlerts(data)
      }
    } catch (e) {}
  }

  const fetchMemoryContext = async () => {
    try {
      const res = await fetch('http://localhost:8001/api/agent/context?limit=5')
      if (res.ok) {
        const data = await res.json()
        setMemoryContext(data)
      }
    } catch (e) {}
  }

  const dismissAlert = async (alertId) => {
    try {
      await fetch(`http://localhost:8001/api/agent/alerts/${alertId}/dismiss`, { method: 'POST' })
      setAlerts(prev => prev.map(a => a.alert_id === alertId ? { ...a, status: 'dismissed' } : a))
      setAlertCount(prev => Math.max(0, prev - 1))
    } catch (e) {}
  }

  const toggleAlerts = () => {
    if (!showAlerts) fetchAlerts()
    setShowAlerts(!showAlerts)
  }

  const connectWS = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return wsRef.current

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      switch (data.type) {
        case 'chain_plan':
          setChainPlan(data.steps)
          setChainStep(0)
          break

        case 'department_routed':
          setThinkingSteps(prev => {
            const routeMsg = `${data.department_icon} Routed to ${data.department} → ${data.agent_avatar || '👤'} ${data.agent_name || 'Available Agent'}`
            const next = [...prev.map(s => ({ ...s, status: 'done' })), { step: 0, message: routeMsg, status: 'done' }]
            thinkingStepsRef.current = next
            return next
          })
          break

        case 'thinking':
          setThinkingSteps(prev => {
            const updated = prev.map(s => ({ ...s, status: 'done' }))
            const next = [...updated, { step: data.step, message: data.message, status: 'active' }]
            thinkingStepsRef.current = next
            return next
          })
          break

        case 'tool_call':
          if (data.chain_step) setChainStep(data.chain_step)
          setCurrentTools(prev => {
            const next = [...prev, {
              tool: data.tool,
              params: data.params,
              description: data.description,
              result: null,
              fullResult: null,
              status: 'running',
            }]
            currentToolsRef.current = next
            return next
          })
          setThinkingSteps(prev => {
            const updated = prev.map(s => ({ ...s, status: 'done' }))
            const next = [...updated, { step: prev.length + 1, message: `Using tool: ${data.tool}`, status: 'active' }]
            thinkingStepsRef.current = next
            return next
          })
          break

        case 'tool_result':
          setCurrentTools(prev => {
            const next = prev.map(t =>
              t.tool === data.tool && t.status === 'running'
                ? {
                    ...t,
                    result: data.result,
                    fullResult: data.full_result,
                    status: 'done',
                    actionable: data.actionable || false,
                    actionId: data.action_id || null,
                  }
                : t
            )
            currentToolsRef.current = next
            return next
          })
          setThinkingSteps(prev => {
            const next = prev.map(s => ({ ...s, status: 'done' }))
            thinkingStepsRef.current = next
            return next
          })
          break

        case 'stream':
          setStreamingText(prev => prev + data.token)
          break

        case 'stream_clear':
          setStreamingText('')
          break

        case 'handoff':
          setThinkingSteps(prev => {
            const next = [...prev.map(s => ({ ...s, status: 'done' })), {
              step: prev.length + 1,
              message: '🙋 Transferring to human agent...',
              status: 'done',
            }]
            thinkingStepsRef.current = next
            return next
          })
          break

        case 'handoff_resolved':
          setMessages(prev => [...prev, {
            role: 'agent',
            content: data.human_reply,
            mode: 'handoff_resolved',
            handoffResolvedBy: data.assigned_to,
            handoffResolvedId: data.handoff_id,
            timestamp: new Date(),
          }])
          break

        case 'response':
          setStreamingText('')
          setCurrentTools(prevTools => {
            setThinkingSteps(prevSteps => {
              setChainPlan(prevPlan => {
                setMessages(prev => [...prev, {
                  role: 'agent',
                  content: data.message,
                  tools: [...prevTools],
                  thinkingSteps: [...prevSteps],
                  chainSummary: data.chain_summary || (prevPlan ? { plan: prevPlan, completed: prevTools.length, total: prevPlan.length } : null),
                  mode: data.mode || 'oms',
                  handoffId: data.handoff_id || null,
                  learnedFrom: data.learned_from || null,
                  webSources: data.web_sources || null,
                  assignedAgent: data.assigned_agent || null,
                  timestamp: new Date(),
                }])
                return null
              })
              return []
            })
            return []
          })
          currentToolsRef.current = []
          thinkingStepsRef.current = []
          setChainStep(0)
          setIsProcessing(false)
          break

        case 'error':
          setMessages(prev => [...prev, {
            role: 'agent',
            content: `Error: ${data.message}`,
            isError: true,
            timestamp: new Date(),
          }])
          setThinkingSteps([])
          setCurrentTools([])
          currentToolsRef.current = []
          thinkingStepsRef.current = []
          setIsProcessing(false)
          break
      }
    }

    ws.onclose = () => { wsRef.current = null }
    ws.onerror = () => { wsRef.current = null }

    return ws
  }

  const sendPrompt = (prompt) => {
    if (!prompt.trim() || isProcessing) return

    setMessages(prev => [...prev, { role: 'user', content: prompt, timestamp: new Date() }])
    setInput('')
    setIsProcessing(true)
    setThinkingSteps([])
    setCurrentTools([])
    setChainPlan(null)
    setChainStep(0)
    currentToolsRef.current = []
    thinkingStepsRef.current = []

    const ws = connectWS()
    const send = () => ws.send(JSON.stringify({ prompt }))

    if (ws.readyState === WebSocket.OPEN) {
      send()
    } else {
      ws.addEventListener('open', send, { once: true })
    }
  }

  const sendMessage = () => {
    sendPrompt(input.trim())
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const quickActions = [
    { label: '🔍 Stuck Orders', prompt: 'Find all stuck orders and tell me which ones need immediate attention' },
    { label: '📢 Escalate Critical', prompt: 'Find critical orders that need escalation and create escalation plans' },
    { label: '📋 Daily Report', prompt: 'Generate today\'s daily CS report with all key metrics' },
    { label: '💬 Pending Replies', prompt: 'Find orders with failed deliveries and draft customer replies' },
    { label: '🚨 Risk Assessment', prompt: 'Run a risk assessment on all pending orders' },
    { label: '📊 Courier Performance', prompt: 'Generate a courier performance report and identify the worst performers' },
  ]

  const handleQuickAction = (prompt) => {
    sendPrompt(prompt)
  }

  const toggleTool = (msgIdx, toolIdx) => {
    const key = `${msgIdx}-${toolIdx}`
    setExpandedTools(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleActionUpdate = (actionId, type) => {
    setActionStatuses(prev => ({ ...prev, [actionId]: type === 'approve' ? 'approved' : 'rejected' }))
  }

  const fetchActionLog = async () => {
    try {
      const res = await fetch('http://localhost:8001/api/agent/action-log?limit=30')
      if (res.ok) {
        const data = await res.json()
        setActionLog(data)
      }
    } catch (e) {
      console.error('Failed to fetch action log:', e)
    }
  }

  const toggleActionLog = () => {
    if (!showActionLog) fetchActionLog()
    setShowActionLog(!showActionLog)
  }

  return (
    <div className="orio-agent">
      <div className="orio-agent-header">
        <div className="orio-agent-back">
          <Link to="/agents" className="back-link">← Agents</Link>
          <div>
            <h1>🤖 Orio AI Assistant</h1>
            <p>Your intelligent assistant — ask me anything</p>
          </div>
        </div>
        <div className="header-actions">
          <div className="autonomous-toggle">
            <label className="toggle-switch">
              <input type="checkbox" checked={autonomousMode} onChange={() => setAutonomousMode(!autonomousMode)} />
              <span className="toggle-slider" />
            </label>
            <span className={`toggle-label ${autonomousMode ? 'active' : ''}`}>
              {autonomousMode ? '🟢 Auto' : '⚪ Auto'}
            </span>
          </div>
          <button className="alert-btn" onClick={toggleAlerts}>
            🔔 {alertCount > 0 && <span className="alert-badge">{alertCount}</span>}
          </button>
          <button className="action-log-btn" onClick={toggleActionLog}>
            📋 Action Log
          </button>
          <button className="agent-theme-btn" onClick={toggleTheme}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>

      <div className="quick-actions">
        {quickActions.map((qa, i) => (
          <button key={i} className="quick-action-btn" onClick={() => handleQuickAction(qa.prompt)}>
            {qa.label}
          </button>
        ))}
      </div>

      <div className="orio-chat-area">
        {messages.length === 0 && !isProcessing && (
          <div className="orio-empty-state">
            <div className="orio-empty-icon">🤖</div>
            <h2>Orio AI Assistant</h2>
            <p>I'm your intelligent assistant — ask me anything! I can help with general questions, OMS operations, orders, reports, and more.</p>
            <div className="orio-examples">
              <p className="example-label">Try something like:</p>
              <div className="example-list">
                <span>"Find all stuck orders older than 30 days"</span>
                <span>"Analyze order 424521"</span>
                <span>"Generate a daily report"</span>
                <span>"Draft a reply for order TRK-9941"</span>
              </div>
            </div>
            {memoryContext.length > 0 && (
              <div className="memory-indicator">
                <span className="memory-icon">🧠</span>
                <span className="memory-text">
                  {memoryContext.length} recent conversation{memoryContext.length > 1 ? 's' : ''} in memory
                </span>
              </div>
            )}
          </div>
        )}

        {messages.map((msg, msgIdx) => (
          <div key={msgIdx} className={`orio-message ${msg.role} ${msg.isError ? 'error' : ''}`}>
            <div className="orio-message-avatar">
              {msg.role === 'user' ? '👤' : '🤖'}
            </div>
            <div className="orio-message-content">
              <div className="orio-message-text">{msg.content}</div>

              {msg.tools && msg.tools.length > 0 && (
                <div className={`orio-tool-cards ${msg.tools.length > 1 ? 'chained' : ''}`}>
                  {msg.tools.map((t, tIdx) => (
                    <div key={tIdx} className="tool-chain-wrapper">
                      {tIdx > 0 && msg.tools.length > 1 && (
                        <div className="chain-connector">
                          <div className="chain-connector-line" />
                          <span className="chain-connector-arrow">▼</span>
                        </div>
                      )}
                      <ToolCard
                        tool={t.tool}
                        params={t.params}
                        result={t.result}
                        fullResult={t.fullResult}
                        expanded={expandedTools[`${msgIdx}-${tIdx}`]}
                        onToggle={() => toggleTool(msgIdx, tIdx)}
                        actionable={t.actionable}
                        actionId={t.actionId}
                        actionStatus={actionStatuses[t.actionId]}
                        onAction={handleActionUpdate}
                      />
                    </div>
                  ))}
                </div>
              )}

              {msg.chainSummary && (
                <ChainSummary summary={msg.chainSummary} tools={msg.tools} />
              )}

              {msg.handoffId && (
                <HandoffCard handoffId={msg.handoffId} reason="AI was not confident enough to answer" />
              )}

              {msg.mode === 'handoff_resolved' && (
                <div className="handoff-resolved-badge">
                  <span className="handoff-resolved-icon">👤</span>
                  <span>Replied by <strong>{msg.handoffResolvedBy || 'Human Agent'}</strong></span>
                </div>
              )}

              {msg.learnedFrom && (
                <LearnedBadge learnedFrom={msg.learnedFrom} />
              )}

              {msg.webSources && (
                <WebSearchBadge webSources={msg.webSources} />
              )}

              {msg.assignedAgent && (
                <AgentBadge assignedAgent={msg.assignedAgent} />
              )}

              <div className="orio-message-time">
                {msg.timestamp && new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="orio-message agent processing">
            <div className="orio-message-avatar">🤖</div>
            <div className="orio-message-content">
              {chainPlan && (
                <ChainProgress plan={chainPlan} currentStep={chainStep} total={chainPlan.length} />
              )}
              <div className="thinking-stream">
                {thinkingSteps.map((step, i) => (
                  <ThinkingStep key={i} {...step} />
                ))}
              </div>
              <div className={`orio-tool-cards ${currentTools.filter(t => t.status === 'done').length > 1 ? 'chained' : ''}`}>
                {currentTools.filter(t => t.status === 'done').map((t, i, arr) => (
                  <div key={i} className="tool-chain-wrapper">
                    {i > 0 && arr.length > 1 && (
                      <div className="chain-connector">
                        <div className="chain-connector-line" />
                        <span className="chain-connector-arrow">▼</span>
                      </div>
                    )}
                    <ToolCard
                      tool={t.tool}
                      params={t.params}
                      result={t.result}
                      fullResult={t.fullResult}
                      expanded={expandedTools[`live-${i}`]}
                      onToggle={() => setExpandedTools(prev => ({ ...prev, [`live-${i}`]: !prev[`live-${i}`] }))}
                      actionable={t.actionable}
                      actionId={t.actionId}
                      actionStatus={actionStatuses[t.actionId]}
                      onAction={handleActionUpdate}
                    />
                  </div>
                ))}
              </div>
              {currentTools.some(t => t.status === 'running') && (
                <div className="tool-running">
                  <span className="thinking-spinner" /> Executing tool...
                </div>
              )}
              {streamingText && (
                <div className="streaming-text">
                  {streamingText}
                  <span className="streaming-cursor">|</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div className="orio-input-area">
        <div className="orio-input-wrapper">
          <textarea
            ref={inputRef}
            className="orio-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell Orio what to do... (e.g. 'Find stuck orders and escalate critical ones')"
            rows={1}
            disabled={isProcessing}
          />
          <button
            className="orio-send-btn"
            onClick={sendMessage}
            disabled={!input.trim() || isProcessing}
          >
            {isProcessing ? '⏳' : '➤'}
          </button>
        </div>
      </div>

      {showAlerts && (
        <div className="action-log-overlay" onClick={() => setShowAlerts(false)}>
          <div className="action-log-panel alerts-panel" onClick={e => e.stopPropagation()}>
            <div className="action-log-header">
              <h3>🔔 Proactive Alerts</h3>
              <div className="alerts-header-actions">
                {autonomousMode && <span className="auto-badge">🟢 Auto-checking</span>}
                <button className="action-log-close" onClick={() => setShowAlerts(false)}>✕</button>
              </div>
            </div>
            <div className="action-log-content">
              {alerts.length === 0 ? (
                <div className="action-log-empty">
                  No alerts yet. {!autonomousMode && 'Enable Auto mode to start monitoring.'}
                </div>
              ) : (
                alerts.map((a, i) => (
                  <div key={i} className={`alert-item severity-${a.severity} ${a.status === 'dismissed' ? 'dismissed' : ''}`}>
                    <div className="alert-item-header">
                      <span className={`alert-severity ${a.severity}`}>
                        {a.severity === 'critical' ? '🔴' : a.severity === 'high' ? '🟠' : '🟡'} {a.severity}
                      </span>
                      <span className="alert-type">{a.alert_type?.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="alert-title">{a.title}</div>
                    <div className="alert-message">{a.message}</div>
                    <div className="alert-footer">
                      <span className="alert-time">{new Date(a.created_at).toLocaleString()}</span>
                      {a.status === 'new' && (
                        <button className="alert-dismiss-btn" onClick={() => dismissAlert(a.alert_id)}>
                          Dismiss
                        </button>
                      )}
                      {a.status === 'dismissed' && <span className="alert-dismissed-badge">Dismissed</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showActionLog && (
        <div className="action-log-overlay" onClick={() => setShowActionLog(false)}>
          <div className="action-log-panel" onClick={e => e.stopPropagation()}>
            <div className="action-log-header">
              <h3>📋 Action Log</h3>
              <button className="action-log-close" onClick={() => setShowActionLog(false)}>✕</button>
            </div>
            <div className="action-log-content">
              {actionLog.length === 0 ? (
                <div className="action-log-empty">No actions recorded yet</div>
              ) : (
                actionLog.map((a, i) => (
                  <div key={i} className={`action-log-item status-${a.status}`}>
                    <div className="action-log-item-header">
                      <span className="action-log-tool">{a.tool_name}</span>
                      <span className={`action-log-status ${a.status}`}>
                        {a.status === 'approved' ? '✓' : a.status === 'rejected' ? '✕' : '⏳'} {a.status}
                      </span>
                    </div>
                    <div className="action-log-item-detail">
                      <span className="action-log-id">{a.action_id}</span>
                      <span className="action-log-time">
                        {new Date(a.created_at).toLocaleString()}
                      </span>
                    </div>
                    {a.reviewer_note && (
                      <div className="action-log-note">Note: {a.reviewer_note}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
