import { useEffect, useState } from 'react'
import { API_BASE } from '../config'
import './ConversationSidebar.css'

/**
 * The account's past conversations.
 *
 * Threads are listed newest first and named after the first thing asked,
 * which is how people look for one — by what it was about, not when it
 * started. The list belongs to the signed-in account; the backend scopes it
 * and will not return anyone else's.
 */
export default function ConversationSidebar({
  currentId, onSelect, onNew, refreshToken, collapsed, onToggle,
}) {
  const [conversations, setConversations] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [menuFor, setMenuFor] = useState(null)

  const load = async (query = '') => {
    try {
      const res = await fetch(
        `${API_BASE}/api/conversations?limit=100${query ? `&search=${encodeURIComponent(query)}` : ''}`)
      if (!res.ok) return
      const data = await res.json()
      setConversations(data.conversations || [])
    } catch {
      /* the sidebar is not worth an error banner; the chat still works */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(search) }, [refreshToken])

  useEffect(() => {
    const timer = setTimeout(() => load(search), 250)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const remove = async (id, event) => {
    event.stopPropagation()
    setMenuFor(null)
    await fetch(`${API_BASE}/api/conversations/${id}`, { method: 'DELETE' })
    setConversations(prev => prev.filter(c => c.session_id !== id))
    if (id === currentId) onNew()
  }

  const rename = async (conversation, event) => {
    event.stopPropagation()
    setMenuFor(null)
    const title = window.prompt('Rename conversation', conversation.title)
    if (!title?.trim()) return
    await fetch(`${API_BASE}/api/conversations/${conversation.session_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim() }),
    })
    load(search)
  }

  if (collapsed) {
    return (
      <button className="sidebar-reopen" onClick={onToggle} title="Show conversations">
        ☰
      </button>
    )
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <button className="sidebar-new" onClick={onNew}>
          <span aria-hidden="true">＋</span> New chat
        </button>
        <button className="sidebar-collapse" onClick={onToggle} title="Hide conversations">
          ‹
        </button>
      </div>

      <input
        className="sidebar-search"
        placeholder="Search conversations"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="sidebar-list">
        {loading && <p className="sidebar-note">Loading…</p>}

        {!loading && conversations.length === 0 && (
          <p className="sidebar-note">
            {search ? 'Nothing matches that.' : 'Your conversations will appear here.'}
          </p>
        )}

        {conversations.map(conversation => (
          <div
            key={conversation.session_id}
            className={`sidebar-item ${conversation.session_id === currentId ? 'active' : ''}`}
            onClick={() => onSelect(conversation.session_id)}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && onSelect(conversation.session_id)}
          >
            <div className="sidebar-item-body">
              <span className="sidebar-item-title">{conversation.title}</span>
              <span className="sidebar-item-meta">
                {conversation.message_count} messages · {relativeTime(conversation.last_activity)}
              </span>
            </div>

            <button
              className="sidebar-item-more"
              onClick={e => {
                e.stopPropagation()
                setMenuFor(menuFor === conversation.session_id ? null : conversation.session_id)
              }}
              title="More"
            >
              ⋯
            </button>

            {menuFor === conversation.session_id && (
              <div className="sidebar-menu">
                <button onClick={e => rename(conversation, e)}>Rename</button>
                <button className="danger" onClick={e => remove(conversation.session_id, e)}>
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  )
}

function relativeTime(iso) {
  const then = new Date(iso)
  const minutes = Math.round((Date.now() - then.getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return then.toLocaleDateString()
}
