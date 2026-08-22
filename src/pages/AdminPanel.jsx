import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '../context/ThemeContext'
import './AdminPanel.css'

const API = 'http://localhost:8001'

export default function AdminPanel() {
  const { theme, toggleTheme } = useTheme()
  const [sessions, setSessions] = useState([])
  const [stats, setStats] = useState(null)
  const [selectedSession, setSelectedSession] = useState(null)
  const [sessionDetail, setSessionDetail] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchSessions = useCallback(async () => {
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : ''
      const res = await fetch(`${API}/admin/sessions${q}`)
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch { setSessions([]) }
  }, [search])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/stats`)
      setStats(await res.json())
    } catch { setStats(null) }
  }, [])

  useEffect(() => {
    Promise.all([fetchSessions(), fetchStats()]).finally(() => setLoading(false))
  }, [fetchSessions, fetchStats])

  const openSession = async (sid) => {
    setSelectedSession(sid)
    try {
      const res = await fetch(`${API}/admin/sessions/${sid}`)
      setSessionDetail(await res.json())
    } catch { setSessionDetail(null) }
  }

  const deleteSession = async (sid) => {
    await fetch(`${API}/admin/sessions/${sid}`, { method: 'DELETE' })
    setSelectedSession(null)
    setSessionDetail(null)
    fetchSessions()
    fetchStats()
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchSessions()
  }

  const formatTime = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleString()
  }

  if (loading) return <div className="admin-loading">Loading admin panel...</div>

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div>
          <h1>🛡️ Admin Panel</h1>
          <p>Chat sessions & conversation history</p>
        </div>
        <div className="admin-header-actions">
          <a href="/agents" className="admin-nav-btn">🤖 Agents</a>
          <a href="/admin/knowledge" className="admin-nav-btn">📚 Knowledge</a>
          <a href="/dashboard" className="admin-nav-btn">📊 Dashboard</a>
          <button className="admin-theme-btn" onClick={toggleTheme}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>

      {stats && (
        <div className="admin-stats-row">
          <div className="admin-stat-card">
            <div className="admin-stat-value">{stats.total_sessions}</div>
            <div className="admin-stat-label">Total Sessions</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">{stats.total_messages}</div>
            <div className="admin-stat-label">Total Messages</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">
              {Object.keys(stats.intent_breakdown || {}).length}
            </div>
            <div className="admin-stat-label">Intent Types</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">
              {stats.total_sessions > 0
                ? Math.round(stats.total_messages / stats.total_sessions)
                : 0}
            </div>
            <div className="admin-stat-label">Avg Msgs/Session</div>
          </div>
        </div>
      )}

      {stats?.intent_breakdown && Object.keys(stats.intent_breakdown).length > 0 && (
        <div className="admin-intent-bar">
          <h3>Intent Distribution</h3>
          <div className="intent-chips">
            {Object.entries(stats.intent_breakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([intent, count]) => (
                <span key={intent} className="intent-chip">
                  {intent.replace(/_/g, ' ')} <strong>{count}</strong>
                </span>
              ))}
          </div>
        </div>
      )}

      <div className="admin-content">
        <div className={`admin-sessions-list ${selectedSession ? 'has-detail' : ''}`}>
          <div className="sessions-header">
            <h2>Sessions ({sessions.length})</h2>
            <form onSubmit={handleSearch} className="admin-search">
              <input
                type="text"
                placeholder="Search messages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit">🔍</button>
            </form>
          </div>

          {sessions.length === 0 ? (
            <div className="no-sessions">
              No chat sessions yet. Start a conversation to see history here.
            </div>
          ) : (
            <div className="sessions-scroll">
              {sessions.map((s) => (
                <div
                  key={s.session_id}
                  className={`session-card ${selectedSession === s.session_id ? 'active' : ''}`}
                  onClick={() => openSession(s.session_id)}
                >
                  <div className="session-card-header">
                    <span className="session-id">{s.session_id.slice(0, 12)}...</span>
                    <span className="session-msgs">{s.message_count} msgs</span>
                  </div>
                  <div className="session-preview">{s.preview || 'No messages'}</div>
                  <div className="session-meta">
                    <span>{formatTime(s.last_activity)}</span>
                    <div className="session-intents">
                      {s.intents.slice(0, 3).map((i) => (
                        <span key={i} className="mini-badge">{i.replace(/_/g, ' ')}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedSession && sessionDetail && (
          <div className="admin-chat-detail">
            <div className="detail-header">
              <div>
                <h2>Session Detail</h2>
                <span className="detail-sid">{selectedSession}</span>
              </div>
              <div className="detail-actions">
                <button className="delete-btn" onClick={() => deleteSession(selectedSession)}>
                  🗑️ Delete
                </button>
                <button className="close-detail-btn" onClick={() => {
                  setSelectedSession(null)
                  setSessionDetail(null)
                }}>✕</button>
              </div>
            </div>

            <div className="detail-info">
              <span>Started: {formatTime(sessionDetail.started_at)}</span>
              <span>Last: {formatTime(sessionDetail.last_activity)}</span>
              <span>Messages: {sessionDetail.messages?.length || 0}</span>
            </div>

            <div className="detail-messages">
              {(sessionDetail.messages || []).map((m, i) => (
                <div key={i} className={`detail-msg ${m.role}`}>
                  <div className="detail-msg-header">
                    <span className={`role-badge ${m.role}`}>
                      {m.role === 'user' ? '👤 User' : '🤖 Orio'}
                    </span>
                    <span className="msg-time">{formatTime(m.timestamp)}</span>
                    {m.intent && <span className="msg-intent">{m.intent}</span>}
                  </div>
                  <div className="detail-msg-text">{m.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
