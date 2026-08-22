import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function CourierBarChart({ rankings }) {
  if (!rankings?.length) return null
  const data = rankings.map(c => ({
    name: c.courier,
    delivered: c.delivered,
    returned: c.returned,
    deliveryRate: c.delivery_rate,
    avgAttempts: c.avg_attempts,
    total: c.total_orders,
  }))

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="delivered" name="Delivered" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="returned" name="Returned" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px', fontSize: '14px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--table-header-border)', textAlign: 'left' }}>
            <th style={{ padding: '8px' }}>Courier</th>
            <th style={{ padding: '8px' }}>Total</th>
            <th style={{ padding: '8px' }}>Delivered</th>
            <th style={{ padding: '8px' }}>Returned</th>
            <th style={{ padding: '8px' }}>Rate %</th>
            <th style={{ padding: '8px' }}>Avg Attempts</th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((c, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--table-row-border)' }}>
              <td style={{ padding: '8px', fontWeight: 600 }}>{c.courier}</td>
              <td style={{ padding: '8px' }}>{c.total_orders}</td>
              <td style={{ padding: '8px', color: 'var(--green)' }}>{c.delivered}</td>
              <td style={{ padding: '8px', color: 'var(--red)' }}>{c.returned}</td>
              <td style={{ padding: '8px' }}>{c.delivery_rate}%</td>
              <td style={{ padding: '8px' }}>{c.avg_attempts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
