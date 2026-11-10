import { useState, useRef, useEffect } from 'react'
import ConversationSidebar from '../../components/ConversationSidebar'
import { speakStreaming, startRecording, transcribe } from '../../utils/voice'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { Link } from 'react-router-dom'
import './OrioAgent.css'
import { AGENT_WS_URL, API_BASE, getApiKey } from '../../config'
import MarkdownText from '../../components/MarkdownText'

const WS_URL = AGENT_WS_URL

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

// Seconds since a turn started. A long answer that shows a ticking clock
// and its current step feels like work in progress; the same wait on a
// frozen screen feels like a hang.
function ElapsedTimer() {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [])
  if (seconds < 2) return null
  return <span className="orio-elapsed">⏱ {seconds}s</span>
}

// One-tap follow-ups under the latest answer.
function SuggestionChips({ suggestions, onPick }) {
  if (!suggestions || suggestions.length === 0) return null
  return (
    <div className="orio-chips">
      {suggestions.map((c, i) => (
        <button key={i} className="orio-chip" onClick={() => onPick(c.prompt)}>{c.label}</button>
      ))}
    </div>
  )
}

const FEEDBACK_REASONS = [
  ['wrong_numbers', 'Wrong numbers'],
  ['misunderstood', "Didn't understand me"],
  ['incomplete', 'Incomplete'],
  ['too_slow', 'Too slow'],
]

const ICON_PROPS = {
  width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
}

const CopyIcon = () => (
  <svg {...ICON_PROPS}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></svg>
)
const CheckIcon = () => (
  <svg {...ICON_PROPS}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
)
const ThumbUpIcon = ({ filled }) => (
  <svg {...ICON_PROPS} fill={filled ? 'currentColor' : 'none'}>
    <path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3z" />
    <path d="M7 11l4-7a2 2 0 0 1 2 2v3h5.5a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.3 20H7" />
  </svg>
)
const ThumbDownIcon = ({ filled }) => (
  <svg {...ICON_PROPS} fill={filled ? 'currentColor' : 'none'}>
    <path d="M17 13V4h3a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-3z" />
    <path d="M17 13l-4 7a2 2 0 0 1-2-2v-3H5.5a2 2 0 0 1-2-2.3l1.2-7A2 2 0 0 1 6.7 4H17" />
  </svg>
)

