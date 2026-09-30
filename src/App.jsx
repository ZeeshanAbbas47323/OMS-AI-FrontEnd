import { Route, Routes } from 'react-router-dom'
import { useLocation } from "react-router-dom";
import ChatWidget from './components/ChatWidget'
import RequireAuth from './components/RequireAuth'
import Login from './pages/Login'
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
import SalesAgent from './pages/agents/SalesAgent'
import Tickets from './pages/Tickets'
import Outbox from './pages/Outbox'
import Inbox from './pages/Inbox'
import Usage from './pages/Usage'
import HandoffAdmin from './pages/HandoffAdmin'
import TeamManager from './pages/TeamManager'
import './App.css'

function App() {
  
  const location = useLocation();

  console.log(location.pathname)
  return (
    <div className="app">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<div />} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/admin" element={<RequireAuth><AdminPanel /></RequireAuth>} />
        <Route path="/tickets" element={<RequireAuth><Tickets /></RequireAuth>} />
        <Route path="/admin/knowledge" element={<RequireAuth><KnowledgeManager /></RequireAuth>} />
        <Route path="/agents" element={<RequireAuth><AgentDashboard /></RequireAuth>} />
        <Route path="/agents/shipment-tracking" element={<RequireAuth><ShipmentTracking /></RequireAuth>} />
        <Route path="/agents/customer-reply" element={<RequireAuth><CustomerReply /></RequireAuth>} />
        <Route path="/agents/cs-knowledge" element={<RequireAuth><CSKnowledge /></RequireAuth>} />
        <Route path="/agents/stuck-shipment" element={<RequireAuth><StuckShipment /></RequireAuth>} />
        <Route path="/agents/delivery-delay" element={<RequireAuth><DeliveryDelay /></RequireAuth>} />
        <Route path="/agents/ndr" element={<RequireAuth><NDRAgent /></RequireAuth>} />
        <Route path="/agents/pickup" element={<RequireAuth><PickupAgent /></RequireAuth>} />
        <Route path="/agents/cod" element={<RequireAuth><CODAgent /></RequireAuth>} />
        <Route path="/agents/return-rto" element={<RequireAuth><ReturnRTO /></RequireAuth>} />
        <Route path="/agents/customer-complaint" element={<RequireAuth><CustomerComplaint /></RequireAuth>} />
        <Route path="/agents/courier-escalation" element={<RequireAuth><CourierEscalation /></RequireAuth>} />
        <Route path="/agents/priority-escalation" element={<RequireAuth><PriorityEscalation /></RequireAuth>} />
        <Route path="/agents/shipment-investigation" element={<RequireAuth><ShipmentInvestigation /></RequireAuth>} />
        <Route path="/agents/daily-cs-report" element={<RequireAuth><DailyCSReport /></RequireAuth>} />
        <Route path="/agents/cs-performance" element={<RequireAuth><CSPerformance /></RequireAuth>} />
        <Route path="/agents/orio" element={<RequireAuth><OrioAgent /></RequireAuth>} />
        <Route path="/agents/sales-agent" element={<RequireAuth><SalesAgent /></RequireAuth>} />
        <Route path="/outbox" element={<RequireAuth><Outbox /></RequireAuth>} />
        <Route path="/inbox" element={<RequireAuth><Inbox /></RequireAuth>} />
        <Route path="/usage" element={<RequireAuth><Usage /></RequireAuth>} />
        <Route path="/admin/handoffs" element={<RequireAuth><HandoffAdmin /></RequireAuth>} />
        <Route path="/admin/team" element={<RequireAuth><TeamManager /></RequireAuth>} />
      </Routes>
      {!location.pathname.startsWith("/agents") && <ChatWidget />}
      {/* <ChatWidget /> */}
    </div>
  )
}

export default App
