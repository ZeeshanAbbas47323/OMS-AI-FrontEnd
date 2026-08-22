import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function CityBarChart({ cities }) {
  if (!cities?.length) return null
  const data = cities
    .map(c => ({
      name: c.city,
      total: c.total_orders,
      delivered: c.delivered,
      returned: c.returned,
      deliveryRate: c.delivery_rate,
      revenue: c.revenue,
    }))
    .sort((a, b) => b.total - a.total)

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-30} textAnchor="end" height={60} tick={{ fontSize: 12 }} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="delivered" name="Delivered" fill="#10b981" stackId="a" />
          <Bar dataKey="returned" name="Returned" fill="#ef4444" stackId="a" />
        </BarChart>
      </ResponsiveContainer>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px', fontSize: '14px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--table-header-border)', textAlign: 'left' }}>
            <th style={{ padding: '8px' }}>City</th>
            <th style={{ padding: '8px' }}>Orders</th>
            <th style={{ padding: '8px' }}>Delivered</th>
            <th style={{ padding: '8px' }}>Returned</th>
            <th style={{ padding: '8px' }}>Rate %</th>
            <th style={{ padding: '8px' }}>Revenue</th>
          </tr>
        </thead>
        <tbody>
          {data.map((c, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--table-row-border)' }}>
              <td style={{ padding: '8px', fontWeight: 600 }}>{c.name}</td>
              <td style={{ padding: '8px' }}>{c.total}</td>
              <td style={{ padding: '8px', color: 'var(--green)' }}>{c.delivered}</td>
              <td style={{ padding: '8px', color: 'var(--red)' }}>{c.returned}</td>
              <td style={{ padding: '8px' }}>{c.deliveryRate}%</td>
              <td style={{ padding: '8px' }}>PKR {c.revenue?.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
