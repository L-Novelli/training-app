// Distancia entre dos puntos GPS (fórmula de Haversine), en metros.
export function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// MET (equivalente metabólico) aproximado según la velocidad promedio,
// basado en valores estándar de caminata/trote/carrera. Sirve tanto para
// caminar como para correr y rucking, ya que las tres son locomoción a pie
// (rucking se distingue por la carga extra, no por una curva de MET propia).
function metForFootSpeed(kmh) {
  if (kmh < 4) return 2.8
  if (kmh < 6) return 3.5
  if (kmh < 7) return 4.5
  if (kmh < 8) return 6.0
  if (kmh < 9) return 8.3
  if (kmh < 10.5) return 9.0
  if (kmh < 12) return 9.8
  if (kmh < 14) return 11.0
  if (kmh < 16) return 12.8
  return 14.5
}

// MET aproximado para bicicleta: a la misma velocidad, andar en bici gasta
// bastante menos energía que correr, así que necesita su propia curva.
function metForCyclingSpeed(kmh) {
  if (kmh < 16) return 4.0
  if (kmh < 19) return 6.8
  if (kmh < 22) return 8.0
  if (kmh < 25) return 10.0
  if (kmh < 30) return 12.0
  return 15.8
}

function metForActivity(activityType, kmh) {
  if (activityType === 'bicicleta') return metForCyclingSpeed(kmh)
  return metForFootSpeed(kmh) // caminar, correr, rucking
}

// Calorías quemadas ≈ MET × (peso corporal + carga) × duración (horas).
// Sumar la carga al peso es el enfoque estándar y práctico para rucking:
// mover más masa (mochila con peso) cuesta energéticamente casi lo mismo
// que si esa masa fuera parte del cuerpo. No reemplaza un pulsómetro, pero
// es la misma aproximación que usan la mayoría de las apps de fitness.
// Devuelve null si no hay peso corporal cargado (no se puede estimar sin ese dato).
export function estimateCalories({ avgSpeedKmh, weightKg, durationSeconds, loadKg = 0, activityType = 'caminar' }) {
  if (!weightKg || weightKg <= 0) return null
  const met = metForActivity(activityType, avgSpeedKmh)
  const hours = durationSeconds / 3600
  const effectiveWeight = weightKg + (Number(loadKg) || 0)
  return Math.round(met * effectiveWeight * hours)
}

export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}
