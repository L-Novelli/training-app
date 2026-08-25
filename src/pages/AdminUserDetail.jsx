import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export function AdminUserDetail() {
  const { id: userId } = useParams()
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [assignedPrograms, setAssignedPrograms] = useState([])
  const [unassignedPrograms, setUnassignedPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [assigning, setAssigning] = useState(false)

  const [newProgramName, setNewProgramName] = useState('')
  const [creating, setCreating] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [{ data: profileData, error: profileErr }, { data: assignmentsData, error: assignErr }, { data: allPrograms, error: progErr }] =
        await Promise.all([
          supabase.from('profiles').select('*').eq('id', userId).single(),
          supabase
            .from('assignments')
            .select('id, program_id, start_date, programs(id, name, description)')
            .eq('user_id', userId)
            .order('assigned_at', { ascending: false }),
          supabase.from('programs').select('id, name').order('name'),
        ])

      if (profileErr) throw profileErr
      if (assignErr) throw assignErr
      if (progErr) throw progErr

      setUser(profileData)

      const assigned = (assignmentsData || []).filter((a) => a.programs)
      setAssignedPrograms(assigned)

      const assignedIds = new Set(assigned.map((a) => a.program_id))
      setUnassignedPrograms((allPrograms || []).filter((p) => !assignedIds.has(p.id)))
    } catch (err) {
      console.error('Load user detail error:', err)
      setError(err.message || 'No se pudo cargar la información del usuario.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [userId])

  async function handleAssignExisting(e) {
    e.preventDefault()
    if (!selectedProgramId) return
    setAssigning(true)
    setError('')
    try {
      const { data: { user: adminUser } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('assignments')
        .insert({ program_id: selectedProgramId, user_id: userId, assigned_by: adminUser.id })
      if (error) throw error
      setSelectedProgramId('')
      await load()
    } catch (err) {
      console.error('Assign program error:', err)
      setError(err.message || 'No se pudo asignar el programa.')
    } finally {
      setAssigning(false)
    }
  }

  async function handleUnassign(assignmentId) {
    if (!confirm('¿Quitarle este programa a este usuario?')) return
    setError('')
    try {
      const { error } = await supabase.from('assignments').delete().eq('id', assignmentId)
      if (error) throw error
      await load()
    } catch (err) {
      console.error('Unassign error:', err)
      setError(err.message || 'No se pudo quitar el programa.')
    }
  }

  async function handleCreateForUser(e) {
    e.preventDefault()
    if (!newProgramName.trim()) {
      setError('El nombre del programa no puede estar vacío.')
      return
    }
    setCreating(true)
    setError('')
    try {
      const { data: { user: adminUser } } = await supabase.auth.getUser()

      const { data: newProgram, error: createErr } = await supabase
        .from('programs')
        .insert({ name: newProgramName.trim(), created_by: adminUser.id })
        .select()
        .single()
      if (createErr) throw createErr

      const { error: assignErr } = await supabase
        .from('assignments')
        .insert({ program_id: newProgram.id, user_id: userId, assigned_by: adminUser.id })
      if (assignErr) throw assignErr

      // Va directo al editor de ese programa para que el admin arme la rutina.
      navigate(`/admin/programs/${newProgram.id}`)
    } catch (err) {
      console.error('Create program for user error:', err)
      setError(err.message || 'No se pudo crear el programa.')
      setCreating(false)
    }
  }

  if (loading) return <p className="mx-auto max-w-3xl px-4 py-8 font-mono text-sm text-muted">Cargando…</p>
  if (!user) return <p className="mx-auto max-w-3xl px-4 py-8 text-danger">Usuario no encontrado.</p>

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/admin/users" className="mb-4 inline-block text-sm text-muted hover:text-chalk">← Todos los usuarios</Link>

      <div className="mb-6 flex items-center gap-4">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="Foto de perfil" className="h-16 w-16 rounded-full border border-line object-cover" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-line bg-panel-raised text-xl font-semibold text-muted">
            {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
          </span>
        )}
        <div>
          <h1 className="font-display text-3xl font-bold tracking-wide text-chalk">
            {user.full_name || '(sin nombre)'}
            {user.role === 'admin' && (
              <span className="ml-2 rounded bg-brass/20 px-1.5 py-0.5 text-xs font-semibold text-brass">ADMIN</span>
            )}
          </h1>
          <p className="font-mono text-sm text-muted">
            {user.email}{user.phone ? ` · ${user.phone}` : ''}
          </p>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      {/* Rutinas asignadas */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-chalk">Rutinas asignadas</h2>
        {assignedPrograms.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line p-6 text-center text-muted">
            Este usuario todavía no tiene rutinas asignadas.
          </div>
        ) : (
          <ul className="space-y-2">
            {assignedPrograms.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-line bg-panel px-4 py-3"
              >
                <div>
                  <div className="text-chalk">{a.programs.name}</div>
                  {a.programs.description && (
                    <div className="text-sm text-muted">{a.programs.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    to={`/admin/programs/${a.program_id}`}
                    className="text-sm text-cobalt hover:underline"
                  >
                    Editar →
                  </Link>
                  <button
                    onClick={() => handleUnassign(a.id)}
                    className="text-xs text-muted hover:text-danger"
                  >
                    Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Asignar programa existente */}
      <section className="mb-8 rounded-lg border border-line bg-panel-raised p-6">
        <h2 className="mb-3 text-lg font-semibold text-chalk">Asignar un programa existente</h2>
        {unassignedPrograms.length === 0 ? (
          <p className="text-sm text-muted">No hay más programas disponibles para asignar (o ya están todos asignados a este usuario).</p>
        ) : (
          <form onSubmit={handleAssignExisting} className="flex gap-2">
            <select
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              className="flex-1 rounded border border-line bg-panel px-3 py-2 text-chalk outline-none focus:border-cobalt"
            >
              <option value="">Elegí un programa…</option>
              {unassignedPrograms.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={assigning || !selectedProgramId}
              className="rounded bg-cobalt px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {assigning ? 'Asignando...' : 'Asignar'}
            </button>
          </form>
        )}
      </section>

      {/* Crear programa nuevo directamente para este usuario */}
      <section className="rounded-lg border border-line bg-panel-raised p-6">
        <h2 className="mb-3 text-lg font-semibold text-chalk">Crear una rutina nueva para {user.full_name || user.email}</h2>
        <form onSubmit={handleCreateForUser} className="flex gap-2">
          <input
            type="text"
            value={newProgramName}
            onChange={(e) => setNewProgramName(e.target.value)}
            placeholder="Nombre del programa, ej. Fuerza — Bloque 1"
            className="flex-1 rounded border border-line bg-panel px-3 py-2 text-chalk outline-none focus:border-cobalt"
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded bg-cobalt px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {creating ? 'Creando...' : 'Crear y asignar'}
          </button>
        </form>
        <p className="mt-2 text-xs text-muted">
          Se crea el programa, se le asigna automáticamente a este usuario, y te lleva directo al editor para armar los días y ejercicios.
        </p>
      </section>
    </div>
  )
}
