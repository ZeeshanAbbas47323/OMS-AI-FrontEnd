import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import './HandoffAdmin.css'

const API = 'http://localhost:8001'

export default function HandoffAdmin() {
  const { theme, toggleTheme } = useTheme()
  const [tab, setTab] = useState('handoffs')
  const [handoffs, setHandoffs] = useState([])
  const [learned, setLearned] = useState([])
  const [stats, setStats] = useState(null)
  const [learnedStats, setLearnedStats] = useState(null)
  const [selectedHandoff, setSelectedHandoff] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [agentName, setAgentName] = useState('Human Agent')
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('')
  const [addForm, setAddForm] = useState({ question: '', answer: '', category: 'manual' })
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    fetchHandoffs()
    fetchStats()
    fetchLearned()
    fetchLearnedStats()
  }, [])

  const fetchHandoffs = async () => {
    try {
      const res = await fetch(`${API}/api/agent/handoffs?limit=100`)
      if (res.ok) setHandoffs(await res.json())
    } catch (e) { console.error(e) }
  }

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API}/api/agent/handoffs/stats`)
      if (res.ok) setStats(await res.json())
    } catch (e) {}
  }

  const fetchLearned = async () => {
    try {
      const res = await fetch(`${API}/api/agent/learned`)
      if (res.ok) setLearned(await res.json())
    } catch (e) {}
  }

  const fetchLearnedStats = async () => {
    try {
      const res = await fetch(`${API}/api/agent/learned/stats`)
      if (res.ok) setLearnedStats(await res.json())
    } catch (e) {}
  }

  const resolveHandoff = async () => {
    if (!selectedHandoff || !replyText.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/agent/handoffs/${selectedHandoff.handoff_id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: replyText, assigned_to: agentName }),
      })
      if (res.ok) {
        setSelectedHandoff(null)
        setReplyText('')
        fetchHandoffs()
        fetchStats()
        fetchLearned()
        fetchLearnedStats()
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const addLearnedEntry = async () => {
    if (!addForm.question.trim() || !addForm.answer.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/agent/learned`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })
      if (res.ok) {
        setAddForm({ question: '', answer: '', category: 'manual' })
        setShowAddForm(false)
        fetchLearned()
        fetchLearnedStats()
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const deleteLearnedEntry = async (id) => {
    try {
      await fetch(`${API}/api/agent/learned/${id}`, { method: 'DELETE' })
      fetchLearned()
      fetchLearnedStats()
    } catch (e) {}
  }

  const filteredHandoffs = handoffs.filter(h => {
    if (!filter) return true
    return h.status === filter
  })

  return (
    <div className="handoff-admin">
      <div className="handoff-admin-header">
        <div className="handoff-header-left">
          <Link to="/agents" className="back-link">← Agents</Link>
          <h1>🙋 Human Handoff & Auto-Learning</h1>
        </div>
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>

      {/* Stats Bar */}
      <div className="handoff-stats-bar">
        {stats && (
          <>
            <div className="handoff-stat">
              <span className="handoff-stat-value">{stats.pending}</span>
              <span className="handoff-stat-label">Pending</span>
            </div>
            <div className="handoff-stat">
              <span className="handoff-stat-value">{stats.assigned}</span>
              <span className="handoff-stat-label">Assigned</span>
            </div>
            <div className="handoff-stat">
              <span className="handoff-stat-value">{stats.resolved}</span>
              <span className="handoff-stat-label">Resolved</span>
            </div>
            <div className="handoff-stat">
              <span className="handoff-stat-value">{stats.auto_learned}</span>
              <span className="handoff-stat-label">Auto-Learned</span>
            </div>
          </>
        )}
        {learnedStats && (
          <>
            <div className="handoff-stat learned">
              <span className="handoff-stat-value">{learnedStats.total_learned}</span>
              <span className="handoff-stat-label">Knowledge Items</span>
            </div>
            <div className="handoff-stat learned">
              <span className="handoff-stat-value">{learnedStats.total_uses}</span>
              <span className="handoff-stat-label">Times Used</span>
            </div>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="handoff-tabs">
        <button className={`handoff-tab ${tab === 'handoffs' ? 'active' : ''}`} onClick={() => setTab('handoffs')}>
          Handoff Queue {stats?.pending > 0 && <span className="tab-badge">{stats.pending}</span>}
        </button>
        <button className={`handoff-tab ${tab === 'learned' ? 'active' : ''}`} onClick={() => setTab('learned')}>
          Learned Responses {learnedStats && <span className="tab-count">{learnedStats.total_learned}</span>}
        </button>
      </div>

      {/* Handoff Queue Tab */}
      {tab === 'handoffs' && (
        <div className="handoff-content">
          <div className="handoff-filters">
            <button className={`filter-btn ${filter === '' ? 'active' : ''}`} onClick={() => setFilter('')}>All</button>
            <button className={`filter-btn ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>Pending</button>
            <button className={`filter-btn ${filter === 'assigned' ? 'active' : ''}`} onClick={() => setFilter('assigned')}>Assigned</button>
            <button className={`filter-btn ${filter === 'resolved' ? 'active' : ''}`} onClick={() => setFilter('resolved')}>Resolved</button>
          </div>

          <div className="handoff-list">
            {filteredHandoffs.length === 0 ? (
              <div className="handoff-empty">No handoff tickets found</div>
            ) : (
              filteredHandoffs.map(h => (
                <div
                  key={h.handoff_id}
                  className={`handoff-item ${h.status} ${selectedHandoff?.handoff_id === h.handoff_id ? 'selected' : ''}`}
                  onClick={() => { setSelectedHandoff(h); setReplyText('') }}
                >
                  <div className="handoff-item-header">
                    <span className="handoff-item-id">{h.handoff_id}</span>
                    <span className={`handoff-status-badge ${h.status}`}>{h.status}</span>
                  </div>
                  <div className="handoff-item-query">{h.customer_query}</div>
                  <div className="handoff-item-meta">
                    <span className="handoff-item-reason">{h.reason}</span>
                    <span className="handoff-item-time">{new Date(h.created_at).toLocaleString()}</span>
                  </div>
                  {h.status === 'resolved' && (
                    <div className="handoff-item-reply">
                      <strong>{h.assigned_to}:</strong> {h.human_reply}
                      {h.auto_learned === 1 && <span className="auto-learned-tag">Auto-Learned</span>}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Reply Panel */}
          {selectedHandoff && selectedHandoff.status !== 'resolved' && (
            <div className="handoff-reply-panel">
              <h3>Reply to: {selectedHandoff.handoff_id}</h3>
              <div className="handoff-reply-query">
                <strong>Customer asked:</strong> {selectedHandoff.customer_query}
              </div>
              {selectedHandoff.conversation_context?.length > 0 && (
                <div className="handoff-context">
                  <strong>Conversation context:</strong>
                  {selectedHandoff.conversation_context.map((msg, i) => (
                    <div key={i} className={`context-msg ${msg.role}`}>
                      <span className="context-role">{msg.role}:</span> {msg.content}
                    </div>
                  ))}
                </div>
              )}
              <div className="handoff-reply-form">
                <input
                  className="handoff-agent-name"
                  value={agentName}
                  onChange={e => setAgentName(e.target.value)}
                  placeholder="Your name"
                />
                <textarea
                  className="handoff-reply-input"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Type your reply... (this will auto-learn into AI knowledge)"
                  rows={4}
                />
                <div className="handoff-reply-actions">
                  <span className="auto-learn-hint">This reply will be auto-learned by AI</span>
                  <button
                    className="handoff-resolve-btn"
                    onClick={resolveHandoff}
                    disabled={loading || !replyText.trim()}
                  >
                    {loading ? 'Resolving...' : 'Resolve & Auto-Learn'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Learned Responses Tab */}
      {tab === 'learned' && (
        <div className="handoff-content">
          <div className="learned-header-actions">
            <button className="add-learned-btn" onClick={() => setShowAddForm(!showAddForm)}>
              + Add Knowledge
            </button>
          </div>

          {showAddForm && (
            <div className="add-learned-form">
              <input
                placeholder="Question (e.g., What is your return policy?)"
                value={addForm.question}
                onChange={e => setAddForm(f => ({ ...f, question: e.target.value }))}
              />
              <textarea
                placeholder="Answer"
                value={addForm.answer}
                onChange={e => setAddForm(f => ({ ...f, answer: e.target.value }))}
                rows={3}
              />
              <div className="add-learned-actions">
                <select value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="manual">Manual</option>
                  <option value="general">General</option>
                  <option value="policy">Policy</option>
                  <option value="product">Product</option>
                  <option value="shipping">Shipping</option>
                </select>
                <button onClick={addLearnedEntry} disabled={loading}>Save</button>
                <button className="cancel-btn" onClick={() => setShowAddForm(false)}>Cancel</button>
              </div>
            </div>
          )}

          <div className="learned-list">
            {learned.length === 0 ? (
              <div className="handoff-empty">No learned responses yet. Resolve handoffs or add manually.</div>
            ) : (
              learned.map(l => (
                <div key={l.id} className="learned-item">
                  <div className="learned-item-header">
                    <span className={`learned-category ${l.category}`}>{l.category}</span>
                    <span className="learned-uses">Used {l.use_count}x</span>
                    <button className="learned-delete" onClick={() => deleteLearnedEntry(l.id)}>Delete</button>
                  </div>
                  <div className="learned-question"><strong>Q:</strong> {l.question}</div>
                  <div className="learned-answer"><strong>A:</strong> {l.answer}</div>
                  <div className="learned-meta">
                    Added: {new Date(l.created_at).toLocaleDateString()} |
                    Last used: {new Date(l.updated_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
