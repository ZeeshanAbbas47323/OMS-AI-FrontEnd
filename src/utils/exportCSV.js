function escape(val) {
  const s = String(val ?? '')
  return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
}

function toCSV(headers, rows) {
  return [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n')
}

export function generateCSV(data, intent) {
  if (intent === 'analytics_summary') {
    const kpi = [
      ['Total Orders', data.total_orders],
      ['Delivered', data.delivered],
      ['Returned', data.returned],
      ['On Route', data.on_route],
      ['On Hold', data.on_hold],
      ['Delivery Rate %', data.delivery_rate],
      ['Return Rate %', data.return_rate],
    ]
    let csv = toCSV(['Metric', 'Value'], kpi)
    if (data.status_breakdown) {
      csv += '\n\nStatus Breakdown\n'
      csv += toCSV(['Status', 'Count'], Object.entries(data.status_breakdown))
    }
    return csv
  }

  if (intent === 'analytics_returns') {
    if (data.return_orders?.length) {
      return toCSV(
        ['Order ID', 'Tracking', 'Customer', 'City', 'Courier', 'Reason', 'Amount', 'Date'],
        data.return_orders.map(o => [
          o.order_id, o.tracking_number, o.customer_name, o.customer_city,
          o.courier, o.return_reason, o.order_amount, o.order_date,
        ])
      )
    }
    return toCSV(['Category', 'Reason', 'Count'], [
      ...Object.entries(data.by_reason || {}).map(([k, v]) => ['Reason', k, v]),
      ...Object.entries(data.by_city || {}).map(([k, v]) => ['City', k, v]),
      ...Object.entries(data.by_courier || {}).map(([k, v]) => ['Courier', k, v]),
    ])
  }

  if (intent === 'analytics_profit') {
    const months = Object.entries(data.monthly_breakdown || {})
    return toCSV(
      ['Order creation month', 'Delivered order value (not cash collected)', 'Product Cost', 'Shipping Cost', 'Order margin (excludes operating expenses/tax/returns)', 'Orders'],
      months.map(([m, d]) => [m, d.revenue, d.product_cost, d.shipping_cost, d.profit, d.order_count])
    )
  }

  if (intent === 'analytics_courier') {
    return toCSV(
      ['Courier', 'Total Orders', 'Delivered', 'Returned', 'Delivery Rate %', 'Avg Attempts'],
      (data.courier_rankings || []).map(c => [
        c.courier, c.total_orders, c.delivered, c.returned, c.delivery_rate, c.avg_attempts,
      ])
    )
  }

  return toCSV(['Key', 'Value'], Object.entries(data).filter(([, v]) => typeof v !== 'object'))
}

export function downloadCSV(data, intent) {
  const csv = generateCSV(data, intent)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `orio_${intent}_report.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
