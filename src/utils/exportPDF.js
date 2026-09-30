import jsPDF from 'jspdf'

function addTitle(doc, title, y) {
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(String(title), 20, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  return y + 10
}

function addLine(doc, text, y) {
  if (y > 270) {
    doc.addPage()
    y = 20
  }
  doc.text(String(text), 20, y)
  return y + 6
}

function addTable(doc, headers, rows, y) {
  doc.setFont('helvetica', 'bold')
  y = addLine(doc, headers.map(String).join('  |  '), y)
  doc.setFont('helvetica', 'normal')
  y = addLine(doc, '-'.repeat(90), y)
  for (const row of rows) {
    y = addLine(doc, row.map(String).join('  |  '), y)
  }
  return y + 4
}

export function downloadPDF(data, intent) {
  if (!data || !intent) return
  const doc = new jsPDF()

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Orio Analytics Report', 20, 20)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 28)
  doc.text(`Report Type: ${intent.replace('analytics_', '').replace('_', ' ').toUpperCase()}`, 20, 34)

  let y = 45

  if (intent === 'analytics_summary') {
    y = addTitle(doc, 'Order Summary', y)
    y = addLine(doc, `Period: ${data.period || 'All time'}`, y)
    y = addLine(doc, `Total Orders: ${data.total_orders}`, y)
    y = addLine(doc, `Delivered: ${data.delivered} (${data.delivery_rate}%)`, y)
    y = addLine(doc, `Returned: ${data.returned} (${data.return_rate}%)`, y)
    y = addLine(doc, `On Route: ${data.on_route}`, y)
    y = addLine(doc, `On Hold: ${data.on_hold}`, y)
    y += 6
    if (data.status_breakdown) {
      y = addTitle(doc, 'Status Breakdown', y)
      y = addTable(doc, ['Status', 'Count'],
        Object.entries(data.status_breakdown).sort((a, b) => b[1] - a[1]).map(([s, c]) => [s, String(c)]),
        y
      )
    }
  }

  if (intent === 'analytics_returns') {
    y = addTitle(doc, 'Return Analytics', y)
    y = addLine(doc, `Total Returns: ${data.total_returns}`, y)
    y += 4
    if (data.by_reason) {
      y = addTitle(doc, 'By Reason', y)
      y = addTable(doc, ['Reason', 'Count'],
        Object.entries(data.by_reason).sort((a, b) => b[1] - a[1]).map(([r, c]) => [r, String(c)]),
        y
      )
    }
    if (data.by_courier) {
      y = addTitle(doc, 'By Courier', y)
      y = addTable(doc, ['Courier', 'Count'],
        Object.entries(data.by_courier).sort((a, b) => b[1] - a[1]).map(([r, c]) => [r, String(c)]),
        y
      )
    }
    if (data.by_city) {
      y = addTitle(doc, 'By City', y)
      y = addTable(doc, ['City', 'Count'],
        Object.entries(data.by_city).sort((a, b) => b[1] - a[1]).map(([r, c]) => [r, String(c)]),
        y
      )
    }
  }

  if (intent === 'analytics_profit') {
    y = addTitle(doc, 'Delivered Order Margin', y)
    for (const note of data.data_limits || []) y = addLine(doc, note, y)
    y = addLine(doc, `Delivered order value: ${data.total_revenue == null ? 'Unavailable' : 'PKR '+data.total_revenue.toLocaleString()}`, y)
    y = addLine(doc, `Order margin: ${data.total_profit == null ? 'Unavailable' : 'PKR '+data.total_profit.toLocaleString()}`, y)
    y = addLine(doc, `Margin: ${data.profit_margin == null ? 'Unavailable' : data.profit_margin+'%'}`, y)
    y += 6
    if (data.monthly_breakdown) {
      y = addTitle(doc, 'Monthly Breakdown', y)
      y = addTable(doc,
        ['Creation month', 'Order value', 'Cost', 'Shipping', 'Order margin', 'Orders'],
        Object.entries(data.monthly_breakdown).map(([m, d]) => [
          m,
          `PKR ${d.revenue.toLocaleString()}`,
          `PKR ${d.product_cost.toLocaleString()}`,
          `PKR ${d.shipping_cost.toLocaleString()}`,
          `PKR ${d.profit.toLocaleString()}`,
          String(d.order_count),
        ]),
        y
      )
    }
  }

  if (intent === 'analytics_courier') {
    y = addTitle(doc, 'Courier Performance', y)
    if (data.filters) y = addLine(doc, `Filters: ${data.filters}`, y)
    y = addLine(doc, `Best Courier: ${data.best_courier || 'N/A'}`, y)
    y += 4
    if (data.courier_rankings) {
      y = addTable(doc,
        ['Courier', 'Total', 'Delivered', 'Returned', 'Rate %', 'Avg Attempts'],
        data.courier_rankings.map(c => [
          c.courier, String(c.total_orders), String(c.delivered),
          String(c.returned), String(c.delivery_rate), String(c.avg_attempts),
        ]),
        y
      )
    }
  }

  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text('Powered by Orio AI Assistant — Getorio OMS', 20, 285)

  doc.save(`orio_${intent}_report.pdf`)
}
