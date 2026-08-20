import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

function ExerciseLogger({ exercise, userId }) {
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
    <div className="rounded border border-line bg-panel-raised p-3">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left">
        <div>
          <div className="font-medium text-chalk">{exercise.name}</div>
          <div className="font-mono text-xs text-muted">
            {exercise.sets} sets × {exercise.reps} {exercise.target_weight && `@ ${exercise.target_weight}`}
            {exercise.rest_seconds ? ` · rest ${exercise.rest_seconds}s` : ''}
          </div>
        </div>
        <span className="text-muted">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="mt-3 border-t border-line pt-3">
          {exercise.notes && <p className="mb-3 text-sm text-chalk-dim">{exercise.notes}</p>}

          <form onSubmit={handleLog} className="mb-3 grid grid-cols-4 gap-2">
            <input
              type="number"
              value={setsCompleted}
              onChange={(e) => setSetsCompleted(e.target.value)}
              placeholder="Sets"
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
              placeholder="Weight"
              className="rounded bg-panel px-2 py-1.5 font-mono text-sm text-chalk outline-none focus:ring-1 focus:ring-cobalt"
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-cobalt px-2 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              Log
            </button>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="col-span-4 rounded bg-panel px-2 py-1.5 text-sm text-chalk outline-none focus:ring-1 focus:ring-cobalt"
            />
          </form>

          {logs.length > 0 && (
            <div>
              <div className="mb-1 text-xs uppercase tracking-wide text-muted">Recent logs</div>
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
  )
}

export function ProgramView() {
  const { id: programId } = useParams()
  const { user } = useAuth()
  const [program, setProgram] = useState(null)
  const [workouts, setWorkouts] = useState([])
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
          .order('day_order', { ascending: true }),
      ])
      if (progErr) setError(progErr.message)
      else setProgram(prog)
      if (wErr) setError(wErr.message)
      else {
        setWorkouts((w || []).map((wk) => ({
          ...wk,
          exercises: (wk.exercises || []).sort((a, b) => a.order_index - b.order_index),
        })))
      }
      setLoading(false)
    }
    load()
  }, [programId])

  if (loading) return <p className="mx-auto max-w-4xl px-4 py-8 font-mono text-sm text-muted">Loading…</p>
  if (error) return <p className="mx-auto max-w-4xl px-4 py-8 text-danger">{error}</p>
  if (!program) return null

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/" className="mb-4 inline-block text-sm text-muted hover:text-chalk">← My programs</Link>
      <h1 className="font-display text-3xl font-bold tracking-wide">{program.name}</h1>
      {program.description && <p className="mt-1 text-chalk-dim">{program.description}</p>}

      <div className="mt-6 space-y-6">
        {workouts.map((workout) => (
          <div key={workout.id}>
            <h2 className="mb-2 font-display text-xl font-bold text-chalk">{workout.name}</h2>
            {workout.notes && <p className="mb-2 text-sm text-chalk-dim">{workout.notes}</p>}
            <div className="space-y-2">
              {workout.exercises.map((ex) => (
                <ExerciseLogger key={ex.id} exercise={ex} userId={user.id} />
              ))}
              {workout.exercises.length === 0 && (
                <p className="text-sm text-muted">No exercises added to this day yet.</p>
              )}
            </div>
          </div>
        ))}
        {workouts.length === 0 && (
          <p className="text-muted">This program doesn't have any workout days yet.</p>
        )}
      </div>
    </div>
  )
}
