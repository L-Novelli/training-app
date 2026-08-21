import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Navbar() {
  const { profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  const linkClass = ({ isActive }) =>
    `px-3 py-1.5 text-sm font-medium rounded transition-colors ${
      isActive ? 'bg-cobalt text-white' : 'text-chalk-dim hover:text-chalk'
    }`

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="border-b border-line bg-panel">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="font-display text-2xl font-bold tracking-wide text-chalk">
            IRONLOG
          </span>
          <nav className="flex gap-1">
            {isAdmin ? (
              <>
                <NavLink to="/" end className={linkClass}>Programas</NavLink>
                <NavLink to="/admin/users" className={linkClass}>Usuarios</NavLink>
              </>
            ) : (
              <NavLink to="/" end className={linkClass}>Mis Programas</NavLink>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted sm:inline">
            {profile?.full_name || profile?.email}
            {isAdmin && <span className="ml-2 rounded bg-brass/20 px-1.5 py-0.5 text-xs font-semibold text-brass">ADMIN</span>}
          </span>
          <button
            onClick={handleSignOut}
            className="rounded border border-line px-3 py-1.5 text-sm text-chalk-dim hover:border-danger hover:text-danger transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  )
}
