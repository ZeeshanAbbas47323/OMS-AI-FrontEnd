/**
 * Maps the agent's tool results onto the shapes the CSV/PDF exporters expect.
 *
 * The exporters were written against the old pipeline, which returned an
 * `analytics_data` blob plus an intent name. The current agent returns
 * `tool_results` instead, so this translates one into the other. The shapes
 * are the same ones `/mock/oms/analytics/*` produces — that is where both
 * pipelines get their numbers.
 */

const REPORT_TO_INTENT = {
  daily: 'analytics_summary',
  profit: 'analytics_profit',
  returns: 'analytics_returns',
  courier: 'analytics_courier',
}

/** Renames the daily report's keys to the summary shape the exporters use. */
function dailyToSummary(report) {
  return {
    total_orders: report.total_orders,
    delivered: report.delivered,
    returned: report.returns,
    on_route: report.on_route,
    on_hold: report.on_hold,
    delivery_rate: report.delivery_rate,
    return_rate: report.return_rate,
    revenue: report.revenue,
    ndr_cases: report.ndr_cases,
  }
}

/** The courier report is keyed by courier name; the exporter wants a list. */
function courierToRankings(report) {
  const couriers = report.couriers || {}
  return {
    courier_rankings: Object.entries(couriers).map(([courier, c]) => ({
      courier,
      total_orders: c.total,
      delivered: c.delivered,
      returned: c.returned,
      delivery_rate: c.delivery_rate,
      avg_attempts: c.avg_attempts ?? '',
    })),
  }
}

/**
 * Returns { data, intent } for the first exportable tool result, or null when
 * the answer has nothing worth exporting.
 */
export function analyticsFromToolResults(toolResults) {
  if (!Array.isArray(toolResults)) return null

  for (const entry of toolResults) {
    const tool = entry?.tool
    const result = entry?.full_result || entry?.result
    if (!result || result.error) continue

    if (tool === 'generate_report') {
      const intent = REPORT_TO_INTENT[result.report_type]
      if (!intent) continue
      if (result.report_type === 'daily') return { data: dailyToSummary(result), intent }
      if (result.report_type === 'courier') return { data: courierToRankings(result), intent }
      return { data: result, intent }
    }

    if (tool === 'bulk_status_check' && result.groups) {
      const counts = Object.fromEntries(
        Object.entries(result.groups).map(([name, g]) => [name, g.count]))
      return {
        data: {
          total_orders: result.total_orders,
          delivered: result.groups.delivered?.count,
          returned: result.groups.Return?.count,
          on_route: result.groups['On Route']?.count,
          on_hold: result.groups['On Hold']?.count,
          status_breakdown: counts,
        },
        intent: 'analytics_summary',
      }
    }
  }

  return null
}

/** Pulls the single order out of an analyze_shipment result, for the timeline. */
export function orderFromToolResults(toolResults) {
  if (!Array.isArray(toolResults)) return null
  for (const entry of toolResults) {
    const result = entry?.full_result || entry?.result
    if (entry?.tool === 'analyze_shipment' && result?.order && !result.error) {
      return result.order
    }
  }
  return null
}
