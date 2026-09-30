import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { Link } from 'react-router-dom'
import './AgentPage.css'
import { API_BASE } from '../../config'

const API = API_BASE

export default function DailyCSReport() {
  const { theme, toggleTheme } = useTheme()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/agents/daily-report`)
      setData(await res.json())
    } catch { setData(null) }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const fmt = (n) => `Rs. ${(n || 0).toLocaleString()}`
  const s = data?.summary || {}

  return (
    <div className="agent-page">
      <div className="agent-page-header">
        <div className="agent-page-back">
          <Link to="/agents" className="back-link">← Agents</Link>
          <div>
            <h1>📋 Daily CS Report</h1>
            <p>Daily summary — tickets, resolution rate, SLA performance</p>
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
              <div className="agent-stat-value">{s.total_orders}</div>
              <div className="agent-stat-label">Total Orders</div>
            </div>
            <div className="agent-stat-card" style={{borderLeft: '3px solid #27ae60'}}>
              <div className="agent-stat-value">{s.delivered}</div>
              <div className="agent-stat-label">Delivered ({s.delivery_rate}%)</div>
            </div>
            <div className="agent-stat-card" style={{borderLeft: '3px solid #e74c3c'}}>
              <div className="agent-stat-value">{s.returns}</div>
              <div className="agent-stat-label">Returns ({s.return_rate}%)</div>
            </div>
            <div className="agent-stat-card" style={{borderLeft: '3px solid #3498db'}}>
              <div className="agent-stat-value">{s.in_transit}</div>
              <div className="agent-stat-label">In Transit</div>
            </div>
          </div>
          <div className="agent-stats-row">
            <div className="agent-stat-card" style={{borderLeft: '3px solid #e67e22'}}>
              <div className="agent-stat-value">{s.stuck}</div>
              <div className="agent-stat-label">Stuck Orders</div>
            </div>
            <div className="agent-stat-card" style={{borderLeft: '3px solid #9b59b6'}}>
              <div className="agent-stat-value">{s.replacements}</div>
              <div className="agent-stat-label">Replacements</div>
            </div>
            <div className="agent-stat-card" style={{borderLeft: '3px solid #2ecc71'}}>
              <div className="agent-stat-value">{fmt(s.total_revenue)}</div>
              <div className="agent-stat-label">Revenue (Delivered)</div>
            </div>
            <div className="agent-stat-card" style={{borderLeft: '3px solid #f39c12'}}>
              <div className="agent-stat-value">{s.ndr_count}</div>
              <div className="agent-stat-label">NDR Cases</div>
            </div>
          </div>
        </>
      )}

      {data?.alerts && data.alerts.length > 0 && (
        <div className="alerts-section">
          {data.alerts.map((alert, i) => (
            <div key={i} className={`alert-item alert-${alert.type}`}>
              <span className="alert-icon">
                {alert.type === 'warning' ? '⚠️' : alert.type === 'alert' ? '🚨' : 'ℹ️'}
              </span>
              {alert.message}
            </div>
          ))}
        </div>
      )}

      <div className="agent-tab-row">
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`tab-btn ${activeTab === 'courier' ? 'active' : ''}`} onClick={() => setActiveTab('courier')}>Courier Performance</button>
        <button className={`tab-btn ${activeTab === 'cities' ? 'active' : ''}`} onClick={() => setActiveTab('cities')}>Top Cities</button>
      </div>

      {loading ? (
        <div className="agent-loading">Generating daily report...</div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <div className="report-overview">
              <div className="report-section">
                <h3>Payment Breakdown</h3>
                <div className="reason-chips">
                  <span className="reason-chip">COD Orders: <strong>{s.cod_orders}</strong></span>
                  <span className="reason-chip">Prepaid Orders: <strong>{s.prepaid_orders}</strong></span>
                  <span className="reason-chip">Shipping Cost: <strong>{fmt(s.total_shipping)}</strong></span>
                  <span className="reason-chip">High Value Pending: <strong>{s.high_value_pending}</strong></span>
                </div>
              </div>
              <div className="report-section">
                <h3>Status Breakdown</h3>
                <div className="status-bars">
                  <div className="status-bar-item">
                    <span className="status-bar-label">Delivered</span>
                    <div className="status-bar-track">
                      <div className="status-bar-fill" style={{width: `${s.delivery_rate}%`, background: '#27ae60'}}></div>
                    </div>
                    <span className="status-bar-value">{s.delivery_rate}%</span>
                  </div>
                  <div className="status-bar-item">
                    <span className="status-bar-label">Returns</span>
                    <div className="status-bar-track">
                      <div className="status-bar-fill" style={{width: `${s.return_rate}%`, background: '#e74c3c'}}></div>
                    </div>
                    <span className="status-bar-value">{s.return_rate}%</span>
                  </div>
                  <div className="status-bar-item">
                    <span className="status-bar-label">In Transit</span>
                    <div className="status-bar-track">
                      <div className="status-bar-fill" style={{width: `${(s.in_transit / s.total_orders * 100).toFixed(1)}%`, background: '#3498db'}}></div>
                    </div>
                    <span className="status-bar-value">{(s.in_transit / s.total_orders * 100).toFixed(1)}%</span>
                  </div>
                  <div className="status-bar-item">
                    <span className="status-bar-label">Stuck</span>
                    <div className="status-bar-track">
                      <div className="status-bar-fill" style={{width: `${(s.stuck / s.total_orders * 100).toFixed(1)}%`, background: '#e67e22'}}></div>
                    </div>
                    <span className="status-bar-value">{(s.stuck / s.total_orders * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'courier' && data?.courier_performance && (
            <div className="agent-table-wrapper">
              <table className="agent-table">
                <thead>
                  <tr>
                    <th>Courier</th>
                    <th>Total</th>
                    <th>Delivered</th>
                    <th>Returned</th>
                    <th>Stuck</th>
                    <th>Delivery Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.courier_performance)
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([courier, perf]) => (
                      <tr key={courier}>
                        <td><strong>{courier}</strong></td>
                        <td>{perf.total}</td>
                        <td><span className="table-badge severity-low">{perf.delivered}</span></td>
                        <td><span className="table-badge severity-high">{perf.returned}</span></td>
                        <td><span className="table-badge severity-medium">{perf.stuck}</span></td>
                        <td>
                          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <div className="status-bar-track" style={{flex: 1, maxWidth: '100px'}}>
                              <div className="status-bar-fill" style={{width: `${perf.delivery_rate}%`, background: perf.delivery_rate >= 30 ? '#27ae60' : '#e74c3c'}}></div>
                            </div>
                            <strong>{perf.delivery_rate}%</strong>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'cities' && data?.top_cities && (
            <div className="agent-table-wrapper">
              <table className="agent-table">
                <thead>
                  <tr>
                    <th>City</th>
                    <th>Total Orders</th>
                    <th>Delivered</th>
                    <th>Returned</th>
                    <th>Success Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_cities.map(c => (
                    <tr key={c.city}>
                      <td><strong>{c.city}</strong></td>
                      <td>{c.total}</td>
                      <td><span className="table-badge severity-low">{c.delivered}</span></td>
                      <td><span className="table-badge severity-high">{c.returned}</span></td>
                      <td>{c.total > 0 ? (c.delivered / c.total * 100).toFixed(1) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
