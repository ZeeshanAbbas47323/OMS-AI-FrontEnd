import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE } from '../config'
import './Usage.css'

const API = API_BASE

const PROVIDER_LABEL = { anthropic: 'Claude', ollama: 'Ollama', openrouter: 'OpenRouter', openai: 'OpenAI' }

function fmtCost(n) {
  if (n == null) return '—'
  if (n === 0) return 'Free'
  return n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`
}

function fmtTokens(n) {
  if (n == null) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function timeAgo(iso) {
  if (!iso) return ''
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function Usage() {
  const [data, setData] = useState(null)
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (windowDays) => {
    try {
      const res = await fetch(`${API}/api/usage?days=${windowDays}`)
      if (!res.ok) throw new Error(`Could not load usage (${res.status})`)
      setData(await res.json())
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => { load(days).finally(() => setLoading(false)) }, [days, load])

  const maxDayTokens = useMemo(
    () => Math.max(1, ...(data?.by_day || []).map(d => d.total_tokens)),
    [data],
  )
  const maxModelCost = useMemo(
    () => Math.max(0.000001, ...(data?.by_model || []).map(m => m.cost_usd)),
    [data],
  )

  if (loading) return <div className="usage-page"><div className="usage-loading">Loading usage…</div></div>

  const totals = data?.totals || { calls: 0, input_tokens: 0, output_tokens: 0, total_tokens: 0, cost_usd: 0 }
  const hasUnpriced = (data?.by_model || []).some(m => m.unpriced_calls > 0)

  return (
    <div className="usage-page">
      <header className="usage-header">
        <Link to="/agents" className="usage-back">← Agents</Link>
        <div className="usage-title">
          <h1>💳 Usage &amp; Cost</h1>
          <p>Which model answered, how many tokens, what it cost</p>
        </div>
        <div className="usage-days">
          {[7, 30, 90].map(d => (
            <button key={d} className={days === d ? 'active' : ''} onClick={() => setDays(d)}>
              {d}d
            </button>
          ))}
        </div>
        <button className="usage-refresh" onClick={() => load(days)}>↻ Refresh</button>
      </header>

      {error && <div className="usage-error">{error}</div>}

      <div className="usage-totals">
        <div className="usage-card">
          <span className="usage-card-value">{totals.calls}</span>
          <span className="usage-card-label">calls</span>
        </div>
        <div className="usage-card">
          <span className="usage-card-value">{fmtTokens(totals.total_tokens)}</span>
          <span className="usage-card-label">tokens</span>
        </div>
        <div className="usage-card">
          <span className="usage-card-value">{fmtTokens(totals.input_tokens)}</span>
          <span className="usage-card-label">input</span>
        </div>
        <div className="usage-card">
          <span className="usage-card-value">{fmtTokens(totals.output_tokens)}</span>
          <span className="usage-card-label">output</span>
        </div>
        <div className="usage-card highlight">
          <span className="usage-card-value">{fmtCost(totals.cost_usd)}</span>
          <span className="usage-card-label">estimated cost</span>
        </div>
      </div>

      {hasUnpriced && (
        <div className="usage-note">
          Some models here aren't in the pricing table yet, so their calls count toward tokens but not the cost total.
          Add them to <code>PRICING</code> in <code>agent/usage.py</code>.
        </div>
      )}

      <section className="usage-section">
        <h2>By model</h2>
        {!data?.by_model?.length ? (
          <div className="usage-empty">No calls in this window.</div>
        ) : (
          <div className="usage-table-wrap">
            <table className="usage-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Calls</th>
                  <th>Input</th>
                  <th>Output</th>
                  <th>Total</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                {data.by_model.map(m => (
                  <tr key={`${m.provider}-${m.model}`}>
                    <td>
                      <span className={`usage-provider-dot ${m.provider}`} />
                      <span className="usage-model-name">{m.model}</span>
                      <span className="usage-provider-name">{PROVIDER_LABEL[m.provider] || m.provider}</span>
                    </td>
                    <td>{m.calls}</td>
                    <td>{fmtTokens(m.input_tokens)}</td>
                    <td>{fmtTokens(m.output_tokens)}</td>
                    <td>{fmtTokens(m.total_tokens)}</td>
                    <td>
                      <div className="usage-cost-cell">
                        <div className="usage-cost-bar" style={{ width: `${Math.max(4, (m.cost_usd / maxModelCost) * 100)}%` }} />
                        <span>{m.unpriced_calls > 0 && m.cost_usd === 0 ? 'Unpriced' : fmtCost(m.cost_usd)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="usage-section">
        <h2>By day</h2>
        {!data?.by_day?.length ? (
          <div className="usage-empty">No calls in this window.</div>
        ) : (
          <div className="usage-daybars">
            {data.by_day.map(d => (
              <div key={d.day} className="usage-daybar-row">
                <span className="usage-daybar-label">{d.day}</span>
                <div className="usage-daybar-track">
                  <div className="usage-daybar-fill" style={{ width: `${(d.total_tokens / maxDayTokens) * 100}%` }} />
                </div>
                <span className="usage-daybar-value">{fmtTokens(d.total_tokens)} · {fmtCost(d.cost_usd)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="usage-section">
        <h2>Recent calls</h2>
        {!data?.recent?.length ? (
          <div className="usage-empty">Nothing logged yet.</div>
        ) : (
          <div className="usage-table-wrap">
            <table className="usage-table compact">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Model</th>
                  <th>Tokens (in / out)</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map(r => (
                  <tr key={r.id}>
                    <td>{timeAgo(r.created_at)}</td>
                    <td>
                      <span className={`usage-provider-dot ${r.provider}`} />
                      {r.model}
                    </td>
                    <td>{r.input_tokens} / {r.output_tokens}</td>
                    <td>{fmtCost(r.cost_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
