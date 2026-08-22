import { useState } from 'react'
import './DashboardFilters.css'

const CITIES = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad',
  'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala',
  'Hyderabad', 'Bahawalpur', 'Sargodha', 'Sukkur', 'Mardan',
  'Abbottabad', 'Kohat', 'Sahiwal', 'Jhang', 'Dera Ghazi Khan',
  'sadiqabad', 'kachha', 'sukhhar', 'burewala', 'Kalam', 'Kashmir',
  'Thar', 'Rawala Kot',
]

const COURIERS = [
  'TCS', 'LEOPARD', 'RIDER', 'TRAX', 'DEX', 'M&P', 'POSTEX',
  'ROCKET', 'BLUEEX', 'COURIER NEXT', 'CallCourier',
]

const DATE_PRESETS = [
  { label: 'All Time', value: '' },
  { label: 'Today', value: '1' },
  { label: 'Last 7 Days', value: '7' },
  { label: 'Last 30 Days', value: '30' },
  { label: 'Last 90 Days', value: '90' },
]

export default function DashboardFilters({ filters, onFilterChange }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value })
  }

  const clearAll = () => {
    onFilterChange({ days: '', city: '', courier: '', payment: '' })
  }

  const activeCount = Object.values(filters).filter(v => v !== '').length

  return (
    <div className="filters-bar">
      <div className="filters-top">
        <button
          className="filters-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span>Filters</span>
          {activeCount > 0 && <span className="filter-badge">{activeCount}</span>}
          <span className="filter-arrow">{isExpanded ? '▲' : '▼'}</span>
        </button>
        {activeCount > 0 && (
          <button className="filters-clear" onClick={clearAll}>Clear All</button>
        )}
      </div>

      {isExpanded && (
        <div className="filters-grid">
          <div className="filter-group">
            <label>Time Period</label>
            <select
              value={filters.days}
              onChange={(e) => handleChange('days', e.target.value)}
            >
              {DATE_PRESETS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>City</label>
            <select
              value={filters.city}
              onChange={(e) => handleChange('city', e.target.value)}
            >
              <option value="">All Cities</option>
              {CITIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Courier</label>
            <select
              value={filters.courier}
              onChange={(e) => handleChange('courier', e.target.value)}
            >
              <option value="">All Couriers</option>
              {COURIERS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Payment</label>
            <select
              value={filters.payment}
              onChange={(e) => handleChange('payment', e.target.value)}
            >
              <option value="">All</option>
              <option value="COD">COD</option>
              <option value="PREPAID">Prepaid</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
