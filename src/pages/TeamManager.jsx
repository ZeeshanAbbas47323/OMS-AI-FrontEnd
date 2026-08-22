import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import './TeamManager.css'

const API = 'http://localhost:8001'

const AVATAR_OPTIONS = [
  '👨‍💼', '👩‍💼', '👨‍💻', '👩‍💻', '👨‍🔧', '👩‍🔧', '👨‍🏫', '👩‍🏫',
  '👨‍⚕️', '👩‍⚕️', '🧑‍💼', '🧑‍💻', '👤', '👨', '👩', '🧑',
]

const TONE_OPTIONS = ['professional', 'friendly', 'empathetic', 'formal', 'enthusiastic', 'consultative']
const GENDER_OPTIONS = ['male', 'female', 'other']
const ICON_OPTIONS = ['📦', '🎧', '💼', '💰', '🏢', '🔧', '📊', '🚚', '🛒', '📱']

function TeamManager() {
  const [departments, setDepartments] = useState([])
  const [agents, setAgents] = useState([])
  const [selectedDept, setSelectedDept] = useState(null)
  const [showDeptModal, setShowDeptModal] = useState(false)
  const [showAgentModal, setShowAgentModal] = useState(false)
  const [editingDept, setEditingDept] = useState(null)
  const [editingAgent, setEditingAgent] = useState(null)
  const [loading, setLoading] = useState(true)

  const [deptForm, setDeptForm] = useState({ name: '', description: '', icon: '🏢', keywords: '' })
  const [agentForm, setAgentForm] = useState({
    name: '', department_id: '', gender: 'male', avatar: '👨‍💼',
    persona: '', skills: '', greeting: '', tone: 'professional', is_head: false,
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [deptRes, agentRes] = await Promise.all([
        fetch(`${API}/api/departments`).then(r => r.json()),
        fetch(`${API}/api/team-agents`).then(r => r.json()),
      ])
      setDepartments(deptRes)
      setAgents(agentRes)
    } catch (e) {
      console.error('Failed to fetch:', e)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredAgents = selectedDept
    ? agents.filter(a => a.department_id === selectedDept)
    : agents

  // Department CRUD
  const openDeptModal = (dept = null) => {
    if (dept) {
      setEditingDept(dept)
      setDeptForm({
        name: dept.name,
        description: dept.description,
        icon: dept.icon,
        keywords: (dept.keywords || []).join(', '),
      })
    } else {
      setEditingDept(null)
      setDeptForm({ name: '', description: '', icon: '🏢', keywords: '' })
    }
    setShowDeptModal(true)
  }

  const saveDept = async () => {
    const body = {
      ...deptForm,
      keywords: deptForm.keywords.split(',').map(k => k.trim()).filter(Boolean),
    }
    const url = editingDept ? `${API}/api/departments/${editingDept.id}` : `${API}/api/departments`
    const method = editingDept ? 'PUT' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setShowDeptModal(false)
    fetchData()
  }

  const deleteDept = async (id) => {
    if (!confirm('Delete this department and all its agents?')) return
    await fetch(`${API}/api/departments/${id}`, { method: 'DELETE' })
    if (selectedDept === id) setSelectedDept(null)
    fetchData()
  }

  // Agent CRUD
  const openAgentModal = (agent = null) => {
    if (agent) {
      setEditingAgent(agent)
      setAgentForm({
        name: agent.name,
        department_id: agent.department_id,
        gender: agent.gender,
        avatar: agent.avatar || '👨‍💼',
        persona: agent.persona,
        skills: (agent.skills || []).join(', '),
        greeting: agent.greeting || '',
        tone: agent.tone,
        is_head: !!agent.is_head,
      })
    } else {
      setEditingAgent(null)
      setAgentForm({
        name: '', department_id: selectedDept || (departments[0]?.id || ''),
        gender: 'male', avatar: '👨‍💼', persona: '', skills: '',
        greeting: '', tone: 'professional', is_head: false,
      })
    }
    setShowAgentModal(true)
  }

  const saveAgent = async () => {
    const body = {
      ...agentForm,
      department_id: Number(agentForm.department_id),
      skills: agentForm.skills.split(',').map(s => s.trim()).filter(Boolean),
    }
    const url = editingAgent ? `${API}/api/team-agents/${editingAgent.id}` : `${API}/api/team-agents`
    const method = editingAgent ? 'PUT' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setShowAgentModal(false)
    fetchData()
  }

  const deleteAgent = async (id) => {
    if (!confirm('Delete this agent?')) return
    await fetch(`${API}/api/team-agents/${id}`, { method: 'DELETE' })
    fetchData()
  }

  const toggleAgentStatus = async (agent) => {
    const newStatus = agent.status === 'active' ? 'offline' : 'active'
    await fetch(`${API}/api/team-agents/${agent.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    fetchData()
  }

  if (loading) return <div className="tm-loading">Loading team data...</div>

  return (
    <div className="tm-page">
      <div className="tm-header">
        <div className="tm-header-left">
          <Link to="/agents" className="tm-back">← Agents</Link>
          <h1>🏢 Team Manager</h1>
          <p className="tm-subtitle">Manage departments, agents, and assignments</p>
        </div>
        <div className="tm-header-actions">
          <button className="tm-btn tm-btn-secondary" onClick={() => openDeptModal()}>+ Department</button>
          <button className="tm-btn tm-btn-primary" onClick={() => openAgentModal()}>+ Agent</button>
        </div>
      </div>

      {/* Department tabs */}
      <div className="tm-dept-tabs">
        <button
          className={`tm-dept-tab ${!selectedDept ? 'active' : ''}`}
          onClick={() => setSelectedDept(null)}
        >
          All ({agents.length})
        </button>
        {departments.map(d => (
          <button
            key={d.id}
            className={`tm-dept-tab ${selectedDept === d.id ? 'active' : ''}`}
            onClick={() => setSelectedDept(d.id)}
          >
            {d.icon} {d.name} ({d.agent_count || 0})
          </button>
        ))}
      </div>

      {/* Department cards */}
      <div className="tm-depts-grid">
        {departments.filter(d => !selectedDept || d.id === selectedDept).map(dept => (
          <div key={dept.id} className="tm-dept-card">
            <div className="tm-dept-card-header">
              <span className="tm-dept-icon">{dept.icon}</span>
              <div>
                <h3>{dept.name}</h3>
                <p>{dept.description}</p>
              </div>
              <div className="tm-dept-actions">
                <button className="tm-icon-btn" onClick={() => openDeptModal(dept)} title="Edit">✏️</button>
                <button className="tm-icon-btn" onClick={() => deleteDept(dept.id)} title="Delete">🗑️</button>
              </div>
            </div>
            <div className="tm-dept-meta">
              <span>{dept.agent_count || 0} agents</span>
              <span className="tm-dept-keywords">
                {(dept.keywords || []).slice(0, 5).map(k => (
                  <span key={k} className="tm-keyword">{k}</span>
                ))}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Agent cards */}
      <h2 className="tm-section-title">
        {selectedDept ? `${departments.find(d => d.id === selectedDept)?.icon || ''} ${departments.find(d => d.id === selectedDept)?.name || ''} Agents` : 'All Agents'}
        <span className="tm-count">{filteredAgents.length}</span>
      </h2>

      <div className="tm-agents-grid">
        {filteredAgents.map(agent => (
          <div key={agent.id} className={`tm-agent-card ${agent.status !== 'active' ? 'tm-agent-offline' : ''}`}>
            <div className="tm-agent-header">
              <span className="tm-agent-avatar">{agent.avatar || '👤'}</span>
              <div className="tm-agent-info">
                <h3>
                  {agent.name}
                  {agent.is_head ? <span className="tm-head-badge">HEAD</span> : null}
                </h3>
                <span className="tm-agent-dept">{agent.department_name}</span>
              </div>
              <span className={`tm-status-dot ${agent.status === 'active' ? 'tm-status-active' : 'tm-status-offline'}`}
                title={agent.status} onClick={() => toggleAgentStatus(agent)} />
            </div>

            <p className="tm-agent-persona">{agent.persona || 'No persona set'}</p>

            <div className="tm-agent-skills">
              {(agent.skills || []).map(s => (
                <span key={s} className="tm-skill-tag">{s}</span>
              ))}
            </div>

            <div className="tm-agent-footer">
              <span className="tm-agent-meta">
                {agent.gender === 'male' ? '♂' : agent.gender === 'female' ? '♀' : '⚧'}
                {' · '}
                {agent.tone}
                {' · '}
                {agent.customer_count || 0} customers
              </span>
              <div className="tm-agent-actions">
                <button className="tm-icon-btn" onClick={() => openAgentModal(agent)} title="Edit">✏️</button>
                <button className="tm-icon-btn" onClick={() => deleteAgent(agent.id)} title="Delete">🗑️</button>
              </div>
            </div>
          </div>
        ))}

        {filteredAgents.length === 0 && (
          <div className="tm-empty">No agents found. Click "+ Agent" to create one.</div>
        )}
      </div>

      {/* Department Modal */}
      {showDeptModal && (
        <div className="tm-modal-overlay" onClick={() => setShowDeptModal(false)}>
          <div className="tm-modal" onClick={e => e.stopPropagation()}>
            <h2>{editingDept ? 'Edit Department' : 'New Department'}</h2>

            <div className="tm-form-group">
              <label>Icon</label>
              <div className="tm-icon-picker">
                {ICON_OPTIONS.map(icon => (
                  <button key={icon}
                    className={`tm-icon-option ${deptForm.icon === icon ? 'selected' : ''}`}
                    onClick={() => setDeptForm(f => ({ ...f, icon }))}
                  >{icon}</button>
                ))}
              </div>
            </div>

            <div className="tm-form-group">
              <label>Name</label>
              <input value={deptForm.name} onChange={e => setDeptForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Customer Service" />
            </div>

            <div className="tm-form-group">
              <label>Description</label>
              <textarea value={deptForm.description}
                onChange={e => setDeptForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What does this department handle?" rows={2} />
            </div>

            <div className="tm-form-group">
              <label>Keywords (comma-separated)</label>
              <input value={deptForm.keywords}
                onChange={e => setDeptForm(f => ({ ...f, keywords: e.target.value }))}
                placeholder="complaint, support, help, issue" />
              <span className="tm-hint">Used for auto-routing queries to this department</span>
            </div>

            <div className="tm-modal-actions">
              <button className="tm-btn tm-btn-secondary" onClick={() => setShowDeptModal(false)}>Cancel</button>
              <button className="tm-btn tm-btn-primary" onClick={saveDept} disabled={!deptForm.name.trim()}>
                {editingDept ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agent Modal */}
      {showAgentModal && (
        <div className="tm-modal-overlay" onClick={() => setShowAgentModal(false)}>
          <div className="tm-modal tm-modal-wide" onClick={e => e.stopPropagation()}>
            <h2>{editingAgent ? 'Edit Agent' : 'New Agent'}</h2>

            <div className="tm-form-row">
              <div className="tm-form-group">
                <label>Avatar</label>
                <div className="tm-icon-picker">
                  {AVATAR_OPTIONS.map(av => (
                    <button key={av}
                      className={`tm-icon-option ${agentForm.avatar === av ? 'selected' : ''}`}
                      onClick={() => setAgentForm(f => ({ ...f, avatar: av }))}
                    >{av}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="tm-form-row">
              <div className="tm-form-group">
                <label>Name</label>
                <input value={agentForm.name}
                  onChange={e => setAgentForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Ammar Sheikh" />
              </div>
              <div className="tm-form-group">
                <label>Department</label>
                <select value={agentForm.department_id}
                  onChange={e => setAgentForm(f => ({ ...f, department_id: e.target.value }))}>
                  <option value="">Select department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.icon} {d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="tm-form-row">
              <div className="tm-form-group">
                <label>Gender</label>
                <select value={agentForm.gender}
                  onChange={e => setAgentForm(f => ({ ...f, gender: e.target.value }))}>
                  {GENDER_OPTIONS.map(g => (
                    <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="tm-form-group">
                <label>Tone</label>
                <select value={agentForm.tone}
                  onChange={e => setAgentForm(f => ({ ...f, tone: e.target.value }))}>
                  {TONE_OPTIONS.map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="tm-form-group">
              <label>Persona</label>
              <textarea value={agentForm.persona}
                onChange={e => setAgentForm(f => ({ ...f, persona: e.target.value }))}
                placeholder="Describe this agent's personality and expertise..." rows={3} />
            </div>

            <div className="tm-form-group">
              <label>Skills (comma-separated)</label>
              <input value={agentForm.skills}
                onChange={e => setAgentForm(f => ({ ...f, skills: e.target.value }))}
                placeholder="order tracking, complaint resolution, billing" />
            </div>

            <div className="tm-form-group">
              <label>Greeting Message</label>
              <input value={agentForm.greeting}
                onChange={e => setAgentForm(f => ({ ...f, greeting: e.target.value }))}
                placeholder="Hi! I'm here to help with..." />
            </div>

            <div className="tm-form-group tm-checkbox-group">
              <label>
                <input type="checkbox" checked={agentForm.is_head}
                  onChange={e => setAgentForm(f => ({ ...f, is_head: e.target.checked }))} />
                Department Head
              </label>
              <span className="tm-hint">Head agents oversee and can override sub-agent responses</span>
            </div>

            <div className="tm-modal-actions">
              <button className="tm-btn tm-btn-secondary" onClick={() => setShowAgentModal(false)}>Cancel</button>
              <button className="tm-btn tm-btn-primary" onClick={saveAgent}
                disabled={!agentForm.name.trim() || !agentForm.department_id}>
                {editingAgent ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeamManager
