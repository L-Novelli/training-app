import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { findCurrentDayIndex } from '../lib/progress'

export function TodayView({ programId }) {
  const { user } = useAuth()
  const [program, setProgram] = useState(null)
  const [workouts, setWorkouts] = useState([])
  const [completedIds, setCompletedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyExerciseId, setBusyExerciseId] = useState(null)
  const [resetting, setResetting] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [{ data: programData, error: progErr }, { data: workoutData, error: wErr }] = await Promise.all([
        supabase.from('programs').select('*').eq('id', programId).single(),
        supabase
          .from('workouts')
          .select('*, exercises(*)')
          .eq('program_id', programId)
          .order('day_order', { ascending: true }),
      ])
      if (progErr) throw progErr
      if (wErr) throw wErr

      const sortedWorkouts = (workoutData || []).map((w) => ({
        ...w,
        exercises: (w.exercises || []).slice().sort((a, b) => a.order_index - b.order_index),
      }))

      const allExerciseIds = sortedWorkouts.flatMap((w) => w.exercises.map((e) => e.id))

      let completions = []
      if (allExerciseIds.length > 0) {
        const { data: compData, error: compErr } = await supabase
          .from('exercise_completions')
          .select('exercise_id')
          .eq('user_id', user.id)
          .in('exercise_id', allExerciseIds)
        if (compErr) throw compErr
        completions = compData || []
      }

      setProgram(programData)
      setWorkouts(sortedWorkouts)
      setCompletedIds(new Set(completions.map((c) => c.exercise_id)))
    } catch (err) {
      console.error('Load today view error:', err)
      setError(err.message || 'No se pudo cargar tu rutina de hoy.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [programId])

  async function toggleExercise(exerciseId, done) {
    setBusyExerciseId(exerciseId)
    setError('')
    setCompletedIds((prev) => {
      const next = new Set(prev)
      if (done) next.delete(exerciseId)
      else next.add(exerciseId)
      return next
    })
    try {
      if (done) {
        const { error } = await supabase
          .from('exercise_completions')
          .delete()
          .eq('user_id', user.id)
          .eq('exercise_id', exerciseId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('exercise_completions')
          .upsert({ user_id: user.id, exercise_id: exerciseId }, { onConflict: 'user_id,exercise_id' })
        if (error) throw error
      }
    } catch (err) {
      console.error('Toggle exercise error:', err)
      setError(err.message || 'No se pudo actualizar el ejercicio.')
      setCompletedIds((prev) => {
        const next = new Set(prev)
        if (done) next.add(exerciseId)
        else next.delete(exerciseId)
        return next
      })
    } finally {
      setBusyExerciseId(null)
    }
  }

  async function handleResetProgress() {
    if (!confirm('¿Reiniciar tu progreso en esta rutina? Se van a desmarcar todos los ejercicios completados y vas a volver a empezar desde el día 1.')) return
    setResetting(true)
    setError('')
    try {
      const allIds = workouts.flatMap((w) => w.exercises.map((e) => e.id))
      if (allIds.length > 0) {
        const { error } = await supabase
          .from('exercise_completions')
          .delete()
          .eq('user_id', user.id)
          .in('exercise_id', allIds)
        if (error) throw error
      }
      setCompletedIds(new Set())
    } catch (err) {
      console.error('Reset progress error:', err)
      setError(err.message || 'No se pudo reiniciar el progreso.')
    } finally {
      setResetting(false)
    }
  }

  if (loading) return <p className="mx-auto max-w-3xl px-4 py-8 font-mono text-sm text-muted">Cargando…</p>
  if (error && !program) return <p className="mx-auto max-w-3xl px-4 py-8 text-danger">{error}</p>
  if (!program) return null

  const currentIndex = findCurrentDayIndex(workouts, completedIds)
  const allComplete = workouts.length > 0 && currentIndex === -1
  const currentWorkout = currentIndex === -1 ? null : workouts[currentIndex]

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="mb-1 text-sm text-muted">{program.name}</p>

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      {workouts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-8 text-center text-muted">
          Esta rutina todavía no tiene días cargados. Cuando tu entrenador agregue ejercicios, los vas a ver acá.
        </div>
      ) : allComplete ? (
        <div className="rounded-lg border border-line bg-panel-raised p-8 text-center">
          <h1 className="mb-2 font-display text-2xl font-bold tracking-wide text-chalk">¡Completaste toda la rutina! 🎉</h1>
          <p className="mb-4 text-sm text-muted">
            Marcaste como hechos los ejercicios de los {workouts.length} días.
          </p>
          <button
            onClick={handleResetProgress}
            disabled={resetting}
            className="rounded bg-cobalt px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {resetting ? 'Reiniciando...' : 'Volver a empezar desde el día 1'}
          </button>
        </div>
      ) : (
        <>
          <h1 className="mb-4 font-display text-3xl font-bold tracking-wide text-chalk">
            Día {currentIndex + 1} de {workouts.length} — {currentWorkout.name}
          </h1>
          {currentWorkout.notes && <p className="mb-4 text-sm text-chalk-dim">{currentWorkout.notes}</p>}

          {currentWorkout.exercises.length === 0 ? (
            <p className="text-sm text-muted">Este día no tiene ejercicios cargados todavía.</p>
          ) : (
            <ul className="space-y-3">
              {currentWorkout.exercises.map((ex) => {
                const done = completedIds.has(ex.id)
                return (
                  <li
                    key={ex.id}
                    className={`flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${
                      done ? 'border-cobalt/40 bg-cobalt/5' : 'border-line bg-panel-raised'
                    }`}
                  >
                    <button
                      onClick={() => toggleExercise(ex.id, done)}
                      disabled={busyExerciseId === ex.id}
                      aria-label={done ? 'Marcar como no hecho' : 'Marcar como hecho'}
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 text-sm font-bold transition-colors disabled:opacity-50 ${
                        done ? 'border-cobalt bg-cobalt text-white' : 'border-line text-transparent hover:border-cobalt'
                      }`}
                    >
                      ✓
                    </button>
                    <div className="flex-1">
                      <div className={`text-chalk ${done ? 'line-through opacity-60' : ''}`}>{ex.name}</div>
                      <div className="font-mono text-xs text-muted">
                        {ex.sets} series × {ex.reps} {ex.target_weight && `@ ${ex.target_weight}`}
                        {ex.rest_seconds ? ` · descanso ${ex.rest_seconds}s` : ''}
                      </div>
                      {ex.notes && <div className="mt-1 text-sm text-chalk-dim">{ex.notes}</div>}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      <Link to={`/program/${programId}`} className="mt-6 inline-block text-sm text-cobalt hover:underline">
        Ver rutina completa →
      </Link>
    </div>
  )
}
