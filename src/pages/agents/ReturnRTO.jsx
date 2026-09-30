import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { Link } from 'react-router-dom'
import './AgentPage.css'
import { API_BASE } from '../../config'

const API = API_BASE

export default function ReturnRTO() {
  const { theme, toggleTheme } = useTheme()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filterReason, setFilterReason] = useState('all')
  

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/agents/returns`)
      setData(await res.json())
    } catch { setData(null) }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const filtered = (data?.orders || []).filter(o => {
    if (filterReason !== 'all' && (o.return_reason || 'Unknown') !== filterReason) return false
    return true
  })

  const reasons = [...new Set((data?.orders || []).map(o => o.return_reason || 'Unknown'))].sort()
  const fmt = (n) => typeof n === 'number' ? `Rs. ${n.toLocaleString()}` : 'Unavailable'

  return (
    <div className="agent-page">
      <div className="agent-page-header">
        <div className="agent-page-back">
          <Link to="/agents" className="back-link">← Agents</Link>
          <div>
            <h1>↩️ Return/RTO Agent</h1>
            <p>Return requests, RTO shipments, refund tracking</p>
          </div>
        </div>
        <button className="agent-theme-btn" onClick={toggleTheme}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>

      {data?.summary && (
        <>
          <p>{data.summary.data_limits?.join(" ")} Returned order value: {fmt(data.summary.returned_order_value)}</p>
          <div className="agent-stats-row">
            <div className="agent-stat-card">
              <div className="agent-stat-value">{data.summary.total_returns}</div>
              <div className="agent-stat-label">Total Returns</div>
            </div>
            <div className="agent-stat-card" style={{borderLeft: '3px solid #27ae60'}}>
              <div className="agent-stat-value">{data.summary.refund_processed ?? 'Unavailable'}</div>
              <div className="agent-stat-label">Refund Processed</div>
            </div>
            <div className="agent-stat-card" style={{borderLeft: '3px solid #e67e22'}}>
              <div className="agent-stat-value">{data.summary.refund_pending ?? 'Unavailable'}</div>
              <div className="agent-stat-label">Pending Review</div>
            </div>
            <div className="agent-stat-card" style={{borderLeft: '3px solid #e74c3c'}}>
              <div className="agent-stat-value">{fmt(data.summary.total_refund_amount)}</div>
              <div className="agent-stat-label">Total Refund Amount</div>
            </div>
          </div>

          {data.summary.by_reason && Object.keys(data.summary.by_reason).length > 0 && (
            <div className="reason-chips-section">
              <h3>Return Reasons</h3>
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
        </>
      )}

      <div className="agent-controls-row">
        <div className="control-group">
          <label>Reason:</label>
          <select value={filterReason} onChange={e => setFilterReason(e.target.value)}>
            <option value="all">All Reasons</option>
            {reasons.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <button className="refresh-btn" onClick={fetchData}>Refresh</button>
      </div>

      {loading ? (
        <div className="agent-loading">Loading return data...</div>
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
                <th>Reason</th>
                <th>Refund</th>
                <th>Status</th>
                <th>Days since return</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="empty-row">No returns found</td></tr>
              ) : filtered.map(o => (
                <tr key={o.order_id}>
                  <td><strong>#{o.order_id}</strong></td>
                  <td>{o.tracking_number}</td>
                  <td>{o.customer_name}</td>
                  <td>{o.customer_city}</td>
                  <td>{o.courier}</td>
                  <td>{o.return_reason || '—'}</td>
                  <td>{fmt(o.refund_amount)}</td>
                  <td>
                    <span className={`table-badge ${o.refund_status === 'Processed' ? 'action-retry' : 'severity-high'}`}>
                      {o.refund_status ?? 'Unavailable'}
                    </span>
                  </td>
                  <td>{o.days_since_return ?? 'Unavailable'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="table-footer">Showing {filtered.length} of {data?.orders?.length || 0} returns</div>
        </div>
      )}
    </div>
  )
}
