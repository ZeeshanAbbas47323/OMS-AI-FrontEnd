import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { Link } from 'react-router-dom'
import './AgentPage.css'
import { API_BASE } from '../../config'

const API = API_BASE

export default function PickupAgent() {
  const { theme, toggleTheme } = useTheme()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pending')
  const [filterCourier, setFilterCourier] = useState('all')

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/agents/pickup`)
      setData(await res.json())
    } catch { setData(null) }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const list = tab === 'pending' ? (data?.pending || []) : (data?.failed || [])
  const filtered = filterCourier === 'all' ? list : list.filter(o => o.courier === filterCourier)
  const couriers = [...new Set([...(data?.pending || []), ...(data?.failed || [])].map(o => o.courier))].sort()

  return (
    <div className="agent-page">
      <div className="agent-page-header">
        <div className="agent-page-back">
          <Link to="/agents" className="back-link">← Agents</Link>
          <div>
            <h1>🏪 Pickup Agent</h1>
            <p>Schedule pickups, retry failed, notify couriers</p>
          </div>
        </div>
        <button className="agent-theme-btn" onClick={toggleTheme}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>

      {data?.summary && (
        <div className="agent-stats-row">
          <div className="agent-stat-card" style={{borderLeft: '3px solid #f39c12'}}>
            <div className="agent-stat-value">{data.summary.pending}</div>
            <div className="agent-stat-label">Pending Pickup</div>
          </div>
          <div className="agent-stat-card" style={{borderLeft: '3px solid #e74c3c'}}>
            <div className="agent-stat-value">{data.summary.urgent}</div>
            <div className="agent-stat-label">Urgent (3+ days)</div>
          </div>
          <div className="agent-stat-card" style={{borderLeft: '3px solid #95a5a6'}}>
            <div className="agent-stat-value">{data.summary.failed}</div>
            <div className="agent-stat-label">Failed/Blocked</div>
          </div>
          <div className="agent-stat-card" style={{borderLeft: '3px solid #27ae60'}}>
            <div className="agent-stat-value">{data.summary.completed}</div>
            <div className="agent-stat-label">Picked Up</div>
          </div>
        </div>
      )}

      <div className="agent-controls-row">
        <div className="tab-btns">
          <button className={`tab-btn ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
            Pending ({data?.pending?.length || 0})
          </button>
          <button className={`tab-btn ${tab === 'failed' ? 'active' : ''}`} onClick={() => setTab('failed')}>
            Failed ({data?.failed?.length || 0})
          </button>
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
        <div className="agent-loading">Loading pickup data...</div>
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
                <th>Amount</th>
                <th>Days Waiting</th>
                <th>{tab === 'pending' ? 'Priority' : 'Reason'}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="empty-row">No {tab} pickups found</td></tr>
              ) : filtered.map(o => (
                <tr key={o.order_id}>
                  <td><strong>#{o.order_id}</strong></td>
                  <td>{o.tracking_number}</td>
                  <td>{o.customer_name}</td>
                  <td>{o.customer_city}</td>
                  <td>{o.courier}</td>
                  <td>Rs. {o.order_amount?.toLocaleString()}</td>
                  <td><strong>{o.days_waiting}</strong></td>
                  <td>
                    {tab === 'pending' ? (
                      <span className={`table-badge ${o.priority === 'urgent' ? 'severity-critical' : 'severity-medium'}`}>
                        {o.priority}
                      </span>
                    ) : (
                      <span className="table-badge severity-high">{o.fail_reason}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="table-footer">Showing {filtered.length} of {list.length} orders</div>
        </div>
      )}
    </div>
  )
}
