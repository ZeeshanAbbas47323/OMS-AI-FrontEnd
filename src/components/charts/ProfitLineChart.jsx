import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const formatPKR = (v) => `PKR ${(v / 1000).toFixed(0)}k`

export default function ProfitLineChart({ monthlyBreakdown }) {
  if (!monthlyBreakdown) return null
  const data = Object.entries(monthlyBreakdown)
    .map(([month, d]) => ({
      month,
      revenue: d.revenue,
      productCost: d.product_cost,
      shippingCost: d.shipping_cost,
      profit: d.profit,
      orders: d.order_count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ComposedChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={formatPKR} />
        <Tooltip formatter={(v, name) => [`PKR ${v.toLocaleString()}`, name]} />
        <Legend />
        <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="productCost" name="Product Cost" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        <Bar dataKey="shippingCost" name="Shipping Cost" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        <Line type="monotone" dataKey="profit" name="Profit" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
