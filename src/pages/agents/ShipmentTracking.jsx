import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { Link } from 'react-router-dom'
import OrderTimeline from '../../components/OrderTimeline'
import './AgentPage.css'

const API = 'http://localhost:8001'

export default function ShipmentTracking() {
  const { theme, toggleTheme } = useTheme()
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [recentSearches, setRecentSearches] = useState([])
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetch(`${API}/mock/oms/analytics/summary`)
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})
  }, [])

  const search = useCallback(async (q) => {
    const term = (q || query).trim()
    if (!term) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      let res
      if (/^\d+$/.test(term)) {
        res = await fetch(`${API}/mock/oms/orders/${term}`)
      } else {
        res = await fetch(`${API}/mock/oms/track/${term}`)
      }

      if (!res.ok) {
        setError(`Order/tracking "${term}" not found`)
        setLoading(false)
        return
      }

      const data = await res.json()
      setResult(data)
      setRecentSearches(prev => {
        const updated = [term, ...prev.filter(s => s !== term)].slice(0, 5)
        return updated
      })
    } catch {
      setError('Failed to connect to server')
    }
    setLoading(false)
  }, [query])

  const handleSubmit = (e) => {
    e.preventDefault()
    search()
  }

  return (
    <div className="agent-page">
      <div className="agent-page-header">
        <div className="agent-page-back">
          <Link to="/agents" className="back-link">← Agents</Link>
          <div>
            <h1>📦 Shipment Tracking Agent</h1>
            <p>Track any order by Order ID or Tracking Number</p>
          </div>
        </div>
        <button className="agent-theme-btn" onClick={toggleTheme}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>

      {stats && (
        <div className="agent-stats-row">
          <div className="agent-stat-card">
            <div className="agent-stat-value">{stats.total_orders}</div>
            <div className="agent-stat-label">Total Orders</div>
          </div>
          <div className="agent-stat-card delivered">
            <div className="agent-stat-value">{stats.delivered}</div>
            <div className="agent-stat-label">Delivered</div>
          </div>
          <div className="agent-stat-card on-route">
            <div className="agent-stat-value">{stats.on_route}</div>
            <div className="agent-stat-label">On Route</div>
          </div>
          <div className="agent-stat-card returned">
            <div className="agent-stat-value">{stats.returned}</div>
            <div className="agent-stat-label">Returned</div>
          </div>
        </div>
      )}

      <form className="agent-search-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter Order ID or Tracking Number..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="agent-search-input"
        />
        <button type="submit" className="agent-search-btn" disabled={loading}>
          {loading ? 'Searching...' : 'Track'}
        </button>
      </form>

      {recentSearches.length > 0 && (
        <div className="recent-searches">
          <span className="recent-label">Recent:</span>
          {recentSearches.map(s => (
            <button key={s} className="recent-chip" onClick={() => { setQuery(s); search(s) }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {error && <div className="agent-error">{error}</div>}

      {result && (
        <div className="tracking-result">
          <div className="tracking-card">
            <div className="tracking-card-header">
              <h2>Order #{result.order_id}</h2>
              <span className={`status-badge ${result.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                {result.status}
              </span>
            </div>

            <div className="tracking-details-grid">
              <div className="tracking-detail">
                <span className="detail-label">Customer</span>
                <span className="detail-value">{result.customer_name}</span>
              </div>
              <div className="tracking-detail">
                <span className="detail-label">Phone</span>
                <span className="detail-value">{result.customer_phone}</span>
              </div>
              <div className="tracking-detail">
                <span className="detail-label">City</span>
                <span className="detail-value">{result.customer_city}</span>
              </div>
              <div className="tracking-detail">
                <span className="detail-label">Tracking #</span>
                <span className="detail-value">{result.tracking_number}</span>
              </div>
              <div className="tracking-detail">
                <span className="detail-label">Courier</span>
                <span className="detail-value">{result.courier}</span>
              </div>
              <div className="tracking-detail">
                <span className="detail-label">Amount</span>
                <span className="detail-value">Rs. {result.order_amount?.toLocaleString()}</span>
              </div>
              <div className="tracking-detail">
                <span className="detail-label">Payment</span>
                <span className="detail-value">{result.payment_method}</span>
              </div>
              <div className="tracking-detail">
                <span className="detail-label">Order Date</span>
                <span className="detail-value">{result.order_date}</span>
              </div>
              <div className="tracking-detail">
                <span className="detail-label">Delivery Date</span>
                <span className="detail-value">{result.delivery_date || '—'}</span>
              </div>
              <div className="tracking-detail">
                <span className="detail-label">Attempts</span>
                <span className="detail-value">{result.delivery_attempts || 0}</span>
              </div>
              {result.return_reason && (
                <div className="tracking-detail full-width">
                  <span className="detail-label">Return Reason</span>
                  <span className="detail-value">{result.return_reason}</span>
                </div>
              )}
            </div>

            <div className="tracking-timeline-section">
              <h3>Delivery Timeline</h3>
              <OrderTimeline
                status={result.status}
                orderDate={result.order_date}
                deliveryDate={result.delivery_date}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
