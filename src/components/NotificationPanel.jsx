import { useState, useEffect, useCallback } from 'react'
import './NotificationPanel.css'

const API = 'http://localhost:8001/mock/oms/alerts'

const SEVERITY_ICONS = { high: '🔴', medium: '🟡', low: '🟢' }
const TYPE_ICONS = { stuck_order: '⏸️', return: '↩️', failed_delivery: '❌' }

export default function NotificationPanel({ isOpen, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')

  const fetchAlerts = useCallback(() => {
    setLoading(true)
    fetch(API)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (isOpen) fetchAlerts()
  }, [isOpen, fetchAlerts])

  if (!isOpen) return null

  const alerts = data?.alerts || []
  const summary = data?.summary || {}
  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.type === filter)

  return (
    <div className="notif-overlay" onClick={onClose}>
      <div className="notif-panel" onClick={e => e.stopPropagation()}>
        <div className="notif-header">
          <h3>Alerts & Notifications</h3>
          <button className="notif-close" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className="notif-loading">Loading alerts...</div>
        ) : (
          <>
            <div className="notif-summary">
              <div className="notif-stat high">
                <span className="notif-stat-num">{summary.high || 0}</span>
                <span className="notif-stat-label">Critical</span>
              </div>
              <div className="notif-stat medium">
                <span className="notif-stat-num">{summary.medium || 0}</span>
                <span className="notif-stat-label">Warning</span>
              </div>
              <div className="notif-stat total">
                <span className="notif-stat-num">{summary.total_alerts || 0}</span>
                <span className="notif-stat-label">Total</span>
              </div>
            </div>

            <div className="notif-filters">
              {[
                { key: 'all', label: 'All' },
                { key: 'stuck_order', label: `Stuck (${summary.stuck_orders || 0})` },
                { key: 'return', label: `Returns (${summary.returns || 0})` },
                { key: 'failed_delivery', label: `Failed (${summary.failed_deliveries || 0})` },
              ].map(f => (
                <button
                  key={f.key}
                  className={`notif-filter-btn ${filter === f.key ? 'active' : ''}`}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="notif-list">
              {filtered.length === 0 ? (
                <div className="notif-empty">No alerts in this category</div>
              ) : (
                filtered.map((alert, i) => (
                  <div key={i} className={`notif-item ${alert.severity}`}>
                    <div className="notif-item-icon">
                      {TYPE_ICONS[alert.type] || '⚠️'}
                    </div>
                    <div className="notif-item-content">
                      <div className="notif-item-msg">{alert.message}</div>
                      <div className="notif-item-meta">
                        {SEVERITY_ICONS[alert.severity]} {alert.severity} &middot; {alert.customer} &middot; {alert.city}
                        {alert.days_stuck && ` · ${alert.days_stuck}d`}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
