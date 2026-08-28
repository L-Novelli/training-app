import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function DayComment({ workoutId, userId }) {
  const [comment, setComment] = useState('')
  const [savedComment, setSavedComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('workout_comments')
        .select('comment')
        .eq('workout_id', workoutId)
        .eq('user_id', userId)
        .maybeSingle()
      if (!active) return
      if (!error && data) {
        setComment(data.comment || '')
        setSavedComment(data.comment || '')
      }
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [workoutId, userId])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const { error } = await supabase
        .from('workout_comments')
        .upsert(
          { workout_id: workoutId, user_id: userId, comment, updated_at: new Date().toISOString() },
          { onConflict: 'workout_id,user_id' }
        )
      if (error) throw error
      setSavedComment(comment)
    } catch (err) {
      console.error('Save day comment error:', err)
      setError(err.message || 'No se pudo guardar el comentario.')
    } finally {
      setSaving(false)
    }
  }

  const dirty = comment !== savedComment

  if (loading) return null

  return (
    <div className="mt-4 rounded-lg border border-line bg-panel-raised p-3">
      <label className="mb-1.5 block text-sm font-medium text-chalk-dim">
        ¿Cómo te sentiste haciendo los básicos?
      </label>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        placeholder="Contale a tu entrenador cómo te sentiste…"
        className="w-full resize-none rounded border border-line bg-panel px-3 py-2 text-sm text-chalk outline-none focus:border-cobalt"
      />
      <div className="mt-2 flex items-center justify-end gap-3">
        {error && <span className="text-xs text-danger">{error}</span>}
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="rounded bg-cobalt px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Guardando…' : dirty ? 'Guardar comentario' : 'Guardado ✓'}
        </button>
      </div>
    </div>
  )
}
