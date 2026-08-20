import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export function AdminPrograms() {
  const { profile } = useAuth()
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const loadPrograms = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('programs')
      .select('*, workouts(count), assignments(count)')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setPrograms(data)
    setLoading(false)
  }

  useEffect(() => { loadPrograms() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    const { error } = await supabase
      .from('programs')
      .insert({ name: name.trim(), created_by: profile.id })
    setCreating(false)
    if (error) {
      setError(error.message)
    } else {
      setName('')
      loadPrograms()
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this program and all its workouts, exercises, assignments, and logs?')) return
    const { error } = await supabase.from('programs').delete().eq('id', id)
    if (error) setError(error.message)
    else loadPrograms()
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold tracking-wide">Programs</h1>
      </div>

      <form onSubmit={handleCreate} className="mb-8 flex gap-2">
        <input
          type="text"
          placeholder="New program name, e.g. 12-Week Strength Block"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded border border-line bg-panel px-3 py-2 text-chalk outline-none focus:border-cobalt"
        />
        <button
          type="submit"
          disabled={creating}
          className="rounded bg-cobalt px-4 py-2 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {creating ? 'Creating…' : 'Create program'}
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="text-muted font-mono text-sm">Loading…</p>
      ) : programs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-8 text-center text-muted">
          No programs yet. Create one above to start building a training plan.
        </div>
      ) : (
        <ul className="space-y-2">
          {programs.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-line bg-panel px-4 py-3"
            >
              <Link to={`/admin/programs/${p.id}`} className="flex-1">
                <div className="font-semibold text-chalk">{p.name}</div>
                <div className="mt-0.5 font-mono text-xs text-muted">
                  {p.workouts?.[0]?.count ?? 0} workouts · {p.assignments?.[0]?.count ?? 0} assigned
                </div>
              </Link>
              <div className="flex gap-2">
                <Link
                  to={`/admin/programs/${p.id}`}
                  className="rounded border border-line px-3 py-1.5 text-sm text-chalk-dim hover:border-cobalt hover:text-chalk"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="rounded border border-line px-3 py-1.5 text-sm text-chalk-dim hover:border-danger hover:text-danger"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
