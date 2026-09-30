import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { Link } from 'react-router-dom'
import './AgentPage.css'
import { API_BASE } from '../../config'

const API = API_BASE

export default function NDRAgent() {
  const { theme, toggleTheme } = useTheme()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [minAttempts, setMinAttempts] = useState(2)
  const [filterAction, setFilterAction] = useState('all')

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/agents/ndr?min_attempts=${minAttempts}`)
      setData(await res.json())
    } catch { setData(null) }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [minAttempts])

  const filtered = data?.orders?.filter(o => {
    if (filterAction !== 'all' && o.suggested_action !== filterAction) return false
    return true
  }) || []

  return (
    <div className="agent-page">
      <div className="agent-page-header">
        <div className="agent-page-back">
          <Link to="/agents" className="back-link">← Agents</Link>
          <div>
            <h1>🔄 NDR Agent</h1>
            <p>Non-Delivery Reports — failed attempts, retry, reschedule, RTO</p>
          </div>
        </div>
        <button className="agent-theme-btn" onClick={toggleTheme}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>

      {data?.summary && (
        <div className="agent-stats-row">
          <div className="agent-stat-card">
            <div className="agent-stat-value">{data.summary.total_ndr}</div>
            <div className="agent-stat-label">Total NDRs</div>
          </div>
          <div className="agent-stat-card" style={{borderLeft: '3px solid #e74c3c'}}>
            <div className="agent-stat-value">{data.summary.critical}</div>
            <div className="agent-stat-label">Critical (4+ attempts)</div>
          </div>
          <div className="agent-stat-card" style={{borderLeft: '3px solid #e67e22'}}>
            <div className="agent-stat-value">{data.summary.high}</div>
            <div className="agent-stat-label">High (3 attempts)</div>
          </div>
          <div className="agent-stat-card" style={{borderLeft: '3px solid #3498db'}}>
            <div className="agent-stat-value">{data.summary.avg_attempts}</div>
            <div className="agent-stat-label">Avg Attempts</div>
          </div>
        </div>
      )}

      {data?.summary?.by_reason && (
        <div className="reason-chips-section">
          <h3>NDR Reasons</h3>
          <div className="reason-chips">
            {Object.entries(data.summary.by_reason)
              .sort((a, b) => b[1] - a[1])
              .map(([reason, count]) => (
                <span key={reason} className="reason-chip">
                  {reason} <strong>{count}</strong>
                </span>
              ))}
          </div>
        </div>
      )}

      <div className="agent-controls-row">
        <div className="control-group">
          <label>Min Attempts:</label>
          <select value={minAttempts} onChange={e => setMinAttempts(Number(e.target.value))}>
            <option value={1}>1+</option>
            <option value={2}>2+</option>
            <option value={3}>3+</option>
            <option value={4}>4+</option>
          </select>
        </div>
        <div className="control-group">
          <label>Suggested Action:</label>
          <select value={filterAction} onChange={e => setFilterAction(e.target.value)}>
            <option value="all">All</option>
            <option value="RTO">RTO</option>
            <option value="Reschedule">Reschedule</option>
            <option value="Retry">Retry</option>
          </select>
        </div>
        <button className="refresh-btn" onClick={fetchData}>Refresh</button>
      </div>

      {loading ? (
        <div className="agent-loading">Loading NDR data...</div>
      ) : (
        <div className="agent-table-wrapper">
          <table className="agent-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Tracking</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>City</th>
                <th>Courier</th>
                <th>Attempts</th>
                <th>Reason</th>
                <th>Action</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="empty-row">No NDR orders found</td></tr>
              ) : filtered.map(o => (
                <tr key={o.order_id}>
                  <td><strong>#{o.order_id}</strong></td>
                  <td>{o.tracking_number}</td>
                  <td>{o.customer_name}</td>
                  <td>{o.customer_phone}</td>
                  <td>{o.customer_city}</td>
                  <td>{o.courier}</td>
                  <td><strong>{o.delivery_attempts}</strong></td>
                  <td>{o.return_reason || '—'}</td>
                  <td><span className={`table-badge action-${o.suggested_action.toLowerCase()}`}>{o.suggested_action}</span></td>
                  <td><span className={`table-badge severity-${o.severity}`}>{o.severity}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="table-footer">Showing {filtered.length} of {data?.orders?.length || 0} NDR orders</div>
        </div>
      )}
    </div>
  )
}
