import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function ProtectedRoute({ children, adminOnly = false }) {
  const { session, isAdmin, loading, profile } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted font-mono text-sm">
        Cargando…
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  // Session exists but profile hasn't loaded yet (rare edge case) — wait.
  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center text-muted font-mono text-sm">
        Cargando…
      </div>
    )
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}
