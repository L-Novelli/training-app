import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export function AdminPrograms()  {
  const [programs, setPrograms] = useState([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    fetchPrograms()
  }, [])

  async function fetchPrograms() {
    setFetching(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPrograms(data || [])
    } catch (err) {
      console.error('Fetch programs error:', err)
      setError(err.message || 'No se pudieron cargar los programas.')
    } finally {
      setFetching(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('El nombre del programa no puede estar vacío.')
      return
    }

    setLoading(true)
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      const { error } = await supabase
        .from('programs')
        .insert([{ name: name.trim(), created_by: userData.user.id }])

      if (error) throw error

      setName('')
      await fetchPrograms()
    } catch (err) {
      console.error('Create program error:', err)
      setError(err.message || 'No se pudo crear el programa. Revisá la consola para más detalles.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(program) {
    if (!confirm(`¿Eliminar el programa "${program.name}"? Esto también va a borrar todos sus días de entrenamiento, ejercicios y las asignaciones a usuarios. Esta acción no se puede deshacer.`)) return

    setError('')
    try {
      const { error } = await supabase.from('programs').delete().eq('id', program.id)
      if (error) throw error
      setPrograms((prev) => prev.filter((p) => p.id !== program.id))
    } catch (err) {
      console.error('Delete program error:', err)
      setError(err.message || 'No se pudo eliminar el programa.')
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 font-display text-3xl font-bold tracking-wide text-chalk">Programas</h1>

      {error && (
        <div className="mb-4 rounded border border-danger bg-danger/10 px-4 py-2 text-danger">
          {error}
        </div>
      )}

      <form onSubmit={handleCreate} className="mb-6 flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del nuevo programa, ej. Bloque de Fuerza 12 Semanas"
          className="flex-1 rounded border border-line bg-panel-raised px-3 py-2 text-chalk outline-none focus:border-cobalt"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-cobalt px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Creando...' : 'Crear programa'}
        </button>
      </form>

      {fetching ? (
        <p className="font-mono text-sm text-muted">Cargando programas...</p>
      ) : programs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-8 text-center text-muted">
          Todavía no hay programas. Creá uno arriba para empezar a armar un plan de entrenamiento.
        </div>
      ) : (
        <ul className="space-y-2">
          {programs.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded border border-line bg-panel-raised px-4 py-3"
            >
              <span className="text-chalk">{p.name}</span>
              <div className="flex items-center gap-3">
                <Link
                  to={`/admin/programs/${p.id}`}
                  className="text-sm text-cobalt hover:underline"
                >
                  Editar →
                </Link>
                <button
                  onClick={() => handleDelete(p)}
                  className="text-xs text-muted hover:text-danger"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}