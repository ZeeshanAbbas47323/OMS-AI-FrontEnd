import './OrderTimeline.css'

const JOURNEY_STEPS = [
  { key: 'new', label: 'Order Placed', icon: '📝' },
  { key: 'confirmed', label: 'Confirmed', icon: '✅' },
  { key: 'shipped', label: 'Shipped', icon: '📦' },
  { key: 'on_route', label: 'On Route', icon: '🚚' },
  { key: 'delivered', label: 'Delivered', icon: '🎉' },
]

const RETURN_STEPS = [
  { key: 'new', label: 'Order Placed', icon: '📝' },
  { key: 'confirmed', label: 'Confirmed', icon: '✅' },
  { key: 'shipped', label: 'Shipped', icon: '📦' },
  { key: 'on_route', label: 'On Route', icon: '🚚' },
  { key: 'return', label: 'Returned', icon: '↩️' },
]

const STATUS_MAP = {
  'new': 0,
  'confirmed': 1,
  'shipped': 2,
  'on route': 3,
  'delivered': 4,
  'return': 4,
  'out of stock': 1,
  'on hold': 2,
  'first call attempt': 3,
  'second call attempt': 3,
  'replacement': 2,
}

export default function OrderTimeline({ status, orderDate, deliveryDate }) {
  if (!status) return null

  const statusLower = status.toLowerCase()
  const isReturn = statusLower === 'return'
  const steps = isReturn ? RETURN_STEPS : JOURNEY_STEPS
  const currentStep = STATUS_MAP[statusLower] ?? 0

  const isStuck = ['on hold', 'out of stock', 'first call attempt', 'second call attempt'].includes(statusLower)

  return (
    <div className="order-timeline">
      <div className="timeline-track">
        {steps.map((step, i) => {
          const isCompleted = i <= currentStep
          const isCurrent = i === currentStep
          const isLast = i === steps.length - 1

          return (
            <div key={step.key} className="timeline-step">
              <div className={`timeline-node ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isReturn && isLast && isCurrent ? 'return' : ''}`}>
                <span className="timeline-icon">{step.icon}</span>
              </div>
              <div className={`timeline-label ${isCurrent ? 'current' : ''}`}>
                {step.label}
              </div>
              {!isLast && (
                <div className={`timeline-connector ${i < currentStep ? 'completed' : ''}`} />
              )}
            </div>
          )
        })}
      </div>
      {isStuck && (
        <div className="timeline-stuck">
          ⚠️ Status: {status}
        </div>
      )}
      <div className="timeline-dates">
        {orderDate && <span>Ordered: {orderDate}</span>}
        {deliveryDate && <span>Delivered: {deliveryDate}</span>}
      </div>
    </div>
  )
}
