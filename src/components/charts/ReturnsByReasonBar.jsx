import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COLORS = ['#ef4444', '#f97316', '#eab308', '#8b5cf6', '#6b7280']

export default function ReturnsByReasonBar({ byReason, byCourier, byCity }) {
  const reasonData = Object.entries(byReason || {}).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  const courierData = Object.entries(byCourier || {}).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  const cityData = Object.entries(byCity || {}).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

  const renderBar = (data, title) => (
    <div>
      <h4 style={{ margin: '0 0 8px', color: '#374151' }}>{title}</h4>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="value" name="Returns" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {reasonData.length > 0 && renderBar(reasonData, 'By Reason')}
      {courierData.length > 0 && renderBar(courierData, 'By Courier')}
      {cityData.length > 0 && renderBar(cityData, 'By City')}
    </div>
  )
}
