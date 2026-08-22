import { Routes, Route } from 'react-router-dom'
import ChatWidget from './components/ChatWidget'
import Dashboard from './pages/Dashboard'
import AdminPanel from './pages/AdminPanel'
import KnowledgeManager from './pages/KnowledgeManager'
import AgentDashboard from './pages/AgentDashboard'
import ShipmentTracking from './pages/agents/ShipmentTracking'
import CustomerReply from './pages/agents/CustomerReply'
import CSKnowledge from './pages/agents/CSKnowledge'
import StuckShipment from './pages/agents/StuckShipment'
import DeliveryDelay from './pages/agents/DeliveryDelay'
import NDRAgent from './pages/agents/NDRAgent'
import PickupAgent from './pages/agents/PickupAgent'
import CODAgent from './pages/agents/CODAgent'
import ReturnRTO from './pages/agents/ReturnRTO'
import CustomerComplaint from './pages/agents/CustomerComplaint'
import CourierEscalation from './pages/agents/CourierEscalation'
import PriorityEscalation from './pages/agents/PriorityEscalation'
import ShipmentInvestigation from './pages/agents/ShipmentInvestigation'
import DailyCSReport from './pages/agents/DailyCSReport'
import CSPerformance from './pages/agents/CSPerformance'
import OrioAgent from './pages/agents/OrioAgent'
import HandoffAdmin from './pages/HandoffAdmin'
import TeamManager from './pages/TeamManager'
import './App.css'

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<div />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/admin/knowledge" element={<KnowledgeManager />} />
        <Route path="/agents" element={<AgentDashboard />} />
        <Route path="/agents/shipment-tracking" element={<ShipmentTracking />} />
        <Route path="/agents/customer-reply" element={<CustomerReply />} />
        <Route path="/agents/cs-knowledge" element={<CSKnowledge />} />
        <Route path="/agents/stuck-shipment" element={<StuckShipment />} />
        <Route path="/agents/delivery-delay" element={<DeliveryDelay />} />
        <Route path="/agents/ndr" element={<NDRAgent />} />
        <Route path="/agents/pickup" element={<PickupAgent />} />
        <Route path="/agents/cod" element={<CODAgent />} />
        <Route path="/agents/return-rto" element={<ReturnRTO />} />
        <Route path="/agents/customer-complaint" element={<CustomerComplaint />} />
        <Route path="/agents/courier-escalation" element={<CourierEscalation />} />
        <Route path="/agents/priority-escalation" element={<PriorityEscalation />} />
        <Route path="/agents/shipment-investigation" element={<ShipmentInvestigation />} />
        <Route path="/agents/daily-cs-report" element={<DailyCSReport />} />
        <Route path="/agents/cs-performance" element={<CSPerformance />} />
        <Route path="/agents/orio" element={<OrioAgent />} />
        <Route path="/admin/handoffs" element={<HandoffAdmin />} />
        <Route path="/admin/team" element={<TeamManager />} />
      </Routes>
      <ChatWidget />
    </div>
  )
}

export default App
