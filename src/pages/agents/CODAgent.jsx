import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { Link } from 'react-router-dom'
import './AgentPage.css'

const API = 'http://localhost:8001'

export default function CODAgent() {
  const { theme, toggleTheme } = useTheme()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/agents/cod`)
      setData(await res.json())
    } catch { setData(null) }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const fmt = (n) => `Rs. ${(n || 0).toLocaleString()}`

  return (
    <div className="agent-page">
      <div className="agent-page-header">
        <div className="agent-page-back">
          <Link to="/agents" className="back-link">← Agents</Link>
          <div>
            <h1>💵 COD Agent</h1>
            <p>COD remittance tracking, verification, reconciliation</p>
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
              <div className="agent-stat-value">{data.summary.total_cod_orders}</div>
              <div className="agent-stat-label">Total COD Orders</div>
            </div>
            <div className="agent-stat-card" style={{borderLeft: '3px solid #27ae60'}}>
              <div className="agent-stat-value">{data.summary.cod_delivered}</div>
              <div className="agent-stat-label">COD Delivered</div>
            </div>
            <div className="agent-stat-card" style={{borderLeft: '3px solid #f39c12'}}>
              <div className="agent-stat-value">{data.summary.cod_pending_delivery}</div>
              <div className="agent-stat-label">Pending Delivery</div>
            </div>
            <div className="agent-stat-card" style={{borderLeft: '3px solid #e74c3c'}}>
              <div className="agent-stat-value">{data.summary.cod_returned}</div>
              <div className="agent-stat-label">COD Returned</div>
            </div>
          </div>

          <div className="agent-stats-row">
            <div className="agent-stat-card" style={{borderLeft: '3px solid #2ecc71'}}>
              <div className="agent-stat-value">{fmt(data.summary.collected)}</div>
              <div className="agent-stat-label">Collected</div>
            </div>
            <div className="agent-stat-card" style={{borderLeft: '3px solid #e67e22'}}>
              <div className="agent-stat-value">{fmt(data.summary.remittance_pending)}</div>
              <div className="agent-stat-label">Remittance Pending</div>
            </div>
            <div className="agent-stat-card" style={{borderLeft: '3px solid #3498db'}}>
              <div className="agent-stat-value">{data.summary.collection_rate}%</div>
              <div className="agent-stat-label">Collection Rate</div>
            </div>
            <div className="agent-stat-card" style={{borderLeft: '3px solid #9b59b6'}}>
              <div className="agent-stat-value">{fmt(data.summary.pending_delivery_amount)}</div>
              <div className="agent-stat-label">Pending COD Amount</div>
            </div>
          </div>

          {data.summary.by_courier && Object.keys(data.summary.by_courier).length > 0 && (
            <div className="reason-chips-section">
              <h3>COD by Courier</h3>
              <div className="reason-chips">
                {Object.entries(data.summary.by_courier).map(([courier, info]) => (
                  <span key={courier} className="reason-chip">
                    {courier}: <strong>{info.delivered} orders</strong> — {fmt(info.amount)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="agent-controls-row">
        <div className="tab-btns">
          <button className={`tab-btn ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>
            Overview
          </button>
          <button className={`tab-btn ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
            Pending ({data?.pending_orders?.length || 0})
          </button>
          <button className={`tab-btn ${tab === 'returned' ? 'active' : ''}`} onClick={() => setTab('returned')}>
            Returned ({data?.returned_orders?.length || 0})
          </button>
        </div>
        <button className="refresh-btn" onClick={fetchData}>Refresh</button>
      </div>

      {loading ? (
        <div className="agent-loading">Loading COD data...</div>
      ) : tab === 'overview' ? (
        <div className="agent-loading">Select "Pending" or "Returned" tab to view orders</div>
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
                <th>Status</th>
                {tab === 'returned' && <th>Reason</th>}
              </tr>
            </thead>
            <tbody>
              {(tab === 'pending' ? data?.pending_orders : data?.returned_orders || []).length === 0 ? (
                <tr><td colSpan={tab === 'returned' ? 8 : 7} className="empty-row">No orders found</td></tr>
              ) : (tab === 'pending' ? data?.pending_orders : data?.returned_orders || []).map(o => (
                <tr key={o.order_id}>
                  <td><strong>#{o.order_id}</strong></td>
                  <td>{o.tracking_number}</td>
                  <td>{o.customer_name}</td>
                  <td>{o.customer_city}</td>
                  <td>{o.courier}</td>
                  <td>{fmt(o.order_amount)}</td>
                  <td><span className={`table-badge status-${o.status.toLowerCase().replace(/\s+/g, '-')}`}>{o.status}</span></td>
                  {tab === 'returned' && <td>{o.return_reason || '—'}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
