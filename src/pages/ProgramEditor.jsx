import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const emptyExercise = { name: '', sets: 3, reps: '8-10', target_weight: '', rest_seconds: 60, notes: '' }

export function ProgramEditor() {
  const { id: programId } = useParams()
  const [program, setProgram] = useState(null)
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('build')

  // assignment tab state
  const [allUsers, setAllUsers] = useState([])
  const [assignedUserIds, setAssignedUserIds] = useState(new Set())

  const loadAll = async () => {
    setLoading(true)
    const [{ data: prog, error: progErr }, { data: w, error: wErr }] = await Promise.all([
      supabase.from('programs').select('*').eq('id', programId).single(),
      supabase
        .from('workouts')
        .select('*, exercises(*)')
        .eq('program_id', programId)
        .order('day_order', { ascending: true }),
    ])
    if (progErr) setError(progErr.message)
    else setProgram(prog)

    if (wErr) setError(wErr.message)
    else {
      const sorted = (w || []).map((wk) => ({
        ...wk,
        exercises: (wk.exercises || []).sort((a, b) => a.order_index - b.order_index),
      }))
      setWorkouts(sorted)
    }
    setLoading(false)
  }

  const loadAssignments = async () => {
    const [{ data: users }, { data: assignments }] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name, role').order('full_name'),
      supabase.from('assignments').select('user_id').eq('program_id', programId),
    ])
    setAllUsers((users || []).filter((u) => u.role !== 'admin'))
    setAssignedUserIds(new Set((assignments || []).map((a) => a.user_id)))
  }

  useEffect(() => { loadAll() }, [programId])
  useEffect(() => { if (tab === 'assign') loadAssignments() }, [tab, programId])

  const updateProgramField = async (field, value) => {
    setProgram((p) => ({ ...p, [field]: value }))
  }
  const saveProgramField = async (field, value) => {
    const { error } = await supabase.from('programs').update({ [field]: value }).eq('id', programId)
    if (error) setError(error.message)
  }

  const addWorkout = async () => {
    const { data, error } = await supabase
      .from('workouts')
      .insert({ program_id: programId, name: `Día ${workouts.length + 1}`, day_order: workouts.length })
      .select('*, exercises(*)')
      .single()
    if (error) setError(error.message)
    else setWorkouts((w) => [...w, { ...data, exercises: [] }])
  }

  const updateWorkoutName = async (workoutId, name) => {
    setWorkouts((w) => w.map((wk) => (wk.id === workoutId ? { ...wk, name } : wk)))
  }
  const saveWorkoutName = async (workoutId, name) => {
    await supabase.from('workouts').update({ name }).eq('id', workoutId)
  }

  const deleteWorkout = async (workoutId) => {
    if (!confirm('¿Eliminar este día de entrenamiento y todos sus ejercicios?')) return
    const { error } = await supabase.from('workouts').delete().eq('id', workoutId)
    if (error) setError(error.message)
    else setWorkouts((w) => w.filter((wk) => wk.id !== workoutId))
  }

  const addExercise = async (workoutId) => {
    const workout = workouts.find((w) => w.id === workoutId)
    const { data, error } = await supabase
      .from('exercises')
      .insert({ workout_id: workoutId, order_index: workout.exercises.length, ...emptyExercise, name: 'Ejercicio nuevo' })
      .select()
      .single()
    if (error) { setError(error.message); return }
    setWorkouts((w) => w.map((wk) => wk.id === workoutId ? { ...wk, exercises: [...wk.exercises, data] } : wk))
  }

  const updateExerciseLocal = (workoutId, exerciseId, field, value) => {
    setWorkouts((w) => w.map((wk) => wk.id !== workoutId ? wk : {
      ...wk,
      exercises: wk.exercises.map((ex) => ex.id === exerciseId ? { ...ex, [field]: value } : ex),
    }))
  }

  const saveExerciseField = async (exerciseId, field, value) => {
    await supabase.from('exercises').update({ [field]: value }).eq('id', exerciseId)
  }

  const deleteExercise = async (workoutId, exerciseId) => {
    const { error } = await supabase.from('exercises').delete().eq('id', exerciseId)
    if (error) { setError(error.message); return }
    setWorkouts((w) => w.map((wk) => wk.id !== workoutId ? wk : {
      ...wk, exercises: wk.exercises.filter((ex) => ex.id !== exerciseId),
    }))
  }

  const toggleAssignment = async (userId) => {
    const isAssigned = assignedUserIds.has(userId)
    if (isAssigned) {
      const { error } = await supabase.from('assignments').delete()
        .eq('program_id', programId).eq('user_id', userId)
      if (error) { setError(error.message); return }
      setAssignedUserIds((prev) => { const next = new Set(prev); next.delete(userId); return next })
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('assignments')
        .insert({ program_id: programId, user_id: userId, assigned_by: user.id })
      if (error) { setError(error.message); return }
      setAssignedUserIds((prev) => new Set(prev).add(userId))
    }
  }

  if (loading) return <p className="mx-auto max-w-4xl px-4 py-8 font-mono text-sm text-muted">Cargando…</p>
  if (!program) return <p className="mx-auto max-w-4xl px-4 py-8 text-danger">Programa no encontrado.</p>

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/" className="mb-4 inline-block text-sm text-muted hover:text-chalk">← Todos los programas</Link>

      <input
        value={program.name}
        onChange={(e) => updateProgramField('name', e.target.value)}
        onBlur={(e) => saveProgramField('name', e.target.value)}
        className="mb-2 w-full bg-transparent font-display text-3xl font-bold tracking-wide text-chalk outline-none focus:border-b focus:border-cobalt"
      />
      <textarea
        value={program.description || ''}
        placeholder="Agregá una descripción para este programa…"
        onChange={(e) => updateProgramField('description', e.target.value)}
        onBlur={(e) => saveProgramField('description', e.target.value)}
        rows={2}
        className="mb-6 w-full resize-none rounded border border-line bg-panel px-3 py-2 text-sm text-chalk-dim outline-none focus:border-cobalt"
      />

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      <div className="mb-6 flex gap-1 border-b border-line">
        <button
          onClick={() => setTab('build')}
          className={`px-4 py-2 text-sm font-medium ${tab === 'build' ? 'border-b-2 border-cobalt text-chalk' : 'text-muted'}`}
        >
          Armar entrenamientos
        </button>
        <button
          onClick={() => setTab('assign')}
          className={`px-4 py-2 text-sm font-medium ${tab === 'assign' ? 'border-b-2 border-cobalt text-chalk' : 'text-muted'}`}
        >
          Asignar atletas
        </button>
      </div>

      {tab === 'build' ? (
        <div className="space-y-6">
          {workouts.map((workout) => (
            <div key={workout.id} className="rounded-lg border border-line bg-panel p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <input
                  value={workout.name}
                  onChange={(e) => updateWorkoutName(workout.id, e.target.value)}
                  onBlur={(e) => saveWorkoutName(workout.id, e.target.value)}
                  className="bg-transparent font-display text-xl font-bold text-chalk outline-none"
                />
                <button
                  onClick={() => deleteWorkout(workout.id)}
                  className="text-xs text-muted hover:text-danger"
                >
                  Eliminar día
                </button>
              </div>

              <div className="space-y-2">
                {workout.exercises.map((ex) => (
                  <div key={ex.id} className="grid grid-cols-12 items-center gap-2 rounded border border-line bg-panel-raised p-2">
                    <input
                      value={ex.name}
                      onChange={(e) => updateExerciseLocal(workout.id, ex.id, 'name', e.target.value)}
                      onBlur={(e) => saveExerciseField(ex.id, 'name', e.target.value)}
                      placeholder="Nombre del ejercicio"
                      className="col-span-4 bg-transparent text-sm text-chalk outline-none"
                    />
                    <input
                      type="number"
                      value={ex.sets ?? ''}
                      onChange={(e) => updateExerciseLocal(workout.id, ex.id, 'sets', e.target.value)}
                      onBlur={(e) => saveExerciseField(ex.id, 'sets', Number(e.target.value) || null)}
                      placeholder="Series"
                      className="col-span-1 rounded bg-panel px-1 py-1 font-mono text-sm text-chalk outline-none"
                    />
                    <input
                      value={ex.reps ?? ''}
                      onChange={(e) => updateExerciseLocal(workout.id, ex.id, 'reps', e.target.value)}
                      onBlur={(e) => saveExerciseField(ex.id, 'reps', e.target.value)}
                      placeholder="Reps"
                      className="col-span-2 rounded bg-panel px-1 py-1 font-mono text-sm text-chalk outline-none"
                    />
                    <input
                      value={ex.target_weight ?? ''}
                      onChange={(e) => updateExerciseLocal(workout.id, ex.id, 'target_weight', e.target.value)}
                      onBlur={(e) => saveExerciseField(ex.id, 'target_weight', e.target.value)}
                      placeholder="Peso"
                      className="col-span-2 rounded bg-panel px-1 py-1 font-mono text-sm text-chalk outline-none"
                    />
                    <input
                      type="number"
                      value={ex.rest_seconds ?? ''}
                      onChange={(e) => updateExerciseLocal(workout.id, ex.id, 'rest_seconds', e.target.value)}
                      onBlur={(e) => saveExerciseField(ex.id, 'rest_seconds', Number(e.target.value) || null)}
                      placeholder="Descanso (s)"
                      className="col-span-2 rounded bg-panel px-1 py-1 font-mono text-sm text-chalk outline-none"
                    />
                    <button
                      onClick={() => deleteExercise(workout.id, ex.id)}
                      className="col-span-1 text-right text-xs text-muted hover:text-danger"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => addExercise(workout.id)}
                className="mt-3 text-sm text-cobalt hover:underline"
              >
                + Agregar ejercicio
              </button>
            </div>
          ))}

          <button
            onClick={addWorkout}
            className="w-full rounded-lg border border-dashed border-line py-3 text-sm text-muted hover:border-cobalt hover:text-chalk"
          >
            + Agregar día de entrenamiento
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {allUsers.length === 0 ? (
            <p className="text-sm text-muted">Todavía no se registró ningún usuario que no sea administrador.</p>
          ) : (
            allUsers.map((u) => (
              <label
                key={u.id}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-line bg-panel px-4 py-3"
              >
                <div>
                  <div className="text-chalk">{u.full_name || '(sin nombre)'}</div>
                  <div className="font-mono text-xs text-muted">{u.email}</div>
                </div>
                <input
                  type="checkbox"
                  checked={assignedUserIds.has(u.id)}
                  onChange={() => toggleAssignment(u.id)}
                  className="h-5 w-5 accent-cobalt"
                />
              </label>
            ))
          )}
        </div>
      )}
    </div>
  )
}
