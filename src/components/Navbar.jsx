import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Navbar() {
  const { profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const linkClass = ({ isActive }) =>
    `block rounded px-4 py-3 text-base font-medium transition-colors ${
      isActive ? 'bg-cobalt text-white' : 'text-chalk-dim hover:bg-panel-raised hover:text-chalk'
    }`

  const handleSignOut = async () => {
    setDrawerOpen(false)
    await signOut()
    navigate('/login')
  }

  const closeDrawer = () => setDrawerOpen(false)

  return (
    <>
      <header className="border-b border-line bg-panel">
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menú"
            className="flex h-9 w-9 items-center justify-center rounded border border-line text-chalk-dim hover:border-cobalt hover:text-chalk"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>

          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-navbar text-2xl tracking-wide text-chalk sm:text-3xl">
            COMANDOS.
          </span>

          {/* Espaciador para mantener el logo centrado (mismo ancho que el botón de la izquierda) */}
          <span className="h-9 w-9" aria-hidden="true" />
        </div>
      </header>

      <div
        className={`fixed inset-0 z-50 ${drawerOpen ? '' : 'pointer-events-none'}`}
        aria-hidden={!drawerOpen}
      >
        <button
          aria-label="Cerrar menú"
          onClick={closeDrawer}
          tabIndex={drawerOpen ? 0 : -1}
          className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ease-out ${
            drawerOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />

        <nav
          className={`absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col border-r border-line bg-panel shadow-2xl transition-transform duration-300 ease-out ${
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="border-b border-line px-5 py-6 text-center">
            <span
              className="block whitespace-normal italic text-brass"
              style={{ fontFamily: "'Tangerine', 'Cormorant Garamond', serif", fontSize: '2rem', lineHeight: 1.15, fontWeight: 700 }}
            >
              ... O juremos con gloria morir
            </span>
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto p-3">
            {isAdmin ? (
              <>
                <NavLink to="/" end className={linkClass} onClick={closeDrawer}>Programas</NavLink>
                <NavLink to="/admin/users" className={linkClass} onClick={closeDrawer}>Usuarios</NavLink>
              </>
            ) : (
              <NavLink to="/mis-programas" className={linkClass} onClick={closeDrawer}>Programas</NavLink>
            )}
            <NavLink to="/playlists" className={linkClass} onClick={closeDrawer}>Playlists</NavLink>
            <NavLink to="/perfil" className={linkClass} onClick={closeDrawer}>Perfil</NavLink>
          </div>

          <div className="border-t border-line p-4">
            <NavLink to="/perfil" onClick={closeDrawer} className="mb-3 flex items-center gap-3">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Perfil"
                  className="h-10 w-10 rounded-full border border-line object-cover"
                />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-panel-raised text-sm font-semibold text-muted">
                  {(profile?.full_name || profile?.email || '?').charAt(0).toUpperCase()}
                </span>
              )}
              <span className="text-sm text-chalk">
                <span className="block">{profile?.full_name || profile?.email}</span>
                {isAdmin && (
                  <span className="mt-0.5 inline-block rounded bg-brass/20 px-1.5 py-0.5 text-xs font-semibold text-brass">
                    ADMIN
                  </span>
                )}
              </span>
            </NavLink>
            <button
              onClick={handleSignOut}
              className="w-full rounded border border-line px-3 py-2 text-sm text-chalk-dim hover:border-danger hover:text-danger"
            >
              Cerrar sesión
            </button>
          </div>
        </nav>
      </div>
    </>
  )
}