// Copy / thumbs up / thumbs down under an answer, icon-only. A thumbs-down
// offers an optional reason; the rating is already saved before the reason
// is chosen.
function MessageActions({ fb, onCopy, copied, onRate, onReason }) {
  return (
    <>
      <span className="orio-msg-actions">
        <button className={`orio-act-btn ${copied ? 'active copied' : ''}`} onClick={onCopy}
                title={copied ? 'Copied' : 'Copy'} aria-label="Copy answer">
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
        <button className={`orio-act-btn ${fb?.rating === 'up' ? 'active up' : ''}`}
                onClick={() => onRate('up')} title="Good answer" aria-label="Good answer">
          <ThumbUpIcon filled={fb?.rating === 'up'} />
        </button>
        <button className={`orio-act-btn ${fb?.rating === 'down' ? 'active down' : ''}`}
                onClick={() => onRate('down')} title="Bad answer" aria-label="Bad answer">
          <ThumbDownIcon filled={fb?.rating === 'down'} />
        </button>
      </span>
      {fb?.rating === 'down' && (
        <div className="orio-fb-reasons">
          <span className="orio-fb-thanks">Sorry about that. What went wrong?</span>
          {FEEDBACK_REASONS.map(([key, label]) => (
            <button key={key} className={`orio-chip ${fb.reason === key ? 'selected' : ''}`}
                    onClick={() => onReason(key)}>{label}</button>
          ))}
        </div>
      )}
      {fb?.rating === 'up' && <span className="orio-fb-thanks inline">Thanks!</span>}
    </>
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

  const done = summary.completed ?? 0
  const total = summary.total ?? summary.plan.length
  // A plan that stops at an approval is not finished, and saying so avoids
  // implying the remaining steps already ran.
  const finished = done >= total

  return (
    <div className="chain-summary-card">
      <div className="chain-summary-header">
        <span className="chain-summary-icon">🔗</span>
        <span className="chain-summary-title">
          {finished ? 'Chain complete' : 'Chain paused'}
        </span>
        <span className="chain-summary-badge">{done} of {total} steps</span>
      </div>
      <div className="chain-summary-steps">
        {summary.plan.map((step, i) => {
          const tool = tools?.[i]
          const stepDone = i < done
          return (
            <div key={i} className={`chain-summary-step ${stepDone ? '' : 'pending'}`}>
              <span className="chain-summary-check">{stepDone ? '✓' : '⏳'}</span>
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

function ActionButtons({ actionId, actionStatus, onAction, outcome, confirmLabel }) {
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [loading, setLoading] = useState(false)

  const [error, setError] = useState(null)

  if (actionStatus === 'approved') {
    // Approving a write carries it out, so report what actually happened
    // rather than just that the button was pressed.
    // The allowlist stopping a message is not a failure — it is the safety
    // rail doing its job. Reporting it as "the change failed" sends someone
    // hunting for a broken system.
    if (outcome?.execution_result?.status === 'blocked') {
      return (
        <div className="action-status blocked">
          🛡 Held back by the allowlist — nothing was sent
          <span className="action-status-detail">
            {outcome.execution_result?.recipient
              ? `${outcome.execution_result.recipient} is not on MESSAGING_ALLOWLIST. `
              : ''}
            The message is saved in the outbox and can be sent once that
            number is allowed.
          </span>
        </div>
      )
    }
    if (outcome?.execution_status === 'failed') {
      return (
        <div className="action-status failed">
          ✕ Approved, but the change failed
          <span className="action-status-detail">
            {outcome.execution_result?.error || 'The order could not be updated.'}
          </span>
        </div>
      )
    }
    if (outcome?.executed) {
      return (
        <div className="action-status approved">
          ✓ Done
          <span className="action-status-detail">
            {outcome.execution_result?.message || 'The change was applied.'}
          </span>
        </div>
      )
    }
    return <div className="action-status approved">✓ Approved</div>
  }
  if (actionStatus === 'rejected') {
    return <div className="action-status rejected">✕ Rejected — nothing was changed</div>
  }

  const handleAction = async (type) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/agent/action-log/${actionId}/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        onAction(actionId, type, data)
      } else {
        setError(data.error || 'Could not complete that.')
      }
    } catch (e) {
      setError('Could not reach the server.')
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
      {error && <div className="action-error">{error}</div>}
      <div className="action-btn-row">
        <button
          className="action-btn approve"
          onClick={() => handleAction('approve')}
          disabled={loading}
        >
          {loading ? 'Working…' : (confirmLabel || '✓ Approve')}
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

const RISK_LABELS = {
  send_message: { label: 'Sends a message', className: 'risk-send' },
  write: { label: 'Changes an order', className: 'risk-write' },
  bulk_write: { label: 'Changes many orders', className: 'risk-bulk' },
  draft: { label: 'Draft for review', className: 'risk-draft' },
}

/**
 * Shows exactly what an action would do, before anyone approves it.
 *
 * The agent chooses these parameters itself, so the reviewer is shown the
 * concrete before/after — not just the tool's name — and told plainly that
 * nothing has happened yet.
 */
// A batch of drafts creates tickets or messages; it does not alter orders,
// and labelling it as a change would overstate what the reviewer is agreeing to.
const BATCH_LABELS = {
  send_message: 'Sends messages',
  create_escalation: 'Creates escalation tickets',
  generate_reply: 'Creates customer replies',
  draft_notification: 'Creates notifications',
}

function ApprovalCard({ risk, preview, actionId, actionStatus, onAction, outcome }) {
  const batchLabel = BATCH_LABELS[preview?.step_tool]
  const meta = batchLabel
    ? { label: batchLabel, className: 'risk-draft' }
    : (RISK_LABELS[preview?.action] || RISK_LABELS[risk] || RISK_LABELS.write)
  const changes = preview?.changes || {}
  const affected = preview?.affected ?? 1
  const isBulk = affected > 1
  const pending = !actionStatus

  return (
    <div className={`approval-card ${meta.className}`}>
      <div className="approval-head">
        <span className="approval-risk">{meta.label}</span>
        {isBulk && (
          <span className="approval-count">
            {affected} {batchLabel ? 'tickets' : 'orders'}
          </span>
        )}
      </div>

      {preview?.action === 'send_message' && (
        <div className="approval-message">
          <div className="approval-message-to">
            <span className="approval-message-channel">
              {preview.channel === 'email' ? '✉️ Email' : '💬 WhatsApp'}
            </span>
            <span>
              to <strong>{preview.recipient_name}</strong> ({preview.recipient_address})
            </span>
          </div>
          {preview.subject && (
            <div className="approval-message-subject">{preview.subject}</div>
          )}
          <div className="approval-message-body">{preview.body}</div>
          {!preview.will_send && (
            <div className="approval-message-sandbox">
              Sandbox — this will be recorded, not delivered.
            </div>
          )}
        </div>
      )}

      {!isBulk && preview?.order_id && preview?.action !== 'send_message' && (
        <div className="approval-target">
          Order <strong>{preview.order_id}</strong>
          {preview.customer_name && <> · {preview.customer_name}</>}
        </div>
      )}

      <div className="approval-changes">
        {Object.entries(changes).map(([field, change]) => (
          <div className="approval-change" key={field}>
            <span className="approval-field">{field}</span>
            <span className="approval-from">{String(change.from)}</span>
            <span className="approval-arrow">→</span>
            <span className="approval-to">{String(change.to)}</span>
          </div>
        ))}
      </div>

      {isBulk && preview?.sample?.length > 0 && (
        <div className="approval-sample">
          {preview.sample.map(o => (
            <div className="approval-sample-row" key={o.order_id}>
              <span>{o.order_id}</span>
              <span>{o.customer}</span>
              <span>{o.courier}</span>
            </div>
          ))}
          {affected > preview.sample.length && (
            <div className="approval-sample-more">
              +{affected - preview.sample.length} more
            </div>
          )}
        </div>
      )}

      {typeof preview?.total_value === 'number' && (
        <div className="approval-value">
          Total value: Rs. {preview.total_value.toLocaleString()}
        </div>
      )}

      {pending && (
        <div className="approval-notice">
          {batchLabel ? 'Nothing has been created yet.' : 'Nothing has been changed yet.'}
        </div>
      )}

      <ActionButtons
        actionId={actionId}
        actionStatus={actionStatus}
        onAction={onAction}
        outcome={outcome}
        confirmLabel={
          isBulk
            ? (batchLabel ? `✓ Create ${affected}` : `✓ Apply to ${affected} orders`)
            : (preview?.action === 'send_message' ? '✓ Send' : '✓ Apply change')
        }
      />
    </div>
  )
}

/** Shown when a proposed action was refused before it could be queued. */
function BlockedCard({ result }) {
  return (
    <div className="approval-card risk-blocked">
      <div className="approval-head">
        <span className="approval-risk">Blocked</span>
      </div>
      <div className="approval-notice">{result?.error}</div>
    </div>
  )
}

function ToolCard({ tool, params, result, fullResult, expanded, onToggle, actionable, actionId, actionStatus, onAction, risk, preview, blocked, outcome, onRecommend }) {
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
    list_couriers: '🚚',
    list_shipments: '📦',
    list_expenses: '💸',
    list_invoices: '🧾',
    list_pickup_locations: '📍',
    list_rules: '⚙️',
    cod_payout: '💰',
    tariff: '🏷️',
    courier_insights: '📈',
    courier_advisor: '✨',
    compare_periods: '📊',
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
    list_couriers: 'List Couriers',
    list_shipments: 'List Shipments',
    list_expenses: 'List Expenses',
    list_invoices: 'Invoices',
    list_pickup_locations: 'Pickup Locations',
    list_rules: 'Orio Rules',
    cod_payout: 'COD Payout',
    tariff: 'Tariff',
    courier_insights: 'Courier Insights',
    courier_advisor: 'Smart Courier Advisor',
    compare_periods: 'Compare Periods',
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
            <span>Risk: {result.risk_level} (Score: {result.risk_score}) • {typeof result.recommendations?.[0] === 'string' ? result.recommendations[0] : result.recommendations?.[0]?.text}</span>
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
          {tool === 'list_couriers' && result.total_couriers !== undefined && (
            <span>{result.total_couriers} couriers configured</span>
          )}
          {tool === 'list_shipments' && result.total_shipments !== undefined && (
            <span>{result.total_shipments} shipments • Rs. {(result.total_value || 0).toLocaleString()} total value</span>
          )}
          {tool === 'compare_periods' && result.current && (<span>{result.domain}: {result.current.period.label} vs {result.baseline.period.label}</span>)}
          {tool === 'list_expenses' && result.total_expenses !== undefined && (
            <span>{result.total_expenses} expenses • Rs. {(result.total_amount || 0).toLocaleString()} total</span>
          )}
          {tool === 'list_invoices' && result.invoice_id !== undefined && (
            <span>Invoice {result.invoice_name} • {result.payment_status} • Rs. {(result.total_order_amount || 0).toLocaleString()}</span>
          )}
          {tool === 'list_invoices' && result.found !== undefined && (
            <span>{result.found} invoices found</span>
          )}
          {tool === 'list_pickup_locations' && result.found !== undefined && (
            <span>{result.found} pickup location{result.found === 1 ? '' : 's'} found</span>
          )}
          {tool === 'list_rules' && result.found !== undefined && (
            <span>{result.found} rule{result.found === 1 ? '' : 's'} • {result.active} active • {result.inactive} inactive</span>
          )}
          {tool === 'cod_payout' && result.pending_payout !== undefined && (
            <span>Pending payout Rs. {(result.pending_payout || 0).toLocaleString()} • {result.delivered_not_invoiced?.orders || 0} delivered orders not invoiced</span>
          )}
          {tool === 'tariff' && result.couriers !== undefined && (
            <span>{result.couriers.length} courier{result.couriers.length === 1 ? '' : 's'} • {result.found} slabs</span>
          )}
          {tool === 'courier_insights' && result.order_id !== undefined && (
            <span>Order #{result.order_id} — {result.status} — {result.courier}</span>
          )}
          {tool === 'courier_insights' && result.orders !== undefined && (
            <span>{result.returned_count} orders ({result.date_from} → {result.date_to})</span>
          )}
          {tool === 'courier_advisor' && (
            <span>
              {result.couriers?.length > 0
                ? `${result.origin_city} → ${result.destination_city}: ${result.couriers[0].courier_name} (${result.couriers[0].service}) ranks best`
                : `${result.origin_city} → ${result.destination_city}: not enough data to rank couriers`}
            </span>
          )}
        </div>
      )}

      {expanded && fullResult && (
        <div className="tool-card-detail">
          {tool === 'search_orders' && <SearchResultDetail data={fullResult} params={params} />}
          {tool === 'analyze_shipment' && <AnalysisDetail data={fullResult} onRecommend={onRecommend} />}
          {tool === 'generate_reply' && <ReplyDetail data={fullResult} />}
          {tool === 'generate_report' && <ReportDetail data={fullResult} />}
          {tool === 'create_escalation' && <EscalationDetail data={fullResult} />}
          {tool === 'detect_anomalies' && <AnomaliesDetail data={fullResult} />}
          {tool === 'recommend_action' && <ActionDetail data={fullResult} />}
          {tool === 'bulk_status_check' && <BulkStatusDetail data={fullResult} />}
          {tool === 'risk_assessment' && <RiskDetail data={fullResult} />}
          {tool === 'draft_notification' && <NotificationDetail data={fullResult} />}
          {tool === 'list_couriers' && <CouriersDetail data={fullResult} />}
          {tool === 'list_shipments' && <ShipmentsDetail data={fullResult} params={params} />}
          {tool === 'list_expenses' && <ExpensesDetail data={fullResult} />}
          {tool === 'list_invoices' && <InvoicesDetail data={fullResult} params={params} />}
          {tool === 'list_pickup_locations' && <PickupLocationsDetail data={fullResult} params={params} />}
          {tool === 'list_rules' && <RulesDetail data={fullResult} />}
          {tool === 'cod_payout' && <CodPayoutDetail data={fullResult} />}
          {tool === 'tariff' && <TariffDetail data={fullResult} />}
          {tool === 'courier_insights' && <CourierInsightsDetail data={fullResult} params={params} />}
          {tool === 'courier_advisor' && <CourierAdvisorDetail data={fullResult} />}
          {tool === 'compare_periods' && <PeriodComparisonDetail data={fullResult} />}
        </div>
      )}

      {blocked && <BlockedCard result={fullResult} />}

      {actionable && preview && (
        <ApprovalCard
          risk={risk}
          preview={preview}
          actionId={actionId}
          actionStatus={actionStatus}
          onAction={onAction}
          outcome={outcome}
        />
      )}

      {actionable && !preview && (
        <ActionButtons
          actionId={actionId}
          actionStatus={actionStatus}
          onAction={onAction}
          outcome={outcome}
        />
      )}
    </div>
  )
}

// A result card pages itself, in place, by re-running its own tool with a
// new offset — a real datatable, not "type 'next page' and wait for a new
// chat turn". Fetches go straight to a lightweight REST endpoint
// (/api/agent/tool-page), never back through the LLM: an offset change
// needs no model judgement, and routing it through chat would mean a full
// model call and a new bubble just to turn a page.
function usePagedTool(tool, baseParams, initialData) {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const initialParamsRef = useRef(baseParams || {})

  useEffect(() => { setData(initialData) }, [initialData])

  async function goToOffset(offset) {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/agent/tool-page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool, params: { ...initialParamsRef.current, offset } }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.detail || `Failed to load page (${res.status})`)
      if (json.error) throw new Error(json.error)
      setData(json)
    } catch (e) {
      setError(e.message || 'Failed to load page')
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, goToOffset }
}

// Prev/Next plus a small window of page numbers when the total is known
// (search_orders/list_shipments/list_invoices/list_pickup_locations all
// carry an exact count); courier_insights doesn't — its count would need
// the same expensive LATERAL-per-row scan pagination was built to avoid
// (see db/oms_live.py's list_courier_insights), so it only ever knows
// "is there a next page", shown as Prev / Page N / Next with no total.
function PageControls({ offset, limit, found, hasNext, loading, error, onGo }) {
  const safeLimit = limit || 1
  const page = Math.floor(offset / safeLimit) + 1
  const totalPages = found != null ? Math.max(1, Math.ceil(found / safeLimit)) : null
  const canPrev = offset > 0 && !loading
  const canNext = hasNext && !loading

  let pageNumbers = []
  if (totalPages != null) {
    const start = Math.max(1, page - 2)
    const end = Math.min(totalPages, page + 2)
    for (let p = start; p <= end; p++) pageNumbers.push(p)
  }

  return (
    <div className="page-controls">
      <button className="page-btn" disabled={!canPrev} onClick={() => onGo(Math.max(0, offset - safeLimit))}>‹ Prev</button>
      {totalPages != null ? (
        <>
          {pageNumbers[0] > 1 && (
            <>
              <button className="page-btn" disabled={loading} onClick={() => onGo(0)}>1</button>
              {pageNumbers[0] > 2 && <span className="page-ellipsis">…</span>}
            </>
          )}
          {pageNumbers.map(p => (
            <button key={p} disabled={loading} className={`page-btn${p === page ? ' page-btn-current' : ''}`}
              onClick={() => onGo((p - 1) * safeLimit)}>{p}</button>
          ))}
          {pageNumbers[pageNumbers.length - 1] < totalPages && (
            <>
              {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && <span className="page-ellipsis">…</span>}
              <button className="page-btn" disabled={loading} onClick={() => onGo((totalPages - 1) * safeLimit)}>{totalPages}</button>
            </>
          )}
        </>
      ) : (
        <span className="page-current-label">Page {page}</span>
      )}
      <button className="page-btn" disabled={!canNext} onClick={() => onGo(offset + safeLimit)}>Next ›</button>
      {loading && <span className="page-loading">Loading…</span>}
      {error && <span className="page-error">{error}</span>}
    </div>
  )
}

function SearchResultDetail({ data: initialData, params }) {
  const { data, loading, error, goToOffset } = usePagedTool('search_orders', params, initialData)
  const orders = data.orders || []
  const limit = params?.limit || data.returned_count || 50
  return (
    <div className="detail-content">
      <div className="detail-stat-row">
        <div className="detail-stat"><strong>{data.found}</strong> orders found</div>
        <div className="detail-stat">Rs. <strong>{(data.total_value || 0).toLocaleString()}</strong> total</div>
      </div>
      {orders.length > 0 && (
        <table className="detail-table">
          <thead>
            <tr><th>ID</th><th>Tracking #</th><th>Customer</th><th>Status</th><th>Courier</th><th>Amount</th></tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.order_id}>
                <td>#{o.order_id}</td>
                <td>{o.tracking_number || "—"}</td>
                <td>{o.customer_name}</td>
                <td><span className={`mini-badge status-${o.status.toLowerCase().replace(/\s+/g, '-')}`}>{o.status}</span></td>
                <td>{o.courier}</td>
                <td>Rs. {o.order_amount?.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {(data.found || 0) > limit && (
        <PageControls offset={data.offset || 0} limit={limit} found={data.found}
          hasNext={data.next_offset != null} loading={loading} error={error} onGo={goToOffset} />
      )}
    </div>
  )
}

function AnalysisDetail({ data, onRecommend }) {
  const o = data.order || {}
  const ageLabel = data.age_measure === 'turnaround_days' ? 'Turnaround' : 'Age'
  const origin = [o.origin_city, o.origin_province, o.origin_country].filter(Boolean).join(', ')
  const destination = [o.customer_city, o.destination_province, o.destination_country].filter(Boolean).join(', ')
  return (
    <div className="detail-content">
      <div className="detail-stat-row">
        <div className="detail-stat">Order <strong>#{o.order_id}</strong></div>
        <div className="detail-stat">{ageLabel}: <strong>{data.age_days != null ? `${data.age_days}d` : 'n/a'}</strong></div>
        <div className="detail-stat">Risk: <strong className={`risk-${data.risk_level?.toLowerCase()}`}>{data.risk_level}</strong> ({data.risk_score})</div>
      </div>
      <div className="detail-info-grid">
        <div><span className="detail-label">Tracking #:</span> {o.tracking_number || "—"}</div>
        <div><span className="detail-label">Order Date:</span> {o.order_date || "—"}</div>
        <div><span className="detail-label">Booking Date:</span> {o.booking_date ? o.booking_date.slice(0, 10) : "—"}</div>
        <div><span className="detail-label">Last Status:</span> {o.last_tracking_status || "—"}</div>
        <div><span className="detail-label">Last Status Date:</span> {o.last_tracking_date || "—"}</div>
        <div><span className="detail-label">Last DB Write:</span> {o.order_last_status_date || "—"} <span title="Timestamp of the last write to this row — fires on any update, not only a status change. Not a delivery date.">(not a delivery date)</span></div>
        <div><span className="detail-label">Customer:</span> {o.customer_name}</div>
        <div><span className="detail-label">Status:</span> {o.status}</div>
        <div><span className="detail-label">Courier:</span> {o.courier}</div>
        <div><span className="detail-label">Amount:</span> Rs. {o.order_amount?.toLocaleString()} ({o.payment_method})</div>
        <div><span className="detail-label">Attempts:</span> {o.delivery_attempts}</div>
        <div><span className="detail-label">Profit:</span> Rs. {data.profit?.toLocaleString() ?? "—"}</div>
        {origin && <div><span className="detail-label">Origin:</span> {origin}</div>}
        {destination && <div><span className="detail-label">Destination:</span> {destination}</div>}
        {o.invoice_no && <div><span className="detail-label">Invoice #:</span> {o.invoice_no}</div>}
        {o.invoice_no && <div><span className="detail-label">Invoice Date:</span> {o.invoice_date || "—"}</div>}
        {o.invoice_no && <div><span className="detail-label">Invoice Charges:</span> Rs. {o.invoice_charges?.toLocaleString() ?? "—"}</div>}
      </div>
      {o.item_names && (
        <div className="detail-chips-section">
          <span className="detail-label">Items{o.item_count != null ? ` (${o.item_count})` : ''}:</span>
          <div className="detail-items-text">{o.item_names}</div>
        </div>
      )}
      {data.tracking_timeline?.length > 0 && (
        <div className="detail-chips-section">
          <span className="detail-label">Tracking History:</span>
          <div className="tracking-timeline">
            {data.tracking_timeline.map((t, i) => (
              <div className="tracking-timeline-item" key={i}>
                <span className="tracking-timeline-date">{t.date}</span>
                <span className="tracking-timeline-status">{t.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
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
          <div className="recommendation-list">
            {data.recommendations.map((r, i) => {
              // Older results stored plain strings; those stay read-only.
              const rec = typeof r === 'string' ? { text: r, actionable: false } : r
              return (
                <div className="recommendation" key={i}>
                  <span className="recommendation-text">{rec.text}</span>
                  {rec.actionable && (
                    <button
                      className="recommendation-act"
                      onClick={() => onRecommend?.(rec)}
                    >
                      Act on this
                    </button>
                  )}
                </div>
              )
            })}
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

const rupees = (n) =>
  typeof n === 'number' ? `Rs. ${n.toLocaleString()}` : '—'

/** A figure with its label, used across the report views. */
function Stat({ label, value, tone }) {
  return (
    <div className={`report-stat ${tone || ''}`}>
      <span className="report-stat-value">{value}</span>
      <span className="report-stat-label">{label}</span>
    </div>
  )
}

/** Shared table for the reports that list orders (stuck, ndr). */
function OrderTable({ orders, total }) {
  if (!orders?.length) return null
  return (
    <>
      <table className="detail-table">
        <thead>
          <tr><th>Order</th><th>Customer</th><th>City</th><th>Courier</th>
            <th className="num">Amount</th><th className="num">Attempts</th></tr>
        </thead>
        <tbody>
          {orders.slice(0, 10).map(o => (
            <tr key={o.order_id}>
              <td><strong>{o.order_id}</strong></td>
              <td>{o.customer_name}</td>
              <td>{o.customer_city}</td>
              <td>{o.courier}</td>
              <td className="num">{rupees(o.order_amount)}</td>
              <td className="num">{o.delivery_attempts ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {total > 10 && (
        <div className="report-more">Showing 10 of {total}</div>
      )}
    </>
  )
}

/** A breakdown keyed by name, drawn as proportional bars. */
function BreakdownBars({ title, data }) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1])
  if (!entries.length) return null
  const max = entries[0][1] || 1
  return (
    <div className="report-breakdown">
      <div className="report-breakdown-title">{title}</div>
      {entries.map(([label, count]) => (
        <div className="report-bar-row" key={label}>
          <span className="report-bar-label">{label}</span>
          <span className="report-bar-track">
            <span className="report-bar-fill" style={{ width: `${(count / max) * 100}%` }} />
          </span>
          <span className="report-bar-count">{count}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * Renders a report by its type.
 *
 * Every type the tool can return has a view; the generic renderer at the
 * bottom is a safety net for a new report type, not the normal path — a
 * reader should never be handed raw JSON to interpret.
 */
function ReportDetail({ data }) {
  const type = data.report_type

  if (type === 'daily') {
    return (
      <div className="detail-content">
        <div className="report-stats">
          <Stat label="Total orders" value={data.total_orders} />
          <Stat label={`Delivered (${data.delivery_rate}%)`} value={data.delivered} tone="good" />
          <Stat label={`Returns (${data.return_rate}%)`} value={data.returns} tone="bad" />
          <Stat label="Revenue" value={rupees(data.revenue)} />
        </div>
        <div className="report-stats">
          <Stat label="Stuck" value={data.stuck} tone="warn" />
          <Stat label="In transit" value={data.in_transit} />
          <Stat label="On route" value={data.on_route} />
          <Stat label="NDR cases" value={data.ndr_cases} tone="warn" />
        </div>
      </div>
    )
  }

  if (type === 'profit') {
    const months = Object.entries(data.monthly_breakdown || {})
    const loss = (data.total_profit ?? 0) < 0
    return (
      <div className="detail-content">
        <p>{data.error || data.data_limits?.join(' ')}</p>
        <div className="report-stats">
          <Stat label="Delivered order value" value={rupees(data.total_revenue)} />
          <Stat label={loss ? 'Order loss' : 'Order margin'} value={rupees(data.total_profit)}
                tone={loss ? 'bad' : 'good'} />
          <Stat label="Margin" value={data.profit_margin == null ? 'Unavailable' : `${data.profit_margin}%`} tone={loss ? 'bad' : 'good'} />
        </div>
        <table className="detail-table">
          <thead>
            <tr><th>Month</th><th className="num">Orders</th><th className="num">Order value</th>
              <th className="num">Costs</th><th className="num">Order margin</th></tr>
          </thead>
          <tbody>
            {months.map(([month, m]) => (
              <tr key={month}>
                <td><strong>{month}</strong></td>
                <td className="num">{m.order_count}</td>
                <td className="num">{rupees(m.revenue)}</td>
                <td className="num">{rupees((m.product_cost || 0) + (m.shipping_cost || 0))}</td>
                <td className={`num ${m.profit < 0 ? 'is-bad' : 'is-good'}`}>
                  {rupees(m.profit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (type === 'courier' && data.couriers) {
    const rows = Object.entries(data.couriers).sort((a, b) => b[1].total - a[1].total)
    return (
      <div className="detail-content">
        <div>Period: {data.period}</div>
        <div>{data.ranking_note}</div>
        {!!data.unassigned_orders && <div>{data.unassigned_orders} unassigned orders excluded from courier comparison.</div>}
        {!!data.observed_leaders?.length && <div>Observed leader(s): {data.observed_leaders.join(", ")}</div>}
        <table className="detail-table">
          <thead>
            <tr><th>Courier</th><th className="num">Total</th><th className="num">Delivered</th>
              <th className="num">Returned</th><th className="num">Delivered / total</th><th>Completed</th><th>Completion %</th><th>Sample eligible</th></tr>
          </thead>
          <tbody>
            {rows.map(([courier, s]) => (
              <tr key={courier}>
                <td><strong>{courier}</strong></td>
                <td className="num">{s.total}</td>
                <td className="num">{s.delivered}</td>
                <td className="num">{s.returned}</td>
                <td className={`num ${s.delivery_rate >= 50 ? 'is-good' : 'is-bad'}`}>
                  {s.delivery_rate}%
                </td><td>{s.completed_outcomes}</td><td>{s.completion_rate}%</td><td>{s.sample_eligible ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (type === 'cod') {
    return (
      <div className="detail-content">
        <p>{data.data_limits?.join(' ')}</p>
        <div className="report-stats">
          <Stat label="COD orders" value={data.total_cod_orders} />
          <Stat label="Total value" value={rupees(data.total_cod_value)} />
          <Stat label="Collected" value={rupees(data.collected)} tone="good" />
          <Stat label="Pending delivery" value={rupees(data.pending_delivery_amount)} tone="warn" />
          <Stat label="Delivered order value" value={rupees(data.delivered_order_value)} />
          <Stat label="Returned order value" value={rupees(data.returned_order_value)} />
          <Stat label="Cancelled order value" value={rupees(data.cancelled_order_value)} />
          <Stat label="Collection rate" value={data.collection_rate == null ? 'Unavailable' : `${data.collection_rate}%`} />
        </div>
      </div>
    )
  }

  if (type === 'returns') {
    return (
      <div className="detail-content">
        <div className="report-stats">
          <Stat label="Returns" value={data.total_returns} tone="bad" />
          <Stat label="Value returned" value={rupees(data.total_value)} tone="bad" />
        </div>
        <BreakdownBars title="By reason" data={data.by_reason} />
        <BreakdownBars title="By courier" data={data.by_courier} />
      </div>
    )
  }

  if (type === 'stuck') {
    return (
      <div className="detail-content">
        <div className="report-stats">
          <Stat label="Stuck orders" value={data.total_stuck} tone="warn" />
          <Stat label="Critical" value={data.critical} tone="bad" />
        </div>
        <OrderTable orders={data.orders} total={data.total_stuck} />
      </div>
    )
  }

  if (type === 'ndr') {
    return (
      <div className="detail-content">
        <div className="report-stats">
          <Stat label="NDR cases" value={data.total_ndr} tone="bad" />
          <Stat label="Avg attempts" value={data.avg_attempts} tone="warn" />
        </div>
        <OrderTable orders={data.orders} total={data.total_ndr} />
      </div>
    )
  }

  if (type === 'daily_activity') {
    const daily = data.daily || []
    return (
      <div className="detail-content">
        <div>Period: {data.period} ({data.date_from} → {data.date_to})</div>
        <div className="report-stats">
          <Stat label="New orders" value={data.new_orders} />
          <Stat label="Booked orders" value={data.booked_orders} />
          <Stat label="Arrived orders" value={data.arrived_orders} />
          <Stat label="Failed attempts" value={data.failed_attempt_orders} tone="warn" />
        </div>
        <div className="report-stats">
          <Stat label="Delivered orders" value={data.delivered_orders} tone="good" />
          <Stat label="Returned orders" value={data.returned_orders} tone="bad" />
          <Stat label="Cancelled orders" value={data.cancelled_orders} tone="bad" />
          <Stat label="Settled orders" value={data.settled_orders} tone="good" />
        </div>
        {data.settled_value != null && (
          <div className="report-stats">
            <Stat label="Settled value" value={rupees(data.settled_value)} tone="good" />
          </div>
        )}
        {daily.length > 0 && (
          <div className="detail-table-scroll">
            <table className="detail-table">
              <thead>
                <tr>
                  <th>Date</th><th>Day</th>
                  <th className="num">New</th><th className="num">Booked</th>
                  <th className="num">Arrived</th><th className="num">Failed</th>
                  <th className="num">Delivered</th><th className="num">Returned</th>
                  <th className="num">Cancelled</th><th className="num">Settled</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((d) => (
                  <tr key={d.date}>
                    <td>{d.date}</td><td>{d.day_name}</td>
                    <td className="num">{d.new}</td><td className="num">{d.booked}</td>
                    <td className="num">{d.arrived}</td><td className="num">{d.failed}</td>
                    <td className="num">{d.delivered}</td><td className="num">{d.returned}</td>
                    <td className="num">{d.cancelled}</td><td className="num">{d.settled}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data.data_limits?.length > 0 && (
          <div className="detail-note">{data.data_limits.join(' ')}</div>
        )}
      </div>
    )
  }

  return <GenericDetail data={data} />
}

/**
 * Last-resort renderer for a result with no view of its own. Still reads as
 * a summary rather than as JSON: figures become stats, lists become tables.
 */
function GenericDetail({ data }) {
  const entries = Object.entries(data || {}).filter(([k]) => k !== 'report_type')
  const scalars = entries.filter(([, v]) => typeof v !== 'object' || v === null)
  const tables = entries.filter(([, v]) => Array.isArray(v) && v.length && typeof v[0] === 'object')
  const maps = entries.filter(([, v]) => v && !Array.isArray(v) && typeof v === 'object')

  const pretty = (key) => key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())

  return (
    <div className="detail-content">
      {scalars.length > 0 && (
        <div className="report-stats">
          {scalars.map(([k, v]) => (
            <Stat key={k} label={pretty(k)}
                  value={typeof v === 'number' && /value|revenue|amount|cost|profit/.test(k)
                    ? rupees(v) : String(v)} />
          ))}
        </div>
      )}
      {maps.map(([k, v]) => (
        <BreakdownBars key={k} title={pretty(k)} data={v} />
      ))}
      {tables.map(([k, rows]) => (
        <div key={k}>
          <div className="report-breakdown-title">{pretty(k)}</div>
          <table className="detail-table">
            <thead>
              <tr>{Object.keys(rows[0]).slice(0, 5).map(col => (
                <th key={col}>{pretty(col)}</th>
              ))}</tr>
            </thead>
            <tbody>
              {rows.slice(0, 10).map((row, i) => (
                <tr key={i}>
                  {Object.keys(rows[0]).slice(0, 5).map(col => (
                    <td key={col}>{String(row[col] ?? '—')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 10 && <div className="report-more">Showing 10 of {rows.length}</div>}
        </div>
      ))}
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

function CouriersDetail({ data }) {
  const couriers = data.couriers || []
  return (
    <div className="detail-content">
      <div className="detail-stat-row">
        <div className="detail-stat">Total Couriers: <strong>{data.total_couriers}</strong></div>
      </div>
      <div className="detail-chips-section">
        <div className="detail-chips">
          {couriers.map((c, i) => <span key={i} className="detail-chip">{c}</span>)}
        </div>
      </div>
    </div>
  )
}

function ShipmentsDetail({ data: initialData, params }) {
  const { data, loading, error, goToOffset } = usePagedTool('list_shipments', params, initialData)
  const byCourier = data.by_courier || {}
  const sorted = Object.entries(byCourier).sort((a, b) => b[1] - a[1])
  const items = data.shipments || []
  const limit = params?.limit || data.returned_count || 50
  return (
    <div className="detail-content">
      <div className="detail-stat-row">
        <div className="detail-stat">Total Shipments: <strong>{data.total_shipments}</strong></div>
        <div className="detail-stat">Total Value: <strong>Rs. {(data.total_value || 0).toLocaleString()}</strong></div>
      </div>
      <table className="detail-table">
        <thead><tr><th>Courier</th><th>Count</th></tr></thead>
        <tbody>
          {sorted.map(([name, count]) => (
            <tr key={name}><td><strong>{name}</strong></td><td>{count}</td></tr>
          ))}
        </tbody>
      </table>
      {items.length > 0 && (
        <table className="detail-table">
          <thead>
            <tr><th>Order #</th><th>Tracking #</th><th>Customer</th><th>City</th><th>Status</th><th>Courier</th><th>Amount</th></tr>
          </thead>
          <tbody>
            {items.map(s => (
              <tr key={s.order_id}>
                <td>#{s.order_id}</td>
                <td>{s.tracking_number}</td>
                <td>{s.customer_name}</td>
                <td>{s.city}</td>
                <td>{s.status}</td>
                <td>{s.courier}</td>
                <td>Rs. {s.amount?.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {(data.total_shipments || 0) > limit && (
        <PageControls offset={data.offset || 0} limit={limit} found={data.total_shipments}
          hasNext={data.next_offset != null} loading={loading} error={error} onGo={goToOffset} />
      )}
    </div>
  )
}

function PeriodComparisonDetail({ data }) {
  if (!data.current || !data.baseline) return null
  const value = n => n == null ? 'Unavailable' : n.toLocaleString()
  return <div className="detail-content">
    <div>{data.domain} · {data.source}</div>
    <div>{data.current.period.from} → {data.current.period.to} ({data.current.period.days} days)</div>
    <div>Baseline: {data.baseline.period.from} → {data.baseline.period.to} ({data.baseline.period.days} days)</div>
    <table className="detail-table">
      <thead><tr><th>Metric</th><th>Current</th><th>Baseline</th><th>Difference</th><th>Change %</th></tr></thead>
      <tbody>{Object.entries(data.current.metrics).map(([key, amount]) => <tr key={key}>
        <td>{key.replaceAll('_', ' ')}{['order_value', 'configured_fixed_amount'].includes(key) ? ' (PKR)' : ''}</td>
        <td>{value(amount)}</td><td>{value(data.baseline.metrics[key])}</td>
        <td>{value(data.changes[key]?.difference)}</td><td>{data.changes[key]?.percent_change == null ? 'N/A' : `${data.changes[key].percent_change}%`}</td>
      </tr>)}</tbody>
    </table>
    {(!data.current.complete || !data.baseline.complete) && <div role="note">Incomplete data: some records could not be included. These totals are partial.</div>}
    {data.current.note && <div>{data.current.note}</div>}
    <div>{data.comparison_note}</div>
  </div>
}

function ExpensesDetail({ data }) {
  const byCategory = data.by_category || {}
  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1])
  const items = data.expenses || []
  return (
    <div className="detail-content">
      <div className="detail-stat-row">
        <div className="detail-stat">Total Expenses: <strong>{data.total_expenses}</strong></div>
        <div className="detail-stat">Configured Fixed Amounts: <strong>Rs. {(data.total_amount || 0).toLocaleString()}</strong></div>
      </div>
      {data.period && <div>Period: {data.period.label}{data.period.from ? ` (${data.period.from} → ${data.period.to})` : ''}</div>}
      {data.amount_basis && <div className="detail-note">{data.amount_basis}</div>}
      {!!data.excluded_records?.length && <div role="note">{data.excluded_records.length} records excluded from the fixed total because their data is incomplete or unsupported.</div>}
      <table className="detail-table">
        <thead><tr><th>Category</th><th>Amount</th></tr></thead>
        <tbody>
          {sorted.map(([name, amount]) => (
            <tr key={name}><td><strong>{name}</strong></td><td>Rs. {amount.toLocaleString()}</td></tr>
          ))}
        </tbody>
      </table>
      {items.length > 0 && (
        <table className="detail-table">
          <thead>
            <tr><th>Title</th><th>Category</th><th>Amount / Rate</th><th>Cost Type</th><th>Period</th></tr>
          </thead>
          <tbody>
            {items.map((e, i) => (
              <tr key={i}>
                <td>{e.title}</td>
                <td>{e.category}</td>
                <td>Rs. {e.amount?.toLocaleString()}</td>
                <td>{e.cost_type}</td>
                <td>{e.start_date} → {e.end_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function InvoicesDetail({ data: initialData, params }) {
  // Two shapes share this card: a single invoice's full detail (has
  // invoice_id + orders), or a list of invoices (has found + invoices).
  // Only the list shape pages; a single invoice has nothing to page
  // through — but the hook is still called unconditionally (Rules of
  // Hooks), it just never gets used for the single-invoice shape.
  const { data, loading, error, goToOffset } = usePagedTool('list_invoices', params, initialData)
  const limit = params?.limit || data.returned_count || 20

  if (data.invoice_id !== undefined) {
    const orders = data.orders || []
    return (
      <div className="detail-content">
        <div className="detail-stat-row">
          <div className="detail-stat">Invoice <strong>{data.invoice_name}</strong> (#{data.invoice_id})</div>
          <div className="detail-stat">Status: <strong className={data.payment_status === 'Paid' ? 'risk-low' : 'risk-high'}>{data.payment_status}</strong></div>
          <div className="detail-stat">Created: <strong>{(data.created_at || '').slice(0, 10) || '—'}</strong></div>
        </div>
        <div className="detail-info-grid">
          <div><span className="detail-label">Orders on Invoice:</span> {data.order_count}</div>
          <div><span className="detail-label">Total Order Value:</span> Rs. {(data.total_order_amount || 0).toLocaleString()}</div>
          <div><span className="detail-label">Total Charges:</span> Rs. {(data.total_charges || 0).toLocaleString()}</div>
          <div><span className="detail-label">Total Net Amount:</span> Rs. {(data.total_net_amount || 0).toLocaleString()}</div>
        </div>
        {orders.length > 0 && (
          <table className="detail-table">
            <thead>
              <tr><th>Order #</th><th>Tracking #</th><th>Amount</th><th>Weight</th><th>Charges</th><th>Net Amount</th></tr>
            </thead>
            <tbody>
              {orders.map((o, i) => (
                <tr key={i}>
                  <td>#{o.order_id}</td>
                  <td>{o.tracking_number || "—"}</td>
                  <td>Rs. {(o.order_amount || 0).toLocaleString()}</td>
                  <td>{o.weight ?? "—"}</td>
                  <td>Rs. {(o.charges || 0).toLocaleString()}</td>
                  <td>{o.net_amount != null ? `Rs. ${o.net_amount.toLocaleString()}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    )
  }

  const invoices = data.invoices || []
  return (
    <div className="detail-content">
      <div className="detail-stat-row">
        <div className="detail-stat">Found: <strong>{data.found}</strong></div>
      </div>
      <table className="detail-table">
        <thead>
          <tr><th>Invoice</th><th>Status</th><th>Created</th><th>Orders</th><th>Order Value</th><th>Charges</th></tr>
        </thead>
        <tbody>
          {invoices.map((inv, i) => (
            <tr key={i}>
              <td>{inv.invoice_name} (#{inv.invoice_id})</td>
              <td><span className={inv.payment_status === 'Paid' ? 'risk-low' : 'risk-high'}>{inv.payment_status}</span></td>
              <td>{(inv.created_at || '').slice(0, 10)}</td>
              <td>{inv.order_count}</td>
              <td>Rs. {(inv.total_order_amount || 0).toLocaleString()}</td>
              <td>Rs. {(inv.total_charges || 0).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {(data.found || 0) > limit && (
        <PageControls offset={data.offset || 0} limit={limit} found={data.found}
          hasNext={data.next_offset != null} loading={loading} error={error} onGo={goToOffset} />
      )}
    </div>
  )
}

function PickupLocationsDetail({ data: initialData, params }) {
  const { data, loading, error, goToOffset } = usePagedTool('list_pickup_locations', params, initialData)
  const locations = data.pickup_locations || []
  const limit = params?.limit || data.returned_count || 50
  return (
    <div className="detail-content">
      <div className="detail-stat-row">
        <div className="detail-stat">Found: <strong>{data.found}</strong></div>
      </div>
      <table className="detail-table">
        <thead>
          <tr><th>Name</th><th>City</th><th>Contact</th><th>Phone</th><th>Email</th><th>Courier</th><th>Status</th></tr>
        </thead>
        <tbody>
          {locations.map((p, i) => (
            <tr key={i}>
              <td>{p.name}</td>
              <td>{p.city}</td>
              <td>{p.contact_person}</td>
              <td>{p.phone}</td>
              <td>{p.email}</td>
              <td>{p.courier}</td>
              <td><span className={p.status === 'active' ? 'risk-low' : 'risk-high'}>{p.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      {(data.found || 0) > limit && (
        <PageControls offset={data.offset || 0} limit={limit} found={data.found}
          hasNext={data.next_offset != null} loading={loading} error={error} onGo={goToOffset} />
      )}
    </div>
  )
}

function TariffCourier({ courier, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  const [region, setRegion] = useState('')
  const pkr = (n) => `PKR ${Number(n || 0).toFixed(2)}`
  const since = courier.since
    ? new Date(courier.since).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : null
  const slabs = region ? courier.slabs.filter((s) => s.region === region) : courier.slabs
  return (
    <div className="tariff-courier">
      <button type="button" className="tariff-head" onClick={() => setOpen(!open)}>
        <div className="tariff-title">
          <div className="ci-bold">{courier.courier}</div>
          <div className="rule-sub">
            {since ? `Active since ${since} • ` : ''}{courier.slab_count} slabs
          </div>
        </div>
        <span className={`ci-badge ${courier.status === 'active' ? 'ci-badge-green' : 'ci-badge-red'}`}>
          {String(courier.status).toUpperCase()}
        </span>
        <span className="tariff-chevron">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="tariff-body">
          <div className="tariff-chips">
            <button type="button" className={`tariff-chip ${region === '' ? 'on' : ''}`} onClick={() => setRegion('')}>All regions</button>
            {courier.regions.map((r) => (
              <button type="button" key={r} className={`tariff-chip ${region === r ? 'on' : ''}`} onClick={() => setRegion(r)}>{r}</button>
            ))}
          </div>
          <div className="detail-table-scroll rules-scroll">
            <table className="detail-table">
              <thead>
                <tr>
                  <th>Weight</th><th>Region</th><th>Service</th><th>Charges</th><th>Additional</th>
                </tr>
              </thead>
              <tbody>
                {slabs.map((s, i) => (
                  <tr key={i}>
                    <td className="ci-bold">{s.start_weight} – {s.end_weight} kg</td>
                    <td>{s.region}</td>
                    <td style={{ textTransform: 'capitalize' }}>{s.service}</td>
                    <td className="ci-bold">{pkr(s.charges)}</td>
                    <td>
                      {s.additional_charges > 0
                        ? <>{pkr(s.additional_charges)} <span className="rule-sub">per {s.additional_weight} kg</span></>
                        : <span className="rule-sub">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function TariffDetail({ data }) {
  const couriers = data.couriers || []
  return (
    <div className="detail-content">
      <div className="detail-stat-row">
        <div className="detail-stat">Couriers: <strong>{couriers.length}</strong></div>
        <div className="detail-stat">Slabs: <strong>{data.found}</strong></div>
        <div className="detail-stat">Currency: <strong>{data.currency || 'PKR'}</strong></div>
      </div>
      {couriers.map((c, i) => (
        <TariffCourier key={c.courier} courier={c} defaultOpen={couriers.length === 1 || i === 0} />
      ))}
    </div>
  )
}

function CodPayoutDetail({ data }) {
  const rs = (n) => `Rs. ${(n || 0).toLocaleString()}`
  const rows = [
    ['Paid', 'Invoice paid', data.paid, 'ci-badge-green'],
    ['Invoiced, unpaid', 'Invoice raised, payment pending', data.invoiced_unpaid, 'ci-badge-red'],
    ['Delivered, not invoiced', 'Delivered, invoice not raised yet', data.delivered_not_invoiced, 'ci-badge-red'],
    ['In transit', 'Not delivered yet — not owed yet', data.in_transit, 'ci-badge-purple'],
  ]
  const months = Object.entries(data.delivered_not_invoiced?.by_month || {})
  return (
    <div className="detail-content">
      <div className="detail-stat-row">
        <div className="detail-stat">Pending payout: <strong>{rs(data.pending_payout)}</strong></div>
        <div className="detail-stat">Unpaid invoices: <strong>{(data.invoiced_unpaid?.invoice_names || []).join(', ') || '—'}</strong></div>
      </div>
      <table className="detail-table">
        <thead>
          <tr><th>Bucket</th><th>Orders</th><th>COD Amount</th><th>Charges</th><th>Net</th><th>Oldest (days)</th></tr>
        </thead>
        <tbody>
          {rows.map(([label, hint, b, badge]) => (
            <tr key={label}>
              <td><span className={`ci-badge ${badge}`}>{label}</span><div className="rule-sub">{hint}</div></td>
              <td>{b?.orders ?? 0}</td>
              <td>{rs(b?.amount)}</td>
              <td>{b?.charges != null ? rs(b.charges) : '—'}</td>
              <td>{b?.net != null ? rs(b.net) : '—'}</td>
              <td>{b?.oldest_days ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {months.length > 0 && (
        <>
          <div className="detail-label" style={{ marginTop: 12 }}>Delivered, not invoiced — by month</div>
          <table className="detail-table">
            <thead><tr><th>Month</th><th>Orders</th><th>COD Amount</th></tr></thead>
            <tbody>
              {months.map(([m, v]) => (
                <tr key={m}><td>{m}</td><td>{v.orders}</td><td>{rs(v.amount)}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      <div className="rule-sub" style={{ marginTop: 8 }}>{data.note}</div>
    </div>
  )
}

function RulesDetail({ data }) {
  // A handful of rules per account, returned whole by list_rules — no paging.
  const rules = data.rules || []
  const cond = (c) => {
    const rows = []
    if (c.weight) rows.push(['Weight', `${c.weight.operator} | ${c.weight.value_kg} KG`])
    if (c.order_amount) rows.push(['Order Amount', `${c.order_amount.operator} | ${c.order_amount.value}`])
    if (c.address_keywords) rows.push(['Address Keywords', `${c.address_keywords.operator || 'match'} | ${c.address_keywords.keywords}`])
    if (c.payment_method) rows.push(['Payment Method', c.payment_method])
    if (c.cities) rows.push(['Cities', c.cities])
    if (c.platform) rows.push(['Platform', c.platform])
    return rows
  }
  return (
    <div className="detail-content">
      <div className="detail-stat-row">
        <div className="detail-stat">Total Rules: <strong>{data.found}</strong></div>
        <div className="detail-stat">Active: <strong>{data.active}</strong></div>
        <div className="detail-stat">Inactive: <strong>{data.inactive}</strong></div>
      </div>
      <div className="detail-table-scroll rules-scroll">
        <table className="detail-table rules-table">
          <thead>
            <tr><th>Rule Title</th><th>If Trigger</th><th>Condition</th><th>Then</th><th>Status</th></tr>
          </thead>
          <tbody>
            {rules.map((r) => {
              const rows = cond(r.conditions || {})
              return (
                <tr key={r.rule_id}>
                  <td className="ci-bold">{r.title}</td>
                  <td>{(r.trigger || []).map((t) => (
                    <span key={t} className="ci-badge ci-badge-purple rule-trigger">{t.toUpperCase()}</span>
                  ))}</td>
                  <td>
                    {rows.length === 0
                      ? <div className="rule-sub">No conditions</div>
                      : rows.map(([k, v]) => (
                        <div key={k}><span className="ci-bold">{k}</span> <span className="rule-sub">| {v}</span></div>
                      ))}
                  </td>
                  <td>
                    <div className="ci-bold">{r.action?.courier_account || r.action?.courier}</div>
                    {r.action?.courier && <div className="rule-sub">{r.action.courier}</div>}
                    {r.action?.service && <div className="rule-sub">Service: {r.action.service}</div>}
                    {r.action?.pickup_location && <div className="rule-sub">Pickup: {r.action.pickup_location}</div>}
                  </td>
                  <td>
                    <span className={`ci-badge ${r.status === 'active' ? 'ci-badge-green' : 'ci-badge-red'}`}>
                      {r.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CourierInsightCard({ o }) {
  const isDelivered = o.status === 'Delivered'
  return (
    <div className={`ci-card${isDelivered ? ' ci-card-delivered' : ''}`}>
      <div className="ci-col">
        <div className="ci-col-header">Order ID &amp; Date</div>
        <div className="ci-order-id">#{o.order_id}</div>
        <div>Order Date: {o.order_date || "—"}</div>
        <div>Booking Date: {o.booking_date || "—"}</div>
        <div>Web Order ID: {o.web_order_id || "—"}</div>
      </div>
      <div className="ci-col">
        <div className="ci-col-header">Customer Details</div>
        <div className="ci-bold">{o.consignee_name}</div>
        <div>Contact: {o.contact || "—"}</div>
        <div>Origin: {o.origin_city || "—"}</div>
        <div>Destination: {o.destination_city || "—"}</div>
      </div>
      <div className="ci-col">
        <div className="ci-col-header">Courier Details</div>
        <div className="ci-bold">{o.courier || "Unassigned"}</div>
        {o.preferred_courier_account_title && <div>Account: {o.preferred_courier_account_title}</div>}
        <div>CN: {o.tracking_number || "—"}</div>
        <div>Net Payable: {o.net_payable != null ? o.net_payable.toLocaleString() : "—"}</div>
        <div>Charges: {o.settlement_or_invoice_charges != null ? o.settlement_or_invoice_charges.toLocaleString() : "—"}</div>
        <div>Invoice No: {o.settlement_or_invoice_reference || "—"}</div>
        <div>Invoice Date: {o.settlement_or_invoice_date || "—"}</div>
      </div>
      <div className="ci-col">
        <div className="ci-col-header">Shipment Details</div>
        <div>Payment Type: {o.payment_method}</div>
        <div>Amount: {o.order_amount?.toLocaleString()}</div>
        <div>Quantity: {o.quantity}</div>
        <div>Weight: {o.weight ?? "—"}</div>
        <div>Arrival: {o.arrival_weight ?? "—"}</div>
        <span className={`ci-badge ${o.payment_status === 'Paid' ? 'ci-badge-green' : 'ci-badge-red'}`}>{o.payment_status?.toUpperCase()}</span>
      </div>
      <div className="ci-col">
        <div className="ci-col-header">Status &amp; Action</div>
        <span className="ci-badge ci-badge-green">{o.status?.toUpperCase()}</span>
        <div>Days: {o.delivery_days ?? "—"} Days</div>
        <div>Last Mile: {o.delivered_date || "—"}</div>
        {o.tags && <span className="ci-badge ci-badge-purple">{o.tags.toUpperCase()}</span>}
      </div>
    </div>
  )
}

function CourierInsightsDetail({ data: initialData, params }) {
  // Two shapes: a single order's full record (has order_id at top level),
  // or a list of orders (has an "orders" array). The hook is still called
  // unconditionally (Rules of Hooks); it's just unused for the single-order
  // shape. courier_insights carries no exact total (an accurate count would
  // need the same expensive per-row scan its own list query avoids — see
  // db/oms_live.py), so PageControls here only ever knows "is there a next
  // page", not "page N of M".
  const { data, loading, error, goToOffset } = usePagedTool('courier_insights', params, initialData)

  if (data.order_id !== undefined) {
    return (
      <div className="detail-content">
        <CourierInsightCard o={data} />
      </div>
    )
  }

  const orders = data.orders || []
  const limit = params?.limit || data.returned_count || 100
  return (
    <div className="detail-content">
      <div className="detail-stat-row">
        <div className="detail-stat">Returned: <strong>{data.returned_count}</strong></div>
        <div className="detail-stat">Period: <strong>{data.date_from} → {data.date_to}</strong></div>
      </div>
      <div className="ci-card-list">
        {orders.map((o, i) => <CourierInsightCard o={o} key={i} />)}
      </div>
      {((data.offset || 0) > 0 || data.next_offset != null) && (
        <PageControls offset={data.offset || 0} limit={limit} found={null}
          hasNext={data.next_offset != null} loading={loading} error={error} onGo={goToOffset} />
      )}
    </div>
  )
}

const CA_BADGE_STYLE = {
  'Best Overall': { className: 'ca-badge-gold', icon: '🏆' },
  'High Delay Risk': { className: 'ca-badge-red', icon: '⚠️' },
  'Reliable, But Delays Often': { className: 'ca-badge-amber', icon: '⚠️' },
}

function CourierAdvisorCard({ c, rank }) {
  const badge = c.badge ? CA_BADGE_STYLE[c.badge] : null
  const borderClass = c.badge === 'Best Overall' ? 'ca-card-gold'
    : badge ? 'ca-card-risk' : ''
  return (
    <div className={`ca-card ${borderClass}`}>
      <div className="ca-card-head">
        <div className="ca-card-title">#{rank} {c.courier_name}</div>
        {badge && (
          <span className={`ca-badge ${badge.className}`}>{badge.icon} {c.badge}</span>
        )}
      </div>
      <span className="ca-service-chip">SERVICE: {c.service?.toUpperCase()}</span>
      <div className="ca-stat-row">
        <div className="ca-stat">
          <div className="ca-stat-label">Delivery Ratio</div>
          <div className={`ca-stat-value ${c.delivery_ratio >= 85 ? 'is-good' : 'is-warn'}`}>{c.delivery_ratio}%</div>
        </div>
        <div className="ca-stat">
          <div className="ca-stat-label">Target Delivery Time</div>
          <div className="ca-stat-value">{c.target_delivery_time}</div>
        </div>
        <div className="ca-stat">
          <div className="ca-stat-label">Delay Risk</div>
          <div className="ca-stat-value">{c.delay_risk}%</div>
        </div>
      </div>
    </div>
  )
}

function CourierAdvisorDetail({ data }) {
  if (data.error) return <div className="detail-content"><p>{data.error}</p></div>
  const couriers = data.couriers || []
  return (
    <div className="detail-content">
      <div>{data.origin_city} → {data.destination_city} · last {data.window_days} days</div>
      {couriers.length === 0 ? (
        <p>{data.message || 'Not enough recent shipping history to rank couriers on this route yet.'}</p>
      ) : (
        <div className="ca-card-list">
          {couriers.map((c, i) => <CourierAdvisorCard c={c} rank={i + 1} key={i} />)}
        </div>
      )}
      {data.data_limits?.length > 0 && (
        <div className="detail-note">{data.data_limits.join(' ')}</div>
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
  const { account, signOut } = useAuth()
  const [authRole, setAuthRole] = useState(null)
  const [conversationId, setConversationId] = useState(null)
  const [sidebarClosed, setSidebarClosed] = useState(false)
  const [historyToken, setHistoryToken] = useState(0)
  const conversationRef = useRef(null)
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [speakingIdx, setSpeakingIdx] = useState(null)
  const recorderRef = useRef(null)
  const speechRef = useRef(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [thinkingSteps, setThinkingSteps] = useState([])
  const [currentTools, setCurrentTools] = useState([])
  const [expandedTools, setExpandedTools] = useState({})
  const [actionStatuses, setActionStatuses] = useState({})
  const [actionOutcomes, setActionOutcomes] = useState({})
  const [showActionLog, setShowActionLog] = useState(false)
  const [actionLog, setActionLog] = useState([])
  const [retryingAction, setRetryingAction] = useState(null)
  const [retryError, setRetryError] = useState(null)
  const [chainPlan, setChainPlan] = useState(null)
  const [chainStep, setChainStep] = useState(0)
  const [autonomousMode, setAutonomousMode] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [alertCount, setAlertCount] = useState(0)
  const [showAlerts, setShowAlerts] = useState(false)
  const [memoryContext, setMemoryContext] = useState([])
  const [streamingText, setStreamingText] = useState('')
  // The model picker next to the composer. Persisted per browser so it
  // survives a refresh — re-picking Claude every time would defeat the
  // point of a selector. `null` means "use the server's configured
  // default" rather than sending an explicit choice.
  const [modelChoices, setModelChoices] = useState([])
  const [selectedModel, setSelectedModel] = useState(() => {
    try {
      const saved = localStorage.getItem('orio_llm_choice')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [showModelPicker, setShowModelPicker] = useState(false)
  // Cards on the empty chat, built from this account's own numbers. Absent
  // until loaded (or if it fails) — the static examples then stay.
  const [starters, setStarters] = useState(null)
  // Per-answer thumbs rating ({[msgIdx]: {rating, reason}}) and which
  // answer was just copied. Kept in memory: the rating itself is stored
  // server-side, this only drives the buttons' highlight.
  const [feedbackByMsg, setFeedbackByMsg] = useState({})
  const [copiedIdx, setCopiedIdx] = useState(null)
  const autonomousRef = useRef(null)
  const wsRef = useRef(null)
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)
  const currentToolsRef = useRef([])
  const thinkingStepsRef = useRef([])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinkingSteps, currentTools, streamingText])

  // The server answers with whatever is ready and says `loading` while the
  // slower figures finish in the background; one re-ask a few seconds later
  // picks them up without making the first paint wait.
  useEffect(() => {
    let cancelled = false
    let retry = null
    const load = (again) => {
      fetch(`${API_BASE}/api/agent/starters`)
        .then(r => (r.ok ? r.json() : null))
        .then(d => {
          if (cancelled) return
          setStarters(d && d.cards && d.cards.length ? d.cards : null)
          if (d && d.loading && again) retry = setTimeout(() => load(false), 7000)
        })
        .catch(() => { if (!cancelled) setStarters(null) })
    }
    load(true)
    return () => { cancelled = true; clearTimeout(retry) }
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/api/models`)
      .then(r => r.json())
      .then(d => setModelChoices(d.choices || []))
      .catch(() => setModelChoices([]))
  }, [])

  // Keep the composer focused so the user can keep typing without clicking
  // back into it — on load, and whenever it re-enables after a send.
  useEffect(() => {
    if (!isProcessing) inputRef.current?.focus()
  }, [isProcessing])

  const selectModel = (choice) => {
    setSelectedModel(choice)
    setShowModelPicker(false)
    try {
      if (choice) localStorage.setItem('orio_llm_choice', JSON.stringify(choice))
      else localStorage.removeItem('orio_llm_choice')
    } catch { /* private browsing, etc — the picker still works this session */ }
  }

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
      await fetch(`${API_BASE}/api/agent/autonomous/run`, { method: 'POST' })
      fetchAlertCount()
      fetchAlerts()
    } catch (e) {
      console.error('Autonomous check failed:', e)
    }
  }

  const fetchAlertCount = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/agent/alerts/count`)
      if (res.ok) {
        const data = await res.json()
        setAlertCount(data.count)
      }
    } catch (e) {}
  }

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/agent/alerts?limit=20`)
      if (res.ok) {
        const data = await res.json()
        setAlerts(data)
      }
    } catch (e) {}
  }

  const fetchMemoryContext = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/agent/context?limit=5`)
      if (res.ok) {
        const data = await res.json()
        setMemoryContext(data)
      }
    } catch (e) {}
  }

  const dismissAlert = async (alertId) => {
    try {
      await fetch(`${API_BASE}/api/agent/alerts/${alertId}/dismiss`, { method: 'POST' })
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

    // Staff identify themselves here rather than in the URL, which the
    // server writes to its access log. Without this the socket treats the
    // connection as a customer and scopes the tools accordingly.
    ws.addEventListener('open', () => {
      const key = getApiKey()
      if (key) {
        // Naming the conversation here is what makes a refresh continue the
        // thread instead of starting a new one.
        ws.send(JSON.stringify({ auth: key, conversation_id: conversationRef.current }))
      }
    }, { once: true })
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
                    risk: data.risk || null,
                    preview: data.preview || null,
                    blocked: data.blocked || false,
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

        case 'authenticated':
          setAuthRole(data.role)
          if (data.conversation_id) {
            conversationRef.current = data.conversation_id
            setConversationId(data.conversation_id)
          }
          break

        case 'conversation_started':
          conversationRef.current = data.conversation_id
          setConversationId(data.conversation_id)
          setHistoryToken(t => t + 1)
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
          setHistoryToken(t => t + 1)
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
                  suggestions: data.suggestions || null,
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

    const connectionLost = () => {
      // Ignore close events from a socket that has already been replaced.
      if (wsRef.current !== ws) return
      wsRef.current = null
      setIsProcessing(false)
      setThinkingSteps([])
      setCurrentTools([])
      currentToolsRef.current = []
      thinkingStepsRef.current = []
      setMessages(prev => [...prev, {
        role: 'agent',
        content: 'Connection interrupted. Please check the action history before retrying a write. You can send another message to reconnect.',
        isError: true,
        timestamp: new Date(),
      }])
    }
    ws.onclose = connectionLost
    ws.onerror = connectionLost

    return ws
  }

  const copyAnswer = async (idx, text) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } finally { document.body.removeChild(ta) }
    }
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(cur => (cur === idx ? null : cur)), 1500)
  }

  const sendFeedback = (idx, rating, reason = '') => {
    const msg = messages[idx]
    if (!msg) return
    const question = [...messages.slice(0, idx)].reverse().find(m => m.role === 'user')?.content || ''
    setFeedbackByMsg(prev => ({ ...prev, [idx]: { rating, reason } }))
    fetch(`${API_BASE}/api/agent/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rating, reason, question,
        answer: msg.content,
        conversation_id: conversationRef.current || null,
        tools: (msg.tools || []).map(t => t.tool),
      }),
    }).catch(() => {})
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
    const send = () => ws.send(JSON.stringify({
      prompt,
      // Omitted entirely when null — the server then uses its own
      // configured default, same as before this selector existed.
      ...(selectedModel ? { llm: { provider: selectedModel.provider, model: selectedModel.model } } : {}),
    }))

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

  const requestRecommendedAction = (rec) => {
    if (isProcessing) return

    setMessages(prev => [...prev, {
      role: 'user', content: rec.text, timestamp: new Date(), isAction: true,
    }])
    setIsProcessing(true)
    setThinkingSteps([])
    setCurrentTools([])
    currentToolsRef.current = []
    thinkingStepsRef.current = []

    // The tool and its parameters come from the recommendation itself, so
    // the action taken is the one that was shown — not one re-derived from
    // the wording by the model.
    const ws = connectWS()
    const send = () => ws.send(JSON.stringify({
      action_request: { tool: rec.tool, params: rec.params, label: rec.text },
    }))

    if (ws.readyState === WebSocket.OPEN) {
      send()
    } else {
      ws.addEventListener('open', send, { once: true })
    }
  }

  const openConversation = async (id) => {
    if (id === conversationRef.current) return
    try {
      const res = await fetch(`${API_BASE}/api/conversations/${id}`)
      if (!res.ok) return
      const data = await res.json()

      // Stored messages carry text and role only; tool cards and thinking
      // steps belong to the turn that produced them and are not replayed.
      setMessages(data.messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'agent',
        content: m.text,
        mode: m.intent || undefined,
        timestamp: new Date(m.timestamp),
      })))
      setCurrentTools([])
      setThinkingSteps([])
      currentToolsRef.current = []
      thinkingStepsRef.current = []
      setStreamingText('')

      conversationRef.current = id
      setConversationId(id)

      // The socket carries the conversation, so it is reopened on the new one.
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    } catch {
      /* leave the current thread as it is */
    }
  }

  const startNewConversation = () => {
    speechRef.current?.stop()
    speechRef.current = null
    setSpeakingIdx(null)
    conversationRef.current = null
    setConversationId(null)
    setMessages([])
    setCurrentTools([])
    setThinkingSteps([])
    currentToolsRef.current = []
    thinkingStepsRef.current = []
    setStreamingText('')
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }

  const toggleRecording = async () => {
    if (recording) {
      setRecording(false)
      setTranscribing(true)
      try {
        const blob = await recorderRef.current.stop()
        const { text } = await transcribe(blob)
        // Put it in the box rather than sending it: transcription is not
        // perfect, and a misheard order number should be correctable before
        // it reaches the agent.
        if (text?.trim()) setInput(text.trim())
      } catch {
        setInput('')
      } finally {
        recorderRef.current = null
        setTranscribing(false)
      }
      return
    }

    try {
      recorderRef.current = await startRecording()
      setRecording(true)
    } catch {
      alert('Microphone permission is needed to speak to Orio.')
    }
  }

  const toggleSpeech = (messageIndex, text) => {
    if (speakingIdx === messageIndex) {
      speechRef.current?.stop()
      speechRef.current = null
      setSpeakingIdx(null)
      return
    }

    speechRef.current?.stop()
    setSpeakingIdx(messageIndex)
    speechRef.current = speakStreaming(text, {
      onDone: () => { setSpeakingIdx(null); speechRef.current = null },
      onError: () => { setSpeakingIdx(null); speechRef.current = null },
    })
  }

  const textareaRows = Math.min(
    9,
    Math.max(1, input.split('\n').length)
  );

  const handleActionUpdate = (actionId, type, outcome) => {
    setActionStatuses(prev => ({ ...prev, [actionId]: type === 'approve' ? 'approved' : 'rejected' }))
    // Approving a write performs it, so keep what came back to show the
    // reviewer whether the order actually changed.
    if (outcome) setActionOutcomes(prev => ({ ...prev, [actionId]: outcome }))
  }

  const retryOrderAction = async (actionId) => {
    setRetryingAction(actionId)
    setRetryError(null)
    try {
      const res = await fetch(`${API_BASE}/api/agent/action-log/${actionId}/retry`, { method: 'POST' })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || result.detail || 'Retry failed')
      setActionOutcomes(prev => ({ ...prev, [actionId]: result }))
      await fetchActionLog()
    } catch (error) {
      setRetryError(error.message || 'Could not reach the server. You can retry this same action.')
    } finally {
      setRetryingAction(null)
    }
  }

  const fetchActionLog = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/agent/action-log?limit=30`)
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
    <div className="orio-agent-shell">
      <ConversationSidebar
        currentId={conversationId}
        onSelect={openConversation}
        onNew={startNewConversation}
        refreshToken={historyToken}
        collapsed={sidebarClosed}
        onToggle={() => setSidebarClosed(v => !v)}
      />
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
          <Link className="action-log-btn" to="/outbox" title="Messages the agent composed">
            📤 Outbox
          </Link>
          <Link className="action-log-btn" to="/inbox" title="Customer and courier replies">
            💬 Inbox
          </Link>
          <Link className="action-log-btn" to="/usage" title="Token usage and cost, per model">
            💳 Usage
          </Link>
          <button className="agent-theme-btn" onClick={toggleTheme}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          {account && (
            <div className="agent-account" title={`${account.email} · ${account.role}`}>
              <span className="agent-account-no">
                {account.account_no}{authRole ? ` · ${authRole}` : ''}
              </span>
              <button className="agent-signout" onClick={signOut}>Sign out</button>
            </div>
          )}
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
            {starters ? (
              <div className="orio-starters">
                {starters.map((c, i) => (
                  <button key={i} className="orio-starter" onClick={() => sendPrompt(c.prompt)}>
                    <span className="orio-starter-icon">{c.icon}</span>
                    <span className="orio-starter-title">{c.title}</span>
                    <span className="orio-starter-detail">{c.detail}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="orio-examples">
                <p className="example-label">Try something like:</p>
                <div className="example-list">
                  {['Find all stuck orders older than 30 days', 'Analyze order 424521',
                    'Generate a daily report', 'Draft a reply for order TRK-9941'].map(q => (
                    <span key={q} className="example-click" onClick={() => sendPrompt(q)}>"{q}"</span>
                  ))}
                </div>
              </div>
            )}
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
              <div className="orio-message-text">
                {msg.role === 'agent' && !msg.isError
                  ? <MarkdownText>{msg.content}</MarkdownText>
                  : msg.content}
              </div>

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
                        risk={t.risk}
                        preview={t.preview}
                        blocked={t.blocked}
                        outcome={actionOutcomes[t.actionId]}
                        onRecommend={requestRecommendedAction}
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

              {msgIdx === messages.length - 1 && !isProcessing && (
                <SuggestionChips suggestions={msg.suggestions} onPick={sendPrompt} />
              )}

              <div className="orio-message-time">
                {msg.timestamp && new Date(msg.timestamp).toLocaleTimeString()}
                {msg.role === 'agent' && !msg.isError && msg.content && (
                  <MessageActions
                    fb={feedbackByMsg[msgIdx]}
                    copied={copiedIdx === msgIdx}
                    onCopy={() => copyAnswer(msgIdx, msg.content)}
                    onRate={(r) => sendFeedback(msgIdx, r)}
                    onReason={(reason) => sendFeedback(msgIdx, 'down', reason)}
                  />
                )}
                {msg.role === 'agent' && msg.content && (
                  <button
                    className={`orio-speak-btn ${speakingIdx === msgIdx ? 'speaking' : ''}`}
                    onClick={() => toggleSpeech(msgIdx, msg.content)}
                    title={speakingIdx === msgIdx ? 'Stop reading' : 'Read this out'}
                  >
                    {speakingIdx === msgIdx ? '◼ Stop' : '🔊 Listen'}
                  </button>
                )}
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
                <ElapsedTimer />
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
                      risk={t.risk}
                      preview={t.preview}
                      blocked={t.blocked}
                      outcome={actionOutcomes[t.actionId]}
                      onRecommend={requestRecommendedAction}
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
        <div className="orio-model-row">
          <button
            className="orio-model-chip"
            onClick={() => setShowModelPicker(v => !v)}
            title="Choose which model answers"
          >
            🧠 {selectedModel ? selectedModel.label : 'Default model'}
          </button>
          {showModelPicker && (
            <>
              <div className="orio-model-backdrop" onClick={() => setShowModelPicker(false)} />
              <div className="orio-model-menu">
                <button
                  className={`orio-model-option ${!selectedModel ? 'active' : ''}`}
                  onClick={() => selectModel(null)}
                >
                  Default (server-configured)
                </button>
                {['anthropic', 'openai', 'ollama', 'openrouter'].map(provider => {
                  const group = modelChoices.filter(c => c.provider === provider)
                  if (!group.length) return null
                  const groupLabel = {
                    anthropic: 'Claude', openai: 'OpenAI',
                    ollama: 'Ollama (local)', openrouter: 'OpenRouter',
                  }[provider]
                  return (
                    <div key={provider} className="orio-model-group">
                      <div className="orio-model-group-label">
                        {groupLabel}
                      </div>
                      {group.map(c => (
                        <button
                          key={`${c.provider}-${c.model}`}
                          className={`orio-model-option ${selectedModel?.provider === c.provider && selectedModel?.model === c.model ? 'active' : ''}`}
                          onClick={() => selectModel(c)}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
        <div className="orio-input-wrapper">
          <textarea
            id="orio-input"
            name="orio-input"
            ref={inputRef}
            className="orio-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={recording
              ? 'Listening… press ■ when you are done'
              : transcribing
                ? 'Writing down what you said…'
                : "Tell Orio what to do... (e.g. 'Find stuck orders and escalate critical ones')"}
            rows={textareaRows}
            disabled={isProcessing}
          />
          <button
            className={`orio-mic-btn ${recording ? 'recording' : ''}`}
            onClick={toggleRecording}
            disabled={isProcessing || transcribing}
            title={recording ? 'Stop and transcribe' : 'Speak to Orio'}
          >
            {transcribing ? '…' : recording ? '■' : '🎤'}
          </button>
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
              {retryError && <div role="alert">{retryError}</div>}
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
              {retryError && <div role="alert">{retryError}</div>}
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
                    {a.params && Object.keys(a.params).length > 0 && (
                      <div className="action-log-params">
                        {Object.entries(a.params).map(([k, v]) => (
                          <span className="action-log-param" key={k}>
                            {k}: <strong>{String(v)}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                    {a.risk && (
                      <span className={`action-log-risk risk-${a.risk}`}>
                        {RISK_LABELS[a.risk]?.label || a.risk}
                      </span>
                    )}
                    {/* Approving a write performs it, so the log records
                        whether the change actually went through. */}
                    {a.execution_status && a.execution_status !== 'not_applicable' && (
                      <div className={`action-log-execution ${a.execution_status}`}>
                        {a.execution_status === 'succeeded' ? '✓ Applied' : '✕ Failed'}
                        {a.execution_result?.message && <> — {a.execution_result.message}</>}
                        {a.execution_result?.error && <> — {a.execution_result.error}</>}
                      </div>
                    )}
                    {a.status === 'approved' && a.execution_mode === 'transaction_v1' && ['create_order', 'ship_order'].includes(a.tool_name) && a.execution_status !== 'succeeded' && (
                      <button className="action-btn approve" disabled={retryingAction !== null} onClick={() => retryOrderAction(a.action_id)}>
                        {retryingAction === a.action_id ? 'Checking result…' : 'Retry approved action'}
                      </button>
                    )}
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
    </div>
  )
}
