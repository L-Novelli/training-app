import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { AdminPrograms } from './AdminPrograms'
import { UserDashboard } from './UserDashboard'
import { TodayView } from './TodayView'

export function Home() {
  const { user, isAdmin } = useAuth()
  const [assignedProgramIds, setAssignedProgramIds] = useState(null)
  const [loading, setLoading] = useState(!isAdmin)

  useEffect(() => {
    if (isAdmin) return
    let active = true
    async function load() {
      const { data, error } = await supabase
        .from('assignments')
        .select('program_id')
        .eq('user_id', user.id)
      if (!active) return
      if (!error) setAssignedProgramIds((data || []).map((a) => a.program_id))
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [isAdmin, user])

  if (isAdmin) return <AdminPrograms />
  if (loading) return <p className="mx-auto max-w-4xl px-4 py-8 font-mono text-sm text-muted">Cargando…</p>

  // Sin rutinas asignadas, o más de una: mostramos la lista (como antes).
  // Con exactamente una rutina asignada: vamos directo al día actual.
  if (!assignedProgramIds || assignedProgramIds.length !== 1) return <UserDashboard />
  return <TodayView programId={assignedProgramIds[0]} />
}
