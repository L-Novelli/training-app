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

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Programas</h1>

      {error && (
        <div className="bg-red-900/40 border border-red-600 text-red-200 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleCreate} className="flex gap-2 mb-6">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del nuevo programa, ej. Bloque de Fuerza 12 Semanas"
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded"
        >
          {loading ? 'Creando...' : 'Crear programa'}
        </button>
      </form>

      {fetching ? (
        <p className="text-gray-400">Cargando programas...</p>
      ) : programs.length === 0 ? (
        <div className="border border-dashed border-gray-700 rounded p-8 text-center text-gray-500">
          Todavía no hay programas. Creá uno arriba para empezar a armar un plan de entrenamiento.
        </div>
      ) : (
        <ul className="space-y-2">
          {programs.map((p) => (
            <li
              key={p.id}
              className="bg-gray-800 border border-gray-700 rounded px-4 py-3 flex justify-between items-center"
            >
              <span>{p.name}</span>
              <Link
                to={`/admin/programs/${p.id}`}
                className="text-indigo-400 hover:text-indigo-300 text-sm"
              >
                Editar →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}