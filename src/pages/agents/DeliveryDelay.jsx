import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { Link } from 'react-router-dom'
import './AgentPage.css'
import { API_BASE } from '../../config'

const API = API_BASE

export default function DeliveryDelay() {
  const { theme, toggleTheme } = useTheme()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expectedDays, setExpectedDays] = useState(5)
  const [filterSeverity, setFilterSeverity] = useState('all')
  const [filterCity, setFilterCity] = useState('all')

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/agents/delivery-delays?expected_days=${expectedDays}`)
      setData(await res.json())
    } catch { setData(null) }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [expectedDays])

  const filtered = data?.orders?.filter(o => {
    if (filterSeverity !== 'all' && o.severity !== filterSeverity) return false
    if (filterCity !== 'all' && o.customer_city !== filterCity) return false
    return true
  }) || []

  const cities = [...new Set(data?.orders?.map(o => o.customer_city) || [])].sort()

  return (
    <div className="agent-page">
      <div className="agent-page-header">
        <div className="agent-page-back">
          <Link to="/agents" className="back-link">← Agents</Link>
          <div>
            <h1>⏰ Delivery Delay Agent</h1>
            <p>Orders past expected delivery window</p>
          </div>
        </div>
        <button className="agent-theme-btn" onClick={toggleTheme}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>

      {data?.summary && (
        <div className="agent-stats-row">
          <div className="agent-stat-card">
            <div className="agent-stat-value">{data.summary.total_delayed}</div>
            <div className="agent-stat-label">Total Delayed</div>
          </div>
          <div className="agent-stat-card" style={{borderLeft: '3px solid #e74c3c'}}>
            <div className="agent-stat-value">{data.summary.critical}</div>
            <div className="agent-stat-label">Critical (10+ days late)</div>
          </div>
          <div className="agent-stat-card" style={{borderLeft: '3px solid #e67e22'}}>
            <div className="agent-stat-value">{data.summary.high}</div>
            <div className="agent-stat-label">High (5-9 days late)</div>
          </div>
          <div className="agent-stat-card" style={{borderLeft: '3px solid #3498db'}}>
            <div className="agent-stat-value">{data.summary.avg_delay} days</div>
            <div className="agent-stat-label">Avg Delay</div>
          </div>
        </div>
      )}

      <div className="agent-controls-row">
        <div className="control-group">
          <label>Expected Delivery (days):</label>
          <select value={expectedDays} onChange={e => setExpectedDays(Number(e.target.value))}>
            <option value={3}>3 days</option>
            <option value={5}>5 days</option>
            <option value={7}>7 days</option>
            <option value={10}>10 days</option>
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
          <label>City:</label>
          <select value={filterCity} onChange={e => setFilterCity(e.target.value)}>
            <option value="all">All Cities</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button className="refresh-btn" onClick={fetchData}>Refresh</button>
      </div>

      {loading ? (
        <div className="agent-loading">Loading delayed orders...</div>
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
                <th>Order Date</th>
                <th>Days Late</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="empty-row">No delayed orders found</td></tr>
              ) : filtered.map(o => (
                <tr key={o.order_id}>
                  <td><strong>#{o.order_id}</strong></td>
                  <td>{o.tracking_number}</td>
                  <td>{o.customer_name}</td>
                  <td>{o.customer_city}</td>
                  <td><span className={`table-badge status-${o.status.toLowerCase().replace(/\s+/g, '-')}`}>{o.status}</span></td>
                  <td>{o.courier}</td>
                  <td>{o.order_date}</td>
                  <td><strong>{o.delay_days}</strong></td>
                  <td><span className={`table-badge severity-${o.severity}`}>{o.severity}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="table-footer">Showing {filtered.length} of {data?.orders?.length || 0} orders</div>
        </div>
      )}
    </div>
  )
}
