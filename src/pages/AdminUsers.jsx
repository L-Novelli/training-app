import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*, assignments(count)')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setUsers(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const toggleRole = async (u) => {
    const newRole = u.role === 'admin' ? 'user' : 'admin'
    if (!confirm(`Change ${u.email} to ${newRole}?`)) return
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', u.id)
    if (error) setError(error.message)
    else load()
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 font-display text-3xl font-bold tracking-wide">Users</h1>

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="font-mono text-sm text-muted">Loading…</p>
      ) : (
        <ul className="space-y-2">
          {users.map((u) => (
            <li key={u.id} className="flex items-center justify-between rounded-lg border border-line bg-panel px-4 py-3">
              <div>
                <div className="text-chalk">
                  {u.full_name || '(no name set)'}
                  {u.role === 'admin' && (
                    <span className="ml-2 rounded bg-brass/20 px-1.5 py-0.5 text-xs font-semibold text-brass">ADMIN</span>
                  )}
                </div>
                <div className="font-mono text-xs text-muted">
                  {u.email} · {u.assignments?.[0]?.count ?? 0} programs assigned
                </div>
              </div>
              <button
                onClick={() => toggleRole(u)}
                className="rounded border border-line px-3 py-1.5 text-sm text-chalk-dim hover:border-cobalt hover:text-chalk"
              >
                Make {u.role === 'admin' ? 'user' : 'admin'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
