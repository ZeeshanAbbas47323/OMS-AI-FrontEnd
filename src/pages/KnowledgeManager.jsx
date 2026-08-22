import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '../context/ThemeContext'
import './KnowledgeManager.css'

const API = 'http://localhost:8001'

export default function KnowledgeManager() {
  const { theme, toggleTheme } = useTheme()
  const [stats, setStats] = useState(null)
  const [entries, setEntries] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [newText, setNewText] = useState('')
  const [newCategory, setNewCategory] = useState('general')
  const [ingesting, setIngesting] = useState(false)
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('browse')

  const fetchKnowledge = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/knowledge`)
      const data = await res.json()
      setStats(data.stats || null)
      setEntries(data.entries || [])
    } catch {
      setStats(null)
      setEntries([])
    }
  }, [])

  useEffect(() => {
    fetchKnowledge().finally(() => setLoading(false))
  }, [fetchKnowledge])

  const handleIngest = async () => {
    setIngesting(true)
    try {
      const res = await fetch(`${API}/admin/knowledge/ingest`, { method: 'POST' })
      const data = await res.json()
      alert(`Ingestion complete: ${data.files_processed} files, ${data.total_chunks} chunks`)
      fetchKnowledge()
    } catch {
      alert('Ingestion failed')
    }
    setIngesting(false)
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newText.trim()) return
    setAdding(true)
    try {
      const res = await fetch(`${API}/admin/knowledge/add?text=${encodeURIComponent(newText)}&category=${newCategory}`, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.success) {
        setNewText('')
        fetchKnowledge()
      }
    } catch {
      alert('Failed to add knowledge')
    }
    setAdding(false)
  }

  const handleDelete = async (docId) => {
    if (!confirm('Delete this knowledge entry?')) return
    try {
      await fetch(`${API}/admin/knowledge/${docId}`, { method: 'DELETE' })
      fetchKnowledge()
      if (searchResults) handleSearch()
    } catch {
      alert('Delete failed')
    }
  }

  const handleSearch = async (e) => {
    if (e) e.preventDefault()
    if (!searchQuery.trim()) {
      setSearchResults(null)
      return
    }
    try {
      const res = await fetch(`${API}/admin/knowledge/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      setSearchResults(data.results || [])
    } catch {
      setSearchResults([])
    }
  }

  if (loading) return <div className="km-loading">Loading knowledge base...</div>

  return (
    <div className="km-panel">
      <div className="km-header">
        <div>
          <h1>📚 Knowledge Manager</h1>
          <p>Manage RAG knowledge base for Orio AI</p>
        </div>
        <div className="km-header-actions">
          <a href="/admin" className="km-nav-btn">🛡️ Admin</a>
          <a href="/dashboard" className="km-nav-btn">📊 Dashboard</a>
          <button className="km-theme-btn" onClick={toggleTheme}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>

      {stats && (
        <div className="km-stats-row">
          <div className="km-stat-card">
            <div className="km-stat-value">{stats.total_documents || 0}</div>
            <div className="km-stat-label">Documents</div>
          </div>
          <div className="km-stat-card">
            <div className="km-stat-value">{stats.total_chunks || 0}</div>
            <div className="km-stat-label">Chunks</div>
          </div>
          <div className="km-stat-card">
            <div className="km-stat-value">
              {[...new Set((entries || []).map(e => e.metadata?.category))].length}
            </div>
            <div className="km-stat-label">Categories</div>
          </div>
          <div className="km-stat-card accent">
            <button className="km-ingest-btn" onClick={handleIngest} disabled={ingesting}>
              {ingesting ? '⏳ Ingesting...' : '🔄 Re-ingest Files'}
            </button>
          </div>
        </div>
      )}

      <div className="km-tabs">
        <button className={`km-tab ${tab === 'browse' ? 'active' : ''}`} onClick={() => setTab('browse')}>
          📄 Browse ({entries.length})
        </button>
        <button className={`km-tab ${tab === 'search' ? 'active' : ''}`} onClick={() => setTab('search')}>
          🔍 Search
        </button>
        <button className={`km-tab ${tab === 'add' ? 'active' : ''}`} onClick={() => setTab('add')}>
          ➕ Add Knowledge
        </button>
      </div>

      <div className="km-content">
        {tab === 'browse' && (
          <div className="km-entries">
            {entries.length === 0 ? (
              <div className="km-empty">
                No knowledge entries yet. Add documents to <code>data/knowledge/</code> and click Re-ingest,
                or use the Add tab to add knowledge manually.
              </div>
            ) : (
              entries.map((entry, i) => (
                <div key={entry.id || i} className="km-entry-card">
                  <div className="km-entry-header">
                    <span className="km-entry-id">{entry.id || `doc_${i}`}</span>
                    <div className="km-entry-actions">
                      <span className={`km-category-badge ${entry.metadata?.category || 'general'}`}>
                        {entry.metadata?.category || 'general'}
                      </span>
                      <button className="km-delete-btn" onClick={() => handleDelete(entry.id)}>🗑️</button>
                    </div>
                  </div>
                  <div className="km-entry-text">
                    {(entry.document || '').slice(0, 200)}{(entry.document || '').length > 200 ? '...' : ''}
                  </div>
                  {entry.metadata?.source && (
                    <div className="km-entry-source">Source: {entry.metadata.source}</div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'search' && (
          <div className="km-search-panel">
            <form onSubmit={handleSearch} className="km-search-form">
              <input
                type="text"
                placeholder="Search knowledge base (semantic search)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit">🔍 Search</button>
            </form>

            {searchResults !== null && (
              <div className="km-search-results">
                <h3>Results ({searchResults.length})</h3>
                {searchResults.length === 0 ? (
                  <div className="km-empty">No matching results found.</div>
                ) : (
                  searchResults.map((r, i) => (
                    <div key={i} className="km-result-card">
                      <div className="km-result-header">
                        <span className="km-result-score">
                          {(r.similarity * 100).toFixed(0)}% match
                        </span>
                        <span className={`km-category-badge ${r.metadata?.category || 'general'}`}>
                          {r.metadata?.category || 'general'}
                        </span>
                      </div>
                      <div className="km-entry-text">{r.document}</div>
                      {r.metadata?.source && (
                        <div className="km-entry-source">Source: {r.metadata.source}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'add' && (
          <div className="km-add-panel">
            <form onSubmit={handleAdd} className="km-add-form">
              <label>Category</label>
              <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                <option value="general">General</option>
                <option value="policy">Policy</option>
                <option value="faq">FAQ</option>
                <option value="sop">SOP</option>
                <option value="product">Product</option>
                <option value="announcement">Announcement</option>
              </select>

              <label>Knowledge Text</label>
              <textarea
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Enter knowledge text... e.g. 'Our return policy allows 7-day returns for all products.'"
                rows={6}
              />

              <button type="submit" disabled={adding || !newText.trim()}>
                {adding ? '⏳ Adding...' : '➕ Add to Knowledge Base'}
              </button>
            </form>

            <div className="km-add-tips">
              <h4>Tips</h4>
              <ul>
                <li>You can also train Orio via chat: type <code>Train: your knowledge here</code></li>
                <li>Place <code>.md</code>, <code>.txt</code>, or <code>.csv</code> files in <code>data/knowledge/</code> folders and click Re-ingest</li>
                <li>Supported folders: policies, faqs, sops, products, announcements</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
