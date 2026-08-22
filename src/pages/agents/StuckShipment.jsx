import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { Link } from 'react-router-dom'
import './AgentPage.css'

const API = 'http://localhost:8001'

export default function StuckShipment() {
  const { theme, toggleTheme } = useTheme()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [minDays, setMinDays] = useState(3)
  const [filterSeverity, setFilterSeverity] = useState('all')
  const [filterCourier, setFilterCourier] = useState('all')

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/agents/stuck-shipments?min_days=${minDays}`)
      setData(await res.json())
    } catch { setData(null) }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [minDays])

  const filtered = data?.shipments?.filter(s => {
    if (filterSeverity !== 'all' && s.severity !== filterSeverity) return false
    if (filterCourier !== 'all' && s.courier !== filterCourier) return false
    return true
  }) || []

  const couriers = [...new Set(data?.shipments?.map(s => s.courier) || [])]

  return (
    <div className="agent-page">
      <div className="agent-page-header">
        <div className="agent-page-back">
          <Link to="/agents" className="back-link">← Agents</Link>
          <div>
            <h1>🚧 Stuck Shipment Agent</h1>
            <p>Shipments not moving for extended periods</p>
          </div>
        </div>
        <button className="agent-theme-btn" onClick={toggleTheme}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>

      {data?.summary && (
        <div className="agent-stats-row">
          <div className="agent-stat-card">
            <div className="agent-stat-value">{data.summary.total_stuck}</div>
            <div className="agent-stat-label">Total Stuck</div>
          </div>
          <div className="agent-stat-card" style={{borderLeft: '3px solid #e74c3c'}}>
            <div className="agent-stat-value">{data.summary.critical}</div>
            <div className="agent-stat-label">Critical (14+ days)</div>
          </div>
          <div className="agent-stat-card" style={{borderLeft: '3px solid #e67e22'}}>
            <div className="agent-stat-value">{data.summary.high}</div>
            <div className="agent-stat-label">High (7-13 days)</div>
          </div>
          <div className="agent-stat-card" style={{borderLeft: '3px solid #f1c40f'}}>
            <div className="agent-stat-value">{data.summary.medium}</div>
            <div className="agent-stat-label">Medium (3-6 days)</div>
          </div>
        </div>
      )}

      <div className="agent-controls-row">
        <div className="control-group">
          <label>Min Days Stuck:</label>
          <select value={minDays} onChange={e => setMinDays(Number(e.target.value))}>
            <option value={1}>1+ days</option>
            <option value={3}>3+ days</option>
            <option value={5}>5+ days</option>
            <option value={7}>7+ days</option>
            <option value={14}>14+ days</option>
          </select>
        </div>
        <div className="control-group">
          <label>Severity:</label>
          <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
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
        <div className="agent-loading">Loading stuck shipments...</div>
      ) : (
        <div className="agent-table-wrapper">
          <table className="agent-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Tracking</th>
                <th>Customer</th>
                <th>City</th>
                <th>Status</th>
                <th>Courier</th>
                <th>Days Stuck</th>
                <th>Severity</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="empty-row">No stuck shipments found</td></tr>
              ) : filtered.map(s => (
                <tr key={s.order_id}>
                  <td><strong>#{s.order_id}</strong></td>
                  <td>{s.tracking_number}</td>
                  <td>{s.customer_name}</td>
                  <td>{s.customer_city}</td>
                  <td><span className={`table-badge status-${s.status.toLowerCase().replace(/\s+/g, '-')}`}>{s.status}</span></td>
                  <td>{s.courier}</td>
                  <td><strong>{s.days_stuck}</strong></td>
                  <td><span className={`table-badge severity-${s.severity}`}>{s.severity}</span></td>
                  <td>Rs. {s.order_amount?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="table-footer">Showing {filtered.length} of {data?.shipments?.length || 0} shipments</div>
        </div>
      )}
    </div>
  )
}
