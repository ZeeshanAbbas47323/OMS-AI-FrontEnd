import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { Link } from 'react-router-dom'
import './AgentPage.css'
import { API_BASE } from '../../config'

const API = API_BASE

export default function CourierEscalation() {
  const { theme, toggleTheme } = useTheme()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filterLevel, setFilterLevel] = useState('all')
  const [filterCourier, setFilterCourier] = useState('all')

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/agents/courier-escalation`)
      setData(await res.json())
    } catch { setData(null) }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const filtered = (data?.escalations || []).filter(e => {
    if (filterLevel !== 'all' && e.escalation_level !== filterLevel) return false
    if (filterCourier !== 'all' && e.courier !== filterCourier) return false
    return true
  })

  const couriers = [...new Set((data?.escalations || []).map(e => e.courier))].sort()

  return (
    <div className="agent-page">
      <div className="agent-page-header">
        <div className="agent-page-back">
          <Link to="/agents" className="back-link">← Agents</Link>
          <div>
            <h1>📢 Courier Escalation Agent</h1>
            <p>SLA breaches and courier escalation management</p>
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
              <div className="agent-stat-value">{data.summary.total_escalations}</div>
              <div className="agent-stat-label">Total SLA Breaches</div>
            </div>
            <div className="agent-stat-card" style={{borderLeft: '3px solid #e74c3c'}}>
              <div className="agent-stat-value">{data.summary.by_level.L3}</div>
              <div className="agent-stat-label">L3 (14+ days breach)</div>
            </div>
            <div className="agent-stat-card" style={{borderLeft: '3px solid #e67e22'}}>
              <div className="agent-stat-value">{data.summary.by_level.L2}</div>
              <div className="agent-stat-label">L2 (7-13 days)</div>
            </div>
            <div className="agent-stat-card" style={{borderLeft: '3px solid #f1c40f'}}>
              <div className="agent-stat-value">{data.summary.by_level.L1}</div>
              <div className="agent-stat-label">L1 (1-6 days)</div>
            </div>
          </div>

          {data.summary.by_courier && Object.keys(data.summary.by_courier).length > 0 && (
            <div className="reason-chips-section">
              <h3>Escalations by Courier</h3>
              <div className="reason-chips">
                {Object.entries(data.summary.by_courier)
                  .sort((a, b) => b[1].total - a[1].total)
                  .map(([courier, info]) => (
                    <span key={courier} className="reason-chip">
                      {courier}: <strong>{info.total}</strong> (L3:{info.l3} L2:{info.l2} L1:{info.l1})
                    </span>
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="agent-controls-row">
        <div className="control-group">
          <label>Level:</label>
          <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
            <option value="all">All Levels</option>
            <option value="L3">L3 - Critical</option>
            <option value="L2">L2 - High</option>
            <option value="L1">L1 - Medium</option>
          </select>
        </div>
        <div className="control-group">
          <label>Courier:</label>
          <select value={filterCourier} onChange={e => setFilterCourier(e.target.value)}>
            <option value="all">All</option>
            {couriers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button className="refresh-btn" onClick={fetchData}>Refresh</button>
      </div>

      {loading ? (
        <div className="agent-loading">Loading escalation data...</div>
      ) : (
        <div className="agent-table-wrapper">
          <table className="agent-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Tracking</th>
                <th>Customer</th>
                <th>City</th>
                <th>Courier</th>
                <th>Status</th>
                <th>SLA Breach</th>
                <th>Level</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="empty-row">No escalations found</td></tr>
              ) : filtered.map(e => (
                <tr key={e.order_id}>
                  <td><strong>#{e.order_id}</strong></td>
                  <td>{e.tracking_number}</td>
                  <td>{e.customer_name}</td>
                  <td>{e.customer_city}</td>
                  <td>{e.courier}</td>
                  <td><span className={`table-badge status-${e.status.toLowerCase().replace(/\s+/g, '-')}`}>{e.status}</span></td>
                  <td><strong>{e.breach_days} days</strong></td>
                  <td><span className={`table-badge level-${e.escalation_level.toLowerCase()}`}>{e.escalation_level}</span></td>
                  <td>Rs. {e.order_amount?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="table-footer">Showing {filtered.length} of {data?.escalations?.length || 0} escalations</div>
        </div>
      )}
    </div>
  )
}
