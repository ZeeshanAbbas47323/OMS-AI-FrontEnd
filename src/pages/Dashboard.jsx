import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '../context/ThemeContext'
import DashboardFilters from '../components/DashboardFilters'
import NotificationPanel from '../components/NotificationPanel'
import StatusPieChart from '../components/charts/StatusPieChart'
import ReturnsByReasonBar from '../components/charts/ReturnsByReasonBar'
import ProfitLineChart from '../components/charts/ProfitLineChart'
import CourierBarChart from '../components/charts/CourierBarChart'
import CityBarChart from '../components/charts/CityBarChart'
import './Dashboard.css'

const API = 'http://localhost:8001/mock/oms/analytics'

function buildQuery(params) {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v) q.set(k, v)
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

export default function Dashboard() {
  const { theme, toggleTheme } = useTheme()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ days: '', city: '', courier: '', payment: '' })
  const [notifOpen, setNotifOpen] = useState(false)
  const [alertCount, setAlertCount] = useState(0)

  useEffect(() => {
    fetch('http://localhost:8001/mock/oms/alerts')
      .then(r => r.json())
      .then(d => setAlertCount(d.summary?.total_alerts || 0))
      .catch(() => {})
  }, [])

  const fetchData = useCallback(() => {
    setLoading(true)
    setError(null)

    const summaryQ = buildQuery({ days: filters.days, city: filters.city, courier: filters.courier, payment_method: filters.payment })
    const returnsQ = buildQuery({ days: filters.days, city: filters.city, courier: filters.courier, payment_method: filters.payment })
    const profitQ = buildQuery({ days: filters.days })
    const couriersQ = buildQuery({ days: filters.days, city: filters.city, courier: filters.courier, payment_method: filters.payment })
    const citiesQ = buildQuery({ days: filters.days, courier: filters.courier, payment_method: filters.payment })

    Promise.all([
      fetch(`${API}/summary${summaryQ}`).then(r => r.json()),
      fetch(`${API}/returns${returnsQ}`).then(r => r.json()),
      fetch(`${API}/profit${profitQ}`).then(r => r.json()),
      fetch(`${API}/couriers${couriersQ}`).then(r => r.json()),
      fetch(`${API}/cities${citiesQ}`).then(r => r.json()),
    ])
      .then(([summary, returns, profit, couriers, cities]) => {
        setData({ summary, returns, profit, couriers, cities })
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [filters])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
  }

  if (loading && !data) return <div className="dash-loading">Loading analytics...</div>

  if (error && !data) return <div className="dash-error">Error: {error}</div>

  const { summary, returns, profit, couriers, cities } = data

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div>
          <h1>Orio Analytics Dashboard</h1>
          <p>Getorio OMS — Real-time Business Intelligence</p>
        </div>
        <div className="dash-header-actions">
          <button className="dash-alert-btn" onClick={() => setNotifOpen(true)} title="Alerts">
            🔔
            {alertCount > 0 && <span className="alert-badge">{alertCount}</span>}
          </button>
          <button className="dash-theme-btn" onClick={toggleTheme} title="Toggle theme">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      <DashboardFilters filters={filters} onFilterChange={handleFilterChange} />

      {loading && <div className="dash-loading-overlay">Updating...</div>}

      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-value">{summary.total_orders}</div>
          <div className="kpi-label">Total Orders</div>
        </div>
        <div className="kpi-card delivered">
          <div className="kpi-value">{summary.delivered}</div>
          <div className="kpi-label">Delivered ({summary.delivery_rate}%)</div>
        </div>
        <div className="kpi-card returned">
          <div className="kpi-value">{summary.returned}</div>
          <div className="kpi-label">Returned ({summary.return_rate}%)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{summary.on_route}</div>
          <div className="kpi-label">On Route</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{summary.on_hold}</div>
          <div className="kpi-label">On Hold</div>
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3>Order Status Distribution</h3>
          <StatusPieChart breakdown={summary.status_breakdown} />
        </div>

        <div className="chart-card">
          <h3>Profit & Revenue</h3>
          <ProfitLineChart monthlyBreakdown={profit.monthly_breakdown} />
          <div className="profit-summary">
            <span>Total Revenue: <strong>PKR {profit.total_revenue?.toLocaleString()}</strong></span>
            <span>Total Profit: <strong>PKR {profit.total_profit?.toLocaleString()}</strong></span>
            <span>Margin: <strong>{profit.profit_margin}%</strong></span>
          </div>
        </div>

        <div className="chart-card">
          <h3>Return Analysis</h3>
          <ReturnsByReasonBar
            byReason={returns.by_reason}
            byCourier={returns.by_courier}
            byCity={returns.by_city}
          />
        </div>

        <div className="chart-card">
          <h3>Courier Performance</h3>
          {couriers.best_courier && (
            <div className="best-courier-badge">Best: {couriers.best_courier}</div>
          )}
          <CourierBarChart rankings={couriers.courier_rankings} />
        </div>

        <div className="chart-card full-width">
          <h3>City-wise Orders</h3>
          <CityBarChart cities={cities.cities} />
        </div>
      </div>

      <NotificationPanel isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  )
}
