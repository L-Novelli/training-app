import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { DIFFICULTY_OPTIONS } from '../lib/difficulty'

function ExerciseLogger({ exercise, userId, done, onToggle, busy, difficulty, onSetDifficulty }) {
  const [open, setOpen] = useState(false)
  const [logs, setLogs] = useState([])
  const [setsCompleted, setSetsCompleted] = useState(exercise.sets || '')
  const [repsCompleted, setRepsCompleted] = useState(exercise.reps || '')
  const [weightUsed, setWeightUsed] = useState(exercise.target_weight || '')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const loadLogs = async () => {
    const { data } = await supabase
      .from('logs')
      .select('*')
      .eq('exercise_id', exercise.id)
      .eq('user_id', userId)
      .order('log_date', { ascending: false })
      .limit(5)
    setLogs(data || [])
  }

  useEffect(() => {
    if (open) loadLogs()
  }, [open])

  const handleLog = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('logs').insert({
      user_id: userId,
      exercise_id: exercise.id,
      workout_id: exercise.workout_id,
      sets_completed: Number(setsCompleted) || null,
      reps_completed: repsCompleted,
      weight_used: weightUsed,
      notes,
    })
    setSaving(false)
    if (!error) {
      setNotes('')
      loadLogs()
    }
  }

  return (
    <div className={`flex items-start gap-3 rounded border px-3 py-3 transition-colors ${
      done ? 'border-cobalt/40 bg-cobalt/5' : 'border-line bg-panel-raised'
    }`}>
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(exercise.id, done) }}
        disabled={busy}
        aria-label={done ? 'Marcar como no hecho' : 'Marcar como hecho'}
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 text-sm font-bold transition-colors disabled:opacity-50 ${
          done ? 'border-cobalt bg-cobalt text-white' : 'border-line text-transparent hover:border-cobalt'
        }`}
      >
        ✓
      </button>

      <div className="flex-1">
        <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left">
          <div>
            <div className={`font-medium text-chalk ${done ? 'line-through opacity-60' : ''}`}>{exercise.name}</div>
            <div className="font-mono text-xs text-muted">
              {exercise.sets} series × {exercise.reps} {exercise.target_weight && `@ ${exercise.target_weight}`}
              {exercise.rest_seconds ? ` · descanso ${exercise.rest_seconds}s` : ''}
            </div>
          </div>
          <span className="text-muted">{open ? '−' : '+'}</span>
        </button>

        <select
          value={difficulty || ''}
          onChange={(e) => { e.stopPropagation(); onSetDifficulty(exercise.id, e.target.value || null) }}
          onClick={(e) => e.stopPropagation()}
          className="mt-2 rounded border border-line bg-panel px-2 py-1 text-xs text-chalk-dim outline-none focus:border-cobalt"
        >
          <option value="">Dificultad de ejecución…</option>
          {DIFFICULTY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {open && (
        <div className="mt-3 border-t border-line pt-3">
          {exercise.notes && <p className="mb-3 text-sm text-chalk-dim">{exercise.notes}</p>}

          <form onSubmit={handleLog} className="mb-3 grid grid-cols-4 gap-2">
            <input
              type="number"
              value={setsCompleted}
              onChange={(e) => setSetsCompleted(e.target.value)}
              placeholder="Series"
              className="rounded bg-panel px-2 py-1.5 font-mono text-sm text-chalk outline-none focus:ring-1 focus:ring-cobalt"
            />
            <input
              value={repsCompleted}
              onChange={(e) => setRepsCompleted(e.target.value)}
              placeholder="Reps"
              className="rounded bg-panel px-2 py-1.5 font-mono text-sm text-chalk outline-none focus:ring-1 focus:ring-cobalt"
            />
            <input
              value={weightUsed}
              onChange={(e) => setWeightUsed(e.target.value)}
              placeholder="Peso"
              className="rounded bg-panel px-2 py-1.5 font-mono text-sm text-chalk outline-none focus:ring-1 focus:ring-cobalt"
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-cobalt px-2 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              Registrar
            </button>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas (opcional)"
              className="col-span-4 rounded bg-panel px-2 py-1.5 text-sm text-chalk outline-none focus:ring-1 focus:ring-cobalt"
            />
          </form>

          {logs.length > 0 && (
            <div>
              <div className="mb-1 text-xs uppercase tracking-wide text-muted">Registros recientes</div>
              <ul className="space-y-1 font-mono text-xs text-chalk-dim">
                {logs.map((l) => (
                  <li key={l.id}>
                    {l.log_date} — {l.sets_completed}×{l.reps_completed} @ {l.weight_used || '—'}
                    {l.notes && <span className="text-muted"> · {l.notes}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  )
}

export function ProgramView() {
  const { id: programId } = useParams()
  const { user } = useAuth()
  const [program, setProgram] = useState(null)
  const [workouts, setWorkouts] = useState([])
  const [completedIds, setCompletedIds] = useState(new Set())
  const [difficultyMap, setDifficultyMap] = useState(new Map())
  const [busyExerciseId, setBusyExerciseId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const [{ data: prog, error: progErr }, { data: w, error: wErr }] = await Promise.all([
        supabase.from('programs').select('*').eq('id', programId).single(),
        supabase
          .from('workouts')
          .select('*, exercises(*)')
          .eq('program_id', programId)
          .order('week_number', { ascending: true })
          .order('day_order', { ascending: true }),
      ])
      if (progErr) setError(progErr.message)
      else setProgram(prog)

      let sortedWorkouts = []
      if (wErr) setError(wErr.message)
      else {
        sortedWorkouts = (w || []).map((wk) => ({
          ...wk,
          exercises: (wk.exercises || []).sort((a, b) => a.order_index - b.order_index),
        }))
        setWorkouts(sortedWorkouts)
      }

      const allExerciseIds = sortedWorkouts.flatMap((wk) => wk.exercises.map((e) => e.id))
      if (allExerciseIds.length > 0) {
        const { data: compData } = await supabase
          .from('exercise_completions')
          .select('exercise_id, difficulty')
          .eq('user_id', user.id)
          .in('exercise_id', allExerciseIds)
        setCompletedIds(new Set((compData || []).map((c) => c.exercise_id)))
        setDifficultyMap(new Map((compData || []).map((c) => [c.exercise_id, c.difficulty])))
      }

      setLoading(false)
    }
    load()
  }, [programId])

  async function toggleExercise(exerciseId, done) {
    setBusyExerciseId(exerciseId)
    setCompletedIds((prev) => {
      const next = new Set(prev)
      if (done) next.delete(exerciseId)
      else next.add(exerciseId)
      return next
    })
    try {
      if (done) {
        await supabase.from('exercise_completions').delete().eq('user_id', user.id).eq('exercise_id', exerciseId)
        setDifficultyMap((prev) => {
          const next = new Map(prev)
          next.delete(exerciseId)
          return next
        })
      } else {
        await supabase.from('exercise_completions').upsert({ user_id: user.id, exercise_id: exerciseId }, { onConflict: 'user_id,exercise_id' })
      }
    } catch (err) {
      console.error('Toggle exercise error:', err)
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

  async function setDifficulty(exerciseId, difficulty) {
    const wasAlreadyDone = completedIds.has(exerciseId)
    setDifficultyMap((prev) => new Map(prev).set(exerciseId, difficulty))
    if (!wasAlreadyDone) {
      setCompletedIds((prev) => new Set(prev).add(exerciseId))
    }
    try {
      await supabase
        .from('exercise_completions')
        .upsert({ user_id: user.id, exercise_id: exerciseId, difficulty }, { onConflict: 'user_id,exercise_id' })
    } catch (err) {
      console.error('Set difficulty error:', err)
    }
  }

  if (loading) return <p className="mx-auto max-w-4xl px-4 py-8 font-mono text-sm text-muted">Cargando…</p>
  if (error) return <p className="mx-auto max-w-4xl px-4 py-8 text-danger">{error}</p>
  if (!program) return null

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/" className="mb-4 inline-block text-sm text-muted hover:text-chalk">← Volver</Link>
      <h1 className="font-display text-3xl font-bold tracking-wide">{program.name}</h1>
      {program.description && <p className="mt-1 text-chalk-dim">{program.description}</p>}

      <div className="mt-6 space-y-8">
        {(() => {
          const weekNumbers = [...new Set(workouts.map((w) => w.week_number))]
          return weekNumbers.map((weekNumber) => {
            const days = workouts.filter((w) => w.week_number === weekNumber)
            return (
              <div key={weekNumber} className="space-y-4">
                {weekNumbers.length > 1 && (
                  <h2 className="border-b border-line pb-2 font-display text-2xl font-bold tracking-wide text-chalk">
                    Semana {weekNumber}
                  </h2>
                )}
                {days.map((workout) => (
                  <div key={workout.id}>
                    <h3 className="mb-2 font-display text-xl font-bold text-chalk">{workout.name}</h3>
                    {workout.notes && <p className="mb-2 text-sm text-chalk-dim">{workout.notes}</p>}
                    <div className="space-y-2">
                      {workout.exercises.map((ex) => (
                        <ExerciseLogger
                          key={ex.id}
                          exercise={ex}
                          userId={user.id}
                          done={completedIds.has(ex.id)}
                          busy={busyExerciseId === ex.id}
                          onToggle={toggleExercise}
                          difficulty={difficultyMap.get(ex.id)}
                          onSetDifficulty={setDifficulty}
                        />
                      ))}
                      {workout.exercises.length === 0 && (
                        <p className="text-sm text-muted">Todavía no se agregaron ejercicios a este día.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          })
        })()}
        {workouts.length === 0 && (
          <p className="text-muted">Este programa todavía no tiene días de entrenamiento.</p>
        )}
      </div>
    </div>
  )
}
