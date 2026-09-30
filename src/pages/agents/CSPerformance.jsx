import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { Link } from 'react-router-dom'
import './AgentPage.css'
import { API_BASE } from '../../config'

const API = API_BASE

export default function CSPerformance() {
  const { theme, toggleTheme } = useTheme()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('agents')

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/agents/cs-performance`)
      setData(await res.json())
    } catch { setData(null) }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const s = data?.summary || {}

  return (
    <div className="agent-page">
      <div className="agent-page-header">
        <div className="agent-page-back">
          <Link to="/agents" className="back-link">← Agents</Link>
          <div>
            <h1>📈 CS Performance Agent</h1>
            <p>Agent and team performance metrics and trends</p>
          </div>
        </div>
        <button className="agent-theme-btn" onClick={toggleTheme}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>

      {data?.summary && (
        <div className="agent-stats-row">
          <div className="agent-stat-card">
            <div className="agent-stat-value">{s.team_size}</div>
            <div className="agent-stat-label">Team Size</div>
          </div>
          <div className="agent-stat-card" style={{borderLeft: '3px solid #3498db'}}>
            <div className="agent-stat-value">{s.total_assigned}</div>
            <div className="agent-stat-label">Tickets Assigned</div>
          </div>
          <div className="agent-stat-card" style={{borderLeft: '3px solid #27ae60'}}>
            <div className="agent-stat-value">{s.team_resolution_rate}%</div>
            <div className="agent-stat-label">Resolution Rate</div>
          </div>
          <div className="agent-stat-card" style={{borderLeft: '3px solid #e67e22'}}>
            <div className="agent-stat-value">{s.avg_response_min}m</div>
            <div className="agent-stat-label">Avg Response</div>
          </div>
          <div className="agent-stat-card" style={{borderLeft: '3px solid #9b59b6'}}>
            <div className="agent-stat-value">{s.team_satisfaction}/5</div>
            <div className="agent-stat-label">Satisfaction</div>
          </div>
        </div>
      )}

      <div className="agent-tab-row">
        <button className={`tab-btn ${activeTab === 'agents' ? 'active' : ''}`} onClick={() => setActiveTab('agents')}>Agent Metrics</button>
        <button className={`tab-btn ${activeTab === 'trend' ? 'active' : ''}`} onClick={() => setActiveTab('trend')}>7-Day Trend</button>
      </div>

      {loading ? (
        <div className="agent-loading">Loading performance data...</div>
      ) : (
        <>
          {activeTab === 'agents' && data?.agents && (
            <div className="agent-table-wrapper">
              <table className="agent-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Assigned</th>
                    <th>Resolved</th>
                    <th>Rate</th>
                    <th>Escalated</th>
                    <th>Avg Response</th>
                    <th>Avg Resolution</th>
                    <th>CSAT</th>
                    <th>Top Categories</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.agents)
                    .sort((a, b) => b[1].resolution_rate - a[1].resolution_rate)
                    .map(([name, m]) => (
                      <tr key={name}>
                        <td><strong>{name}</strong></td>
                        <td>{m.assigned}</td>
                        <td>{m.resolved}</td>
                        <td>
                          <span className={`table-badge ${m.resolution_rate >= 50 ? 'severity-low' : m.resolution_rate >= 30 ? 'severity-medium' : 'severity-high'}`}>
                            {m.resolution_rate}%
                          </span>
                        </td>
                        <td>{m.escalated}</td>
                        <td>{m.avg_response_min}m</td>
                        <td>{m.avg_resolution_hrs}h</td>
                        <td>
                          <span className={`table-badge ${m.satisfaction_score >= 4.0 ? 'severity-low' : m.satisfaction_score >= 3.5 ? 'severity-medium' : 'severity-high'}`}>
                            {m.satisfaction_score}/5
                          </span>
                        </td>
                        <td>
                          <div className="flag-chips">
                            {m.top_categories.map((cat, i) => (
                              <span key={i} className="flag-chip">{cat}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'trend' && data?.daily_trend && (
            <div className="agent-table-wrapper">
              <table className="agent-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Tickets</th>
                    <th>Resolved</th>
                    <th>Resolution Rate</th>
                    <th>Avg Response</th>
                  </tr>
                </thead>
                <tbody>
                  {data.daily_trend.map(d => (
                    <tr key={d.date}>
                      <td><strong>{d.date}</strong></td>
                      <td>{d.tickets}</td>
                      <td>{d.resolved}</td>
                      <td>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                          <div className="status-bar-track" style={{flex: 1, maxWidth: '100px'}}>
                            <div className="status-bar-fill" style={{width: `${(d.resolved / d.tickets * 100).toFixed(0)}%`, background: '#27ae60'}}></div>
                          </div>
                          <span>{(d.resolved / d.tickets * 100).toFixed(1)}%</span>
                        </div>
                      </td>
                      <td>{d.avg_response_min}m</td>
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
