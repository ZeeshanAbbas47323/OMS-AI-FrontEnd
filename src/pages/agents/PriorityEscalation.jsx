import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { Link } from 'react-router-dom'
import './AgentPage.css'

const API = 'http://localhost:8001'

export default function PriorityEscalation() {
  const { theme, toggleTheme } = useTheme()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filterLevel, setFilterLevel] = useState('all')

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/agents/priority`)
      setData(await res.json())
    } catch { setData(null) }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const filtered = (data?.orders || []).filter(o => {
    if (filterLevel !== 'all' && o.priority_level !== filterLevel) return false
    return true
  })

  const fmt = (n) => `Rs. ${(n || 0).toLocaleString()}`

  return (
    <div className="agent-page">
      <div className="agent-page-header">
        <div className="agent-page-back">
          <Link to="/agents" className="back-link">← Agents</Link>
          <div>
            <h1>🔥 Priority/Escalation Agent</h1>
            <p>High-value and VIP orders requiring immediate attention</p>
          </div>
        </div>
        <button className="agent-theme-btn" onClick={toggleTheme}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>

      {data?.summary && (
        <div className="agent-stats-row">
          <div className="agent-stat-card">
            <div className="agent-stat-value">{data.summary.total_priority}</div>
            <div className="agent-stat-label">Priority Orders</div>
          </div>
          <div className="agent-stat-card" style={{borderLeft: '3px solid #e74c3c'}}>
            <div className="agent-stat-value">{data.summary.by_level?.['P1-Critical'] || 0}</div>
            <div className="agent-stat-label">P1 Critical</div>
          </div>
          <div className="agent-stat-card" style={{borderLeft: '3px solid #e67e22'}}>
            <div className="agent-stat-value">{data.summary.by_level?.['P2-High'] || 0}</div>
            <div className="agent-stat-label">P2 High</div>
          </div>
          <div className="agent-stat-card" style={{borderLeft: '3px solid #f39c12'}}>
            <div className="agent-stat-value">{fmt(data.summary.total_value_at_risk)}</div>
            <div className="agent-stat-label">Value at Risk</div>
          </div>
        </div>
      )}

      <div className="agent-controls-row">
        <div className="control-group">
          <label>Priority Level:</label>
          <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
            <option value="all">All Levels</option>
            <option value="P1-Critical">P1 - Critical</option>
            <option value="P2-High">P2 - High</option>
            <option value="P3-Medium">P3 - Medium</option>
          </select>
        </div>
        <button className="refresh-btn" onClick={fetchData}>Refresh</button>
      </div>

      {loading ? (
        <div className="agent-loading">Loading priority orders...</div>
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
                <th>Score</th>
                <th>Level</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="empty-row">No priority orders found</td></tr>
              ) : filtered.map(o => (
                <tr key={o.order_id}>
                  <td><strong>#{o.order_id}</strong></td>
                  <td>{o.customer_name}</td>
                  <td>{o.customer_city}</td>
                  <td>{o.courier}</td>
                  <td>{fmt(o.order_amount)}</td>
                  <td><span className={`table-badge status-${o.status.toLowerCase().replace(/\s+/g, '-')}`}>{o.status}</span></td>
                  <td><strong>{o.priority_score}</strong></td>
                  <td><span className={`table-badge priority-${o.priority_level.split('-')[0].toLowerCase()}`}>{o.priority_level}</span></td>
                  <td>
                    <div className="flag-chips">
                      {o.flags.map((f, i) => (
                        <span key={i} className="flag-chip">{f}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="table-footer">Showing {filtered.length} of {data?.orders?.length || 0} priority orders</div>
        </div>
      )}
    </div>
  )
}
