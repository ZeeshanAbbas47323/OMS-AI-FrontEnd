import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Keeps the staff pages behind a sign-in.
 *
 * This is a convenience, not the protection: the backend rejects any
 * request without a valid key regardless of what the interface shows. It
 * exists so someone who is not signed in sees a login form rather than a
 * page full of failed requests.
 */
export default function RequireAuth({ children }) {
  const { account, checking } = useAuth()
  const location = useLocation()

  if (checking) return <div className="auth-checking">Checking your session…</div>
  if (!account) return <Navigate to="/login" replace state={{ from: location }} />
  return children
}
