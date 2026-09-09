import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { haversineMeters, estimateCalories, formatDuration } from '../lib/geo'
import { RouteMap } from '../components/RouteMap'
import { generateShareCardBlob } from '../lib/shareCard'

function mapGeoError(err) {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return 'No diste permiso para usar tu ubicación. Habilitalo en la configuración del navegador (o de la app, si la instalaste) para poder registrar el recorrido.'
    case err.POSITION_UNAVAILABLE:
      return 'No se pudo determinar tu ubicación en este momento. Probá salir a un lugar con mejor señal GPS.'
    case err.TIMEOUT:
      return 'Se agotó el tiempo esperando tu ubicación. Probá de nuevo.'
    default:
      return 'Ocurrió un error al acceder a tu ubicación.'
  }
}

export function Recorridos() {
  const { user, profile } = useAuth()

  const [tracking, setTracking] = useState(false)
  const [points, setPoints] = useState([])
  const [liveDistance, setLiveDistance] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [geoError, setGeoError] = useState('')
  const [loadKg, setLoadKg] = useState('')
  const [sharingId, setSharingId] = useState(null)
  const [shareError, setShareError] = useState('')

  const [summary, setSummary] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  const watchIdRef = useRef(null)
  const intervalRef = useRef(null)
  const startTimeRef = useRef(null)
  const distanceRef = useRef(0)
  const wakeLockRef = useRef(null)

  const loadHistory = async () => {
    setLoadingHistory(true)
    try {
      const { data, error } = await supabase
        .from('gps_activities')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(20)
      if (error) throw error
      setHistory(data || [])
    } catch (err) {
      console.error('Load history error:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => { loadHistory() }, [])

  useEffect(() => {
    // Por las dudas, si el componente se desmonta con el GPS todavía activo.
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
      releaseWakeLock()
    }
  }, [])

  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen')
      }
    } catch (err) {
      // No es crítico: si el dispositivo no soporta Wake Lock, seguimos igual
      // (el usuario va a tener que evitar que se le bloquee la pantalla).
      console.warn('No se pudo activar Wake Lock:', err)
    }
  }

  async function releaseWakeLock() {
    try {
      await wakeLockRef.current?.release()
    } catch {
      // ignorar
    }
    wakeLockRef.current = null
  }

  useEffect(() => {
    // El navegador libera el Wake Lock automáticamente cuando la pestaña deja
    // de estar visible. Si seguimos grabando y la pestaña vuelve a estar
    // visible (el usuario volvió a la app), lo volvemos a pedir.
    function handleVisibilityChange() {
      if (tracking && document.visibilityState === 'visible' && !wakeLockRef.current) {
        requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [tracking])

  function startTracking() {
    setGeoError('')
    if (!navigator.geolocation) {
      setGeoError('Tu navegador no soporta geolocalización.')
      return
    }

    setPoints([])
    setLiveDistance(0)
    setElapsedSeconds(0)
    distanceRef.current = 0
    startTimeRef.current = Date.now()

    intervalRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setPoints((prev) => {
          const newPoint = { lat: latitude, lng: longitude, t: pos.timestamp }
          if (prev.length > 0) {
            const last = prev[prev.length - 1]
            const d = haversineMeters(last.lat, last.lng, newPoint.lat, newPoint.lng)
            // Ignoramos saltos chiquitos (ruido típico del GPS al estar parado)
            // para no sumar distancia fantasma.
            if (d > 2) distanceRef.current += d
          }
          return [...prev, newPoint]
        })
        setLiveDistance(distanceRef.current)
      },
      (err) => setGeoError(mapGeoError(err)),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 }
    )

    setTracking(true)
    requestWakeLock()
  }

  function stopTracking() {
    if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
    setTracking(false)
    releaseWakeLock()

    const durationSeconds = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000))
    const distanceMeters = distanceRef.current
    const avgSpeedKmh = (distanceMeters / 1000) / (durationSeconds / 3600)
    const loadKgNum = Number(loadKg) || 0
    const calories = estimateCalories({ avgSpeedKmh, weightKg: profile?.weight_kg, durationSeconds, loadKg: loadKgNum })

    setSummary({
      points,
      distanceMeters,
      durationSeconds,
      avgSpeedKmh,
      calories,
      loadKg: loadKgNum,
      startedAt: new Date(startTimeRef.current),
      endedAt: new Date(),
    })
  }

  function discardSummary() {
    setSummary(null)
    setPoints([])
    setLiveDistance(0)
    setElapsedSeconds(0)
    distanceRef.current = 0
  }

  async function saveSummary() {
    setSaving(true)
    setSaveError('')
    try {
      const { error } = await supabase.from('gps_activities').insert({
        user_id: user.id,
        started_at: summary.startedAt.toISOString(),
        ended_at: summary.endedAt.toISOString(),
        duration_seconds: summary.durationSeconds,
        distance_meters: summary.distanceMeters,
        avg_speed_kmh: summary.avgSpeedKmh,
        calories: summary.calories,
        load_kg: summary.loadKg || 0,
        path: summary.points,
      })
      if (error) throw error
      discardSummary()
      await loadHistory()
    } catch (err) {
      console.error('Save route error:', err)
      setSaveError(err.message || 'No se pudo guardar el recorrido.')
    } finally {
      setSaving(false)
    }
  }

  async function handleShare(activityData, id) {
    setShareError('')
    setSharingId(id)
    try {
      const blob = await generateShareCardBlob(activityData)
      const file = new File([blob], 'recorrido.png', { type: 'image/png' })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Mi recorrido',
          text: 'Mi recorrido con Toro y Pampa 🇦🇷',
        })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'recorrido.png'
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share error:', err)
        setShareError('No se pudo generar la imagen para compartir.')
      }
    } finally {
      setSharingId(null)
    }
  }

  const liveAvgSpeedKmh = elapsedSeconds > 0 ? (liveDistance / 1000) / (elapsedSeconds / 3600) : 0

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 font-display text-3xl font-bold tracking-wide text-chalk">Recorridos</h1>
      <p className="mb-6 text-sm text-muted">Registrá tus caminatas o carreras con GPS y guardá el trayecto.</p>

      {!profile?.weight_kg && (
        <div className="mb-6 rounded-lg border border-brass/40 bg-brass/10 px-4 py-3 text-sm text-brass">
          No tenés un peso cargado en tu perfil, así que no vamos a poder calcular las calorías quemadas.{' '}
          <Link to="/perfil" className="underline">Cargalo acá</Link>.
        </div>
      )}

      {geoError && <p className="mb-4 text-sm text-danger">{geoError}</p>}
      {saveError && <p className="mb-4 text-sm text-danger">{saveError}</p>}

      {/* Estado: sin grabar y sin resumen pendiente */}
      {!tracking && !summary && (
        <div className="mb-8">
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
              Carga adicional (kg) — opcional, para rucking
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={loadKg}
              onChange={(e) => setLoadKg(e.target.value)}
              placeholder="Ej. 15"
              className="w-full rounded border border-line bg-panel-raised px-3 py-2 text-chalk outline-none focus:border-cobalt"
            />
          </div>
          <button
            onClick={startTracking}
            className="w-full rounded-lg bg-cobalt py-4 text-lg font-semibold text-white hover:opacity-90"
          >
            Iniciar recorrido
          </button>
        </div>
      )}

      {/* Estado: grabando en vivo */}
      {tracking && (
        <div className="mb-8">
          <div className="mb-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-line bg-panel-raised p-3">
              <div className="font-mono text-xl font-bold text-chalk">{(liveDistance / 1000).toFixed(2)} km</div>
              <div className="text-xs text-muted">Distancia</div>
            </div>
            <div className="rounded-lg border border-line bg-panel-raised p-3">
              <div className="font-mono text-xl font-bold text-chalk">{formatDuration(elapsedSeconds)}</div>
              <div className="text-xs text-muted">Tiempo</div>
            </div>
            <div className="rounded-lg border border-line bg-panel-raised p-3">
              <div className="font-mono text-xl font-bold text-chalk">{liveAvgSpeedKmh.toFixed(1)}</div>
              <div className="text-xs text-muted">km/h prom.</div>
            </div>
          </div>

          <RouteMap points={points} live height={280} />

          <p className="mt-2 text-center text-xs text-muted">
            Mantené esta pantalla abierta y desbloqueada mientras grabás — en iPhone, el registro se corta si bloqueás la pantalla o cambiás de app.
          </p>

          <button
            onClick={stopTracking}
            className="mt-3 w-full rounded-lg border border-danger py-3 font-semibold text-danger hover:bg-danger/10"
          >
            Finalizar recorrido
          </button>
        </div>
      )}

      {/* Estado: recorrido terminado, esperando confirmación para guardar */}
      {summary && (
        <div className="mb-8 rounded-lg border border-line bg-panel-raised p-5">
          <h2 className="mb-3 text-lg font-semibold text-chalk">Resumen del recorrido</h2>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <div className="font-mono text-lg font-bold text-chalk">{(summary.distanceMeters / 1000).toFixed(2)} km</div>
              <div className="text-xs text-muted">Distancia</div>
            </div>
            <div>
              <div className="font-mono text-lg font-bold text-chalk">{formatDuration(summary.durationSeconds)}</div>
              <div className="text-xs text-muted">Tiempo</div>
            </div>
            <div>
              <div className="font-mono text-lg font-bold text-chalk">{summary.avgSpeedKmh.toFixed(1)} km/h</div>
              <div className="text-xs text-muted">Vel. promedio</div>
            </div>
            <div>
              <div className="font-mono text-lg font-bold text-chalk">{summary.calories != null ? `${summary.calories} kcal` : '—'}</div>
              <div className="text-xs text-muted">Calorías</div>
            </div>
            {summary.loadKg > 0 && (
              <div>
                <div className="font-mono text-lg font-bold text-chalk">{summary.loadKg} kg</div>
                <div className="text-xs text-muted">Carga</div>
              </div>
            )}
          </div>

          <RouteMap points={summary.points} height={240} />

          {shareError && <p className="mt-3 text-sm text-danger">{shareError}</p>}

          <div className="mt-4 flex gap-2">
            <button
              onClick={saveSummary}
              disabled={saving}
              className="flex-1 rounded bg-cobalt py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar recorrido'}
            </button>
            <button
              onClick={() => handleShare({
                points: summary.points,
                distanceMeters: summary.distanceMeters,
                durationLabel: formatDuration(summary.durationSeconds),
                avgSpeedKmh: summary.avgSpeedKmh,
                calories: summary.calories,
                loadKg: summary.loadKg,
                dateLabel: summary.startedAt.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }),
              }, 'summary')}
              disabled={sharingId === 'summary'}
              className="rounded border border-line px-4 py-2.5 text-sm text-chalk-dim hover:border-cobalt hover:text-chalk disabled:opacity-50"
            >
              {sharingId === 'summary' ? 'Generando...' : 'Compartir'}
            </button>
            <button
              onClick={discardSummary}
              disabled={saving}
              className="rounded border border-line px-4 py-2.5 text-sm text-chalk-dim hover:border-danger hover:text-danger disabled:opacity-50"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {/* Historial */}
      <h2 className="mb-3 text-lg font-semibold text-chalk">Historial</h2>
      {loadingHistory ? (
        <p className="font-mono text-sm text-muted">Cargando…</p>
      ) : history.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-6 text-center text-muted">
          Todavía no guardaste ningún recorrido.
        </div>
      ) : (
        <ul className="space-y-2">
          {history.map((h) => {
            const isOpen = expandedId === h.id
            return (
              <li key={h.id} className="rounded-lg border border-line bg-panel-raised">
                <div className="flex items-center justify-between px-4 py-3">
                  <button
                    onClick={() => setExpandedId(isOpen ? null : h.id)}
                    className="flex-1 text-left"
                  >
                    <div className="text-sm text-chalk">
                      {new Date(h.started_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {' · '}
                      {new Date(h.started_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="font-mono text-xs text-muted">
                      {(h.distance_meters / 1000).toFixed(2)} km · {formatDuration(h.duration_seconds)} · {Number(h.avg_speed_kmh).toFixed(1)} km/h
                      {h.calories != null ? ` · ${h.calories} kcal` : ''}
                      {h.load_kg > 0 ? ` · ${h.load_kg} kg carga` : ''}
                    </div>
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleShare({
                        points: h.path || [],
                        distanceMeters: h.distance_meters,
                        durationLabel: formatDuration(h.duration_seconds),
                        avgSpeedKmh: Number(h.avg_speed_kmh),
                        calories: h.calories,
                        loadKg: h.load_kg || 0,
                        dateLabel: new Date(h.started_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }),
                      }, h.id)}
                      disabled={sharingId === h.id}
                      className="text-xs text-cobalt hover:underline disabled:opacity-50"
                    >
                      {sharingId === h.id ? '...' : 'Compartir'}
                    </button>
                    <button
                      onClick={() => setExpandedId(isOpen ? null : h.id)}
                      className="text-muted"
                    >
                      {isOpen ? '−' : '+'}
                    </button>
                  </div>
                </div>
                {isOpen && (
                  <div className="px-4 pb-4">
                    <RouteMap points={h.path || []} height={220} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
