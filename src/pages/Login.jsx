import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await signIn(email, password)
    setBusy(false)
    if (error) {
      setError(error.message)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-display text-4xl font-bold tracking-wide text-chalk">Toro y Pampa</div>
          <p className="mt-1 text-sm text-muted">Iniciá sesión en tu registro de entrenamiento</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-line bg-panel p-6">
          {error && (
            <div className="rounded border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Correo electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-line bg-panel-raised px-3 py-2 text-chalk outline-none focus:border-cobalt"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-line bg-panel-raised px-3 py-2 text-chalk outline-none focus:border-cobalt"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded bg-cobalt py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          ¿No tenés cuenta? <Link to="/signup" className="text-cobalt hover:underline">Registrate</Link>
        </p>
      </div>
    </div>
  )
}
