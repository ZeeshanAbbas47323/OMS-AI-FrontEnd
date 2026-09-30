import { useState } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { Link } from 'react-router-dom'
import './AgentPage.css'
import { API_BASE } from '../../config'

const API = API_BASE

const TEMPLATES = [
  { label: 'Order Delay', message: 'My order is delayed, when will I receive it?' },
  { label: 'Wrong Item', message: 'I received the wrong item in my order.' },
  { label: 'Refund Request', message: 'I want a refund for my returned order.' },
  { label: 'Delivery Status', message: 'What is the current status of my delivery?' },
  { label: 'Payment Issue', message: 'My payment was deducted but order not confirmed.' },
  { label: 'Address Change', message: 'I need to change my delivery address.' },
]

export default function CustomerReply() {
  const { theme, toggleTheme } = useTheme()
  const [customerMessage, setCustomerMessage] = useState('')
  const [generatedReply, setGeneratedReply] = useState('')
  const [loading, setLoading] = useState(false)
  const [tone, setTone] = useState('friendly')
  const [history, setHistory] = useState([])
  const [copied, setCopied] = useState(false)

  const generateReply = async () => {
    if (!customerMessage.trim()) return
    setLoading(true)
    setGeneratedReply('')

    try {
      const res = await fetch(`${API}/agents/customer-reply/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: customerMessage, tone }),
      })
      const data = await res.json()
      setGeneratedReply(data.reply || 'Could not generate reply')
      setHistory(prev => [{
        customer: customerMessage,
        reply: data.reply,
        tone,
        time: new Date().toLocaleTimeString(),
      }, ...prev].slice(0, 10))
    } catch {
      setGeneratedReply('Failed to connect to server')
    }
    setLoading(false)
  }

  const copyReply = () => {
    navigator.clipboard.writeText(generatedReply)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const useTemplate = (msg) => {
    setCustomerMessage(msg)
  }

  return (
    <div className="agent-page">
      <div className="agent-page-header">
        <div className="agent-page-back">
          <Link to="/agents" className="back-link">← Agents</Link>
          <div>
            <h1>💬 Customer Reply Agent</h1>
            <p>Generate natural, professional replies to customer messages</p>
          </div>
        </div>
        <button className="agent-theme-btn" onClick={toggleTheme}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>

      <div className="reply-agent-layout">
        <div className="reply-main">
          <div className="reply-section">
            <h3>Customer Message</h3>
            <textarea
              className="reply-textarea"
              placeholder="Paste or type the customer's message here..."
              value={customerMessage}
              onChange={e => setCustomerMessage(e.target.value)}
              rows={4}
            />
          </div>

          <div className="reply-controls">
            <div className="tone-selector">
              <label>Tone:</label>
              {['friendly', 'formal', 'apologetic'].map(t => (
                <button
                  key={t}
                  className={`tone-btn ${tone === t ? 'active' : ''}`}
                  onClick={() => setTone(t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <button
              className="generate-btn"
              onClick={generateReply}
              disabled={loading || !customerMessage.trim()}
            >
              {loading ? 'Generating...' : 'Generate Reply'}
            </button>
          </div>

          {generatedReply && (
            <div className="reply-output">
              <div className="reply-output-header">
                <h3>Generated Reply</h3>
                <button className="copy-btn" onClick={copyReply}>
                  {copied ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
              <div className="reply-output-text">{generatedReply}</div>
            </div>
          )}

          <div className="templates-section">
            <h3>Quick Templates</h3>
            <div className="templates-grid">
              {TEMPLATES.map(t => (
                <button
                  key={t.label}
                  className="template-btn"
                  onClick={() => useTemplate(t.message)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="reply-sidebar">
          <h3>Recent Replies ({history.length})</h3>
          {history.length === 0 ? (
            <p className="no-history">No replies generated yet</p>
          ) : (
            <div className="reply-history">
              {history.map((h, i) => (
                <div key={i} className="history-item">
                  <div className="history-customer">"{h.customer.slice(0, 60)}..."</div>
                  <div className="history-reply">{h.reply.slice(0, 80)}...</div>
                  <div className="history-meta">
                    <span className="history-tone">{h.tone}</span>
                    <span className="history-time">{h.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
