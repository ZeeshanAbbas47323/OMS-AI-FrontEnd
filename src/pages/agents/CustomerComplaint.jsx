import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { Link } from 'react-router-dom'
import './AgentPage.css'

const API = 'http://localhost:8001'

export default function CustomerComplaint() {
  const { theme, toggleTheme } = useTheme()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/agents/complaints`)
      setData(await res.json())
    } catch { setData(null) }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const filtered = (data?.complaints || []).filter(c => {
    if (filterType !== 'all' && c.type !== filterType) return false
    if (filterPriority !== 'all' && c.priority !== filterPriority) return false
    if (filterStatus !== 'all' && c.status !== filterStatus) return false
    return true
  })

  const types = [...new Set((data?.complaints || []).map(c => c.type))].sort()

  return (
    <div className="agent-page">
      <div className="agent-page-header">
        <div className="agent-page-back">
          <Link to="/agents" className="back-link">← Agents</Link>
          <div>
            <h1>😤 Customer Complaint Agent</h1>
            <p>Log, categorize, and track customer complaints</p>
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
              <div className="agent-stat-value">{data.summary.total_complaints}</div>
              <div className="agent-stat-label">Total Complaints</div>
            </div>
            <div className="agent-stat-card" style={{borderLeft: '3px solid #e74c3c'}}>
              <div className="agent-stat-value">{data.summary.open}</div>
              <div className="agent-stat-label">Open</div>
            </div>
            <div className="agent-stat-card" style={{borderLeft: '3px solid #27ae60'}}>
              <div className="agent-stat-value">{data.summary.resolved}</div>
              <div className="agent-stat-label">Resolved</div>
            </div>
            <div className="agent-stat-card" style={{borderLeft: '3px solid #3498db'}}>
              <div className="agent-stat-value">
                {data.summary.total_complaints > 0 ? Math.round(data.summary.resolved / data.summary.total_complaints * 100) : 0}%
              </div>
              <div className="agent-stat-label">Resolution Rate</div>
            </div>
          </div>

          <div className="reason-chips-section">
            <h3>Complaint Types</h3>
            <div className="reason-chips">
              {Object.entries(data.summary.by_type)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <span key={type} className="reason-chip">{type} <strong>{count}</strong></span>
                ))}
            </div>
          </div>
        </>
      )}

      <div className="agent-controls-row">
        <div className="control-group">
          <label>Type:</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="control-group">
          <label>Priority:</label>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="control-group">
          <label>Status:</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
        <button className="refresh-btn" onClick={fetchData}>Refresh</button>
      </div>

      {loading ? (
        <div className="agent-loading">Loading complaints...</div>
      ) : (
        <div className="agent-table-wrapper">
          <table className="agent-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Order</th>
                <th>Customer</th>
                <th>City</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Days Open</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="empty-row">No complaints found</td></tr>
              ) : filtered.map(c => (
                <tr key={c.complaint_id}>
                  <td><strong>{c.complaint_id}</strong></td>
                  <td>#{c.order_id}</td>
                  <td>{c.customer_name}</td>
                  <td>{c.customer_city}</td>
                  <td>{c.type}</td>
                  <td><span className={`table-badge severity-${c.priority}`}>{c.priority}</span></td>
                  <td><span className={`table-badge complaint-${c.status.toLowerCase().replace(/\s+/g, '-')}`}>{c.status}</span></td>
                  <td>{c.days_open}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="table-footer">Showing {filtered.length} of {data?.complaints?.length || 0} complaints</div>
        </div>
      )}
    </div>
  )
}
