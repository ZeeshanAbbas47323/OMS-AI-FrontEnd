import { useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { Link } from 'react-router-dom'
import './AgentDashboard.css'

const AGENTS = [
  {
    id: 'shipment-tracking',
    name: 'Shipment Tracking',
    icon: '📦',
    description: 'Track orders, view status, delivery timeline',
    phase: 1,
    status: 'active',
    category: 'core',
  },
  {
    id: 'cs-knowledge',
    name: 'CS Knowledge',
    icon: '📚',
    description: 'FAQ, policies, training — RAG-powered answers',
    phase: 1,
    status: 'active',
    category: 'core',
  },
  {
    id: 'customer-reply',
    name: 'Customer Reply',
    icon: '💬',
    description: 'Generate natural replies for customer messages',
    phase: 1,
    status: 'active',
    category: 'core',
  },
  {
    id: 'stuck-shipment',
    name: 'Stuck Shipment',
    icon: '🚧',
    description: 'Detect shipments not moving for X days',
    phase: 2,
    status: 'active',
    category: 'detection',
  },
  {
    id: 'delivery-delay',
    name: 'Delivery Delay',
    icon: '⏰',
    description: 'Flag orders past expected delivery date',
    phase: 2,
    status: 'active',
    category: 'detection',
  },
  {
    id: 'ndr',
    name: 'NDR Agent',
    icon: '🔄',
    description: 'Handle Non-Delivery Reports — retry, reschedule, RTO',
    phase: 2,
    status: 'active',
    category: 'detection',
  },
  {
    id: 'pickup',
    name: 'Pickup Agent',
    icon: '🏪',
    description: 'Schedule pickups, retry, notify couriers',
    phase: 3,
    status: 'active',
    category: 'action',
  },
  {
    id: 'cod',
    name: 'COD Agent',
    icon: '💵',
    description: 'COD remittance tracking and reconciliation',
    phase: 3,
    status: 'active',
    category: 'action',
  },
  {
    id: 'return-rto',
    name: 'Return/RTO',
    icon: '↩️',
    description: 'Return requests, RTO shipments, refund flow',
    phase: 3,
    status: 'active',
    category: 'action',
  },
  {
    id: 'customer-complaint',
    name: 'Customer Complaint',
    icon: '😤',
    description: 'Log, categorize, and assign complaints',
    phase: 4,
    status: 'active',
    category: 'escalation',
  },
  {
    id: 'courier-escalation',
    name: 'Courier Escalation',
    icon: '📢',
    description: 'Escalate to courier when SLA breached',
    phase: 4,
    status: 'active',
    category: 'escalation',
  },
  {
    id: 'priority-escalation',
    name: 'Priority/Escalation',
    icon: '🔥',
    description: 'VIP orders priority, escalation chain management',
    phase: 4,
    status: 'active',
    category: 'escalation',
  },
  {
    id: 'shipment-investigation',
    name: 'Shipment Investigation',
    icon: '🔍',
    description: 'Deep dive — lost, damaged, disputed shipments',
    phase: 5,
    status: 'active',
    category: 'reporting',
  },
  {
    id: 'daily-cs-report',
    name: 'Daily CS Report',
    icon: '📋',
    description: 'Daily summary — tickets, resolution rate, SLA',
    phase: 5,
    status: 'active',
    category: 'reporting',
  },
  {
    id: 'cs-performance',
    name: 'CS Performance',
    icon: '📈',
    description: 'Agent/team performance metrics and trends',
    phase: 5,
    status: 'active',
    category: 'reporting',
  },
]

const CATEGORIES = {
  all: 'All Agents',
  core: 'Core',
  detection: 'Problem Detection',
  action: 'Actions & Resolution',
  escalation: 'Escalation',
  reporting: 'Reporting',
}

export default function AgentDashboard() {
  const { theme, toggleTheme } = useTheme()
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? AGENTS : AGENTS.filter(a => a.category === filter)
  const activeCount = AGENTS.filter(a => a.status === 'active').length
  const totalCount = AGENTS.length

  return (
    <div className="agent-dashboard">
      <div className="agent-dashboard-header">
        <div>
          <h1>🤖 Agent Dashboard</h1>
          <p>{activeCount} of {totalCount} agents active</p>
        </div>
        <div className="agent-dashboard-actions">
          <a href="/admin/team" className="agent-nav-btn">🏢 Team</a>
          <a href="/admin" className="agent-nav-btn">🛡️ Admin</a>
          <a href="/dashboard" className="agent-nav-btn">📊 Analytics</a>
          <button className="agent-theme-btn" onClick={toggleTheme}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>

      <div className="agent-phase-bar">
        <div className="phase-item active">
          <span className="phase-num">1</span>
          <span className="phase-label">Foundation</span>
        </div>
        <div className="phase-connector"></div>
        <div className="phase-item active">
          <span className="phase-num">2</span>
          <span className="phase-label">Detection</span>
        </div>
        <div className="phase-connector"></div>
        <div className="phase-item active">
          <span className="phase-num">3</span>
          <span className="phase-label">Actions</span>
        </div>
        <div className="phase-connector"></div>
        <div className="phase-item active">
          <span className="phase-num">4</span>
          <span className="phase-label">Escalation</span>
        </div>
        <div className="phase-connector"></div>
        <div className="phase-item active">
          <span className="phase-num">5</span>
          <span className="phase-label">Reporting</span>
        </div>
      </div>

      <div className="agent-filters">
        {Object.entries(CATEGORIES).map(([key, label]) => (
          <button
            key={key}
            className={`agent-filter-btn ${filter === key ? 'active' : ''}`}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <Link to="/agents/orio" className="orio-hero-card">
        <div className="orio-hero-left">
          <span className="orio-hero-icon">🤖</span>
          <div>
            <h2 className="orio-hero-title">Orio AI Agent</h2>
            <p className="orio-hero-desc">Your intelligent assistant — search, analyze, escalate, report. Just tell it what to do.</p>
          </div>
        </div>
        <span className="orio-hero-arrow">→</span>
      </Link>

      <Link to="/agents/sales-agent" className="orio-hero-card">
        <div className="orio-hero-left">
          <span className="orio-hero-icon">✨</span>
          <div>
            <h2 className="orio-hero-title">Sales Agent</h2>
            <p className="orio-hero-desc">Manage leads, recommend plans, and draft quotes — for prospects, not existing orders.</p>
          </div>
        </div>
        <span className="orio-hero-arrow">→</span>
      </Link>

      <Link to="/tickets" className="orio-hero-card">
        <div className="orio-hero-left">
          <span className="orio-hero-icon">🎫</span>
          <div>
            <h2 className="orio-hero-title">Tickets</h2>
            <p className="orio-hero-desc">Customer requests from WhatsApp waiting on your review — resolve or reject, with a reason.</p>
          </div>
        </div>
        <span className="orio-hero-arrow">→</span>
      </Link>

      <div className="agent-grid">
        {filtered.map(agent => (
          <div key={agent.id} className={`agent-card ${agent.status}`}>
            <div className="agent-card-header">
              <span className="agent-icon">{agent.icon}</span>
              <span className={`agent-status-badge ${agent.status}`}>
                {agent.status === 'active' ? 'Active' : 'Coming Soon'}
              </span>
            </div>
            <h3 className="agent-card-title">{agent.name}</h3>
            <p className="agent-card-desc">{agent.description}</p>
            <div className="agent-card-footer">
              <span className="agent-phase-tag">Phase {agent.phase}</span>
              {agent.status === 'active' ? (
                <Link to={`/agents/${agent.id}`} className="agent-open-btn">
                  Open
                </Link>
              ) : (
                <span className="agent-locked">🔒</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
