import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { Link } from 'react-router-dom'
import './AgentPage.css'
import { API_BASE } from '../../config'

const API = API_BASE

export default function ShipmentInvestigation() {
  const { theme, toggleTheme } = useTheme()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')
  const [filterRisk, setFilterRisk] = useState('all')
  const [expanded, setExpanded] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/agents/investigation`)
      setData(await res.json())
    } catch { setData(null) }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const filtered = (data?.investigations || []).filter(i => {
    if (filterType !== 'all' && i.issue_type !== filterType) return false
    if (filterRisk !== 'all' && i.risk_level !== filterRisk) return false
    return true
  })

  const issueTypes = [...new Set((data?.investigations || []).map(i => i.issue_type))].sort()
  const fmt = (n) => `Rs. ${(n || 0).toLocaleString()}`

  return (
    <div className="agent-page">
      <div className="agent-page-header">
        <div className="agent-page-back">
          <Link to="/agents" className="back-link">← Agents</Link>
          <div>
            <h1>🔍 Shipment Investigation Agent</h1>
            <p>Deep dive into lost, damaged, and disputed shipments</p>
          </div>
        </div>
        <button className="agent-theme-btn" onClick={toggleTheme}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>

      {data?.summary && (
        <>
          <div className="agent-stats-row">
            <div className="agent-stat-card">
              <div className="agent-stat-value">{data.summary.total_investigations}</div>
              <div className="agent-stat-label">Total Cases</div>
            </div>
            <div className="agent-stat-card" style={{borderLeft: '3px solid #e74c3c'}}>
              <div className="agent-stat-value">{data.summary.by_risk?.Critical || 0}</div>
              <div className="agent-stat-label">Critical Risk</div>
            </div>
            <div className="agent-stat-card" style={{borderLeft: '3px solid #e67e22'}}>
              <div className="agent-stat-value">{data.summary.by_risk?.High || 0}</div>
              <div className="agent-stat-label">High Risk</div>
            </div>
            <div className="agent-stat-card" style={{borderLeft: '3px solid #3498db'}}>
              <div className="agent-stat-value">{fmt(data.summary.total_value)}</div>
              <div className="agent-stat-label">Total Value at Stake</div>
            </div>
          </div>

          {data.summary.by_type && Object.keys(data.summary.by_type).length > 0 && (
            <div className="reason-chips-section">
              <h3>Cases by Type</h3>
              <div className="reason-chips">
                {Object.entries(data.summary.by_type)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <span key={type} className="reason-chip">{type}: <strong>{count}</strong></span>
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="agent-controls-row">
        <div className="control-group">
          <label>Issue Type:</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            {issueTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="control-group">
          <label>Risk Level:</label>
          <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)}>
            <option value="all">All Levels</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
          </select>
        </div>
        <button className="refresh-btn" onClick={fetchData}>Refresh</button>
      </div>

      {loading ? (
        <div className="agent-loading">Loading investigation cases...</div>
      ) : (
        <div className="agent-table-wrapper">
          <table className="agent-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>City</th>
                <th>Courier</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Issue Type</th>
                <th>Risk</th>
                <th>Age</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="empty-row">No investigation cases found</td></tr>
              ) : filtered.map(inv => (
                <>
                  <tr key={inv.order_id}>
                    <td><strong>#{inv.order_id}</strong></td>
                    <td>{inv.customer_name}</td>
                    <td>{inv.customer_city}</td>
                    <td>{inv.courier}</td>
                    <td>{fmt(inv.order_amount)}</td>
                    <td><span className={`table-badge status-${inv.status.toLowerCase().replace(/\s+/g, '-')}`}>{inv.status}</span></td>
                    <td><span className="reason-chip">{inv.issue_type}</span></td>
                    <td><span className={`table-badge severity-${inv.risk_level.toLowerCase()}`}>{inv.risk_level}</span></td>
                    <td>{inv.age_days}d</td>
                    <td>
                      <button className="refresh-btn" style={{padding: '4px 10px', fontSize: '12px'}} onClick={() => setExpanded(expanded === inv.order_id ? null : inv.order_id)}>
                        {expanded === inv.order_id ? 'Hide' : 'View'}
                      </button>
                    </td>
                  </tr>
                  {expanded === inv.order_id && (
                    <tr key={`${inv.order_id}-detail`} className="detail-row">
                      <td colSpan={10}>
                        <div className="investigation-detail">
                          <div className="detail-grid">
                            <div><strong>Tracking:</strong> {inv.tracking_number}</div>
                            <div><strong>Payment:</strong> {inv.payment_method}</div>
                            <div><strong>Delivery Attempts:</strong> {inv.delivery_attempts}</div>
                            <div><strong>Order Date:</strong> {inv.order_date}</div>
                            <div><strong>Root Cause:</strong> <span className="reason-chip">{inv.root_cause}</span></div>
                            {inv.return_reason && <div><strong>Return Reason:</strong> {inv.return_reason}</div>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          <div className="table-footer">Showing {filtered.length} of {data?.investigations?.length || 0} cases</div>
        </div>
      )}
    </div>
  )
}
