import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from '../context/ThemeContext'
import { downloadCSV } from '../utils/exportCSV'
import { downloadPDF } from '../utils/exportPDF'
import OrderTimeline from './OrderTimeline'
import './ChatWidget.css'

function generateSessionId() {
  return 'sess-' + crypto.randomUUID()
}

export default function ChatWidget() {
  const { theme, toggleTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [connected, setConnected] = useState(false)

  const wsRef = useRef(null)
  const sessionIdRef = useRef(generateSessionId())
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const hasConnectedRef = useRef(false)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping, scrollToBottom])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const reconnectTimer = useRef(null)

  const connectWebSocket = useCallback(() => {
    if (hasConnectedRef.current) return
    hasConnectedRef.current = true

    const sid = sessionIdRef.current
    const ws = new WebSocket(`ws://localhost:8001/ws/chat/${sid}`)

    ws.onopen = () => {
      setConnected(true)
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
        reconnectTimer.current = null
      }
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setIsTyping(false)
      setMessages(prev => [...prev, {
        role: 'agent',
        text: data.reply,
        analyticsData: data.analytics_data || null,
        intent: data.intent || '',
        orderData: data.order_data || null,
        timestamp: new Date(),
      }])
    }

    ws.onclose = () => {
      setConnected(false)
      wsRef.current = null
      hasConnectedRef.current = false
      reconnectTimer.current = setTimeout(() => {
        if (isOpen) connectWebSocket()
      }, 2000)
    }

    ws.onerror = () => setConnected(false)

    wsRef.current = ws
  }, [isOpen])

  useEffect(() => {
    if (isOpen && !hasConnectedRef.current) {
      connectWebSocket()
    }
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
    }
  }, [isOpen, connectWebSocket])

  const sendMessage = () => {
    const text = input.trim()
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    setMessages(prev => [...prev, { role: 'user', text, timestamp: new Date() }])
    setInput('')
    setIsTyping(true)

    wsRef.current.send(JSON.stringify({ message: text }))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const playNotifSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 800
      gain.gain.value = 0.1
      osc.start()
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      osc.stop(ctx.currentTime + 0.3)
    } catch {}
  }, [])

  const prevMsgCount = useRef(0)
  useEffect(() => {
    if (messages.length > prevMsgCount.current && messages.length > 0) {
      const last = messages[messages.length - 1]
      if (last.role === 'agent' && prevMsgCount.current > 0) {
        playNotifSound()
      }
    }
    prevMsgCount.current = messages.length
  }, [messages, playNotifSound])

  const hasAnalytics = (msg) =>
    msg.analyticsData && typeof msg.analyticsData === 'object' && Object.keys(msg.analyticsData).length > 0

  return (
    <>
      <div className={`chat-window ${isOpen ? 'open' : 'closed'}`}>
        <div className="chat-header">
          <div className="chat-header-info">
            <div className="chat-header-avatar">🤖</div>
            <div>
              <div className="chat-header-title">Orio AI Assistant</div>
              <div className="chat-header-status">
                {connected ? 'Online' : 'Connecting...'}
              </div>
            </div>
          </div>
          <div className="chat-header-actions">
            <button className="chat-theme-btn" onClick={toggleTheme} title="Toggle theme">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button className="chat-close-btn" onClick={() => setIsOpen(false)}>✕</button>
          </div>
        </div>

        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-msg-wrapper ${msg.role}`}>
              <div className={`chat-bubble ${msg.role}`}>
                {msg.text}
              </div>
              {msg.timestamp && (
                <span className="chat-msg-time">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {msg.role === 'agent' && msg.orderData && (
                <OrderTimeline
                  status={msg.orderData.status}
                  orderDate={msg.orderData.order_date}
                  deliveryDate={msg.orderData.delivery_date}
                />
              )}
              {msg.role === 'agent' && hasAnalytics(msg) && (
                <div className="analytics-actions">
                  <button
                    className="analytics-btn csv"
                    onClick={() => downloadCSV(msg.analyticsData, msg.intent)}
                  >
                    📥 CSV
                  </button>
                  <button
                    className="analytics-btn pdf"
                    onClick={() => downloadPDF(msg.analyticsData, msg.intent)}
                  >
                    📄 PDF
                  </button>
                  <a
                    className="analytics-btn dashboard"
                    href="/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    📊 Dashboard
                  </a>
                </div>
              )}
            </div>
          ))}
          {isTyping && (
            <div className="chat-bubble agent typing-indicator">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <input
            ref={inputRef}
            type="text"
            className="chat-input"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!connected}
          />
          <button
            className="chat-send-btn"
            onClick={sendMessage}
            disabled={!input.trim() || !connected}
          >
            ➤
          </button>
        </div>
      </div>

      <button className="chat-fab" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? '✕' : '💬'}
      </button>
    </>
  )
}
