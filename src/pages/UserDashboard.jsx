import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export function UserDashboard() {
  const { user } = useAuth()
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('assignments')
        .select('start_date, programs(id, name, description, workouts(count))')
        .eq('user_id', user.id)
        .order('assigned_at', { ascending: false })
      setPrograms(data || [])
      setLoading(false)
    }
    load()
  }, [user.id])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 font-display text-3xl font-bold tracking-wide">Mis Programas</h1>

      {loading ? (
        <p className="font-mono text-sm text-muted">Cargando…</p>
      ) : programs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-8 text-center text-muted">
          Todavía no tenés programas asignados. Cuando tu entrenador te asigne uno, va a aparecer acá.
        </div>
      ) : (
        <ul className="space-y-2">
          {programs.map(({ programs: p, start_date }) => (
            <li key={p.id}>
              <Link
                to={`/program/${p.id}`}
                className="block rounded-lg border border-line bg-panel px-4 py-3 hover:border-cobalt"
              >
                <div className="font-semibold text-chalk">{p.name}</div>
                {p.description && <div className="mt-0.5 text-sm text-chalk-dim">{p.description}</div>}
                <div className="mt-1 font-mono text-xs text-muted">
                  {p.workouts?.[0]?.count ?? 0} días de entrenamiento · iniciado el {start_date}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
