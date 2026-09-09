import logoUrl from '../assets/comandos-logo.png'

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// Genera una imagen PNG "para compartir" (estilo Strava) con la ruta
// dibujada de forma estilizada y las estadísticas principales del
// recorrido. No usa tiles de mapa reales (evita problemas de CORS al
// exportar el canvas), solo el trazado sobre fondo oscuro.
export async function generateShareCardBlob(activity) {
  const WIDTH = 1080
  const HEIGHT = 1920

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')

  const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT)
  bg.addColorStop(0, '#000000')
  bg.addColorStop(1, '#0a0a0a')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  try {
    await Promise.all([
      document.fonts.load("800 72px 'Big Shoulders Display'"),
      document.fonts.load("600 32px 'Inter'"),
      document.fonts.load("500 32px 'Inter'"),
    ])
  } catch {
    // Si las fuentes no cargan a tiempo, seguimos con las del sistema.
  }

  // Logo (Sol de Mayo + "Comandos.ar"), con el texto "TORO Y PAMPA" como
  // respaldo si por algún motivo la imagen no llega a cargar.
  let logoBottom = 130
  try {
    const logo = await loadImage(logoUrl)
    const logoWidth = 480
    const logoHeight = logoWidth * (logo.height / logo.width)
    const logoX = (WIDTH - logoWidth) / 2
    const logoY = 60
    ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight)
    logoBottom = logoY + logoHeight
  } catch {
    ctx.fillStyle = '#ffbf00'
    ctx.textAlign = 'center'
    ctx.font = "64px 'Pirata One', serif"
    ctx.fillText('TORO Y PAMPA', WIDTH / 2, 130)
    logoBottom = 130
  }

  const mapTop = logoBottom + 40
  const mapHeight = 580
  const mapLeft = 100
  const mapWidth = WIDTH - 200

  // Trazado de la ruta
  const points = activity.points || []
  if (points.length > 1) {
    const lats = points.map((p) => p.lat)
    const lngs = points.map((p) => p.lng)
    const minLat = Math.min(...lats), maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
    const avgLat = (minLat + maxLat) / 2
    // Corrige la distorsión: a esta latitud, un grado de longitud representa
    // menos distancia real que un grado de latitud.
    const latCorrection = Math.cos((avgLat * Math.PI) / 180)

    const spanLat = Math.max(maxLat - minLat, 0.0001)
    const spanLng = Math.max((maxLng - minLng) * latCorrection, 0.0001)
    const scale = Math.min(mapWidth / spanLng, mapHeight / spanLat) * 0.85

    const cLng = (minLng + maxLng) / 2
    const cLat = (minLat + maxLat) / 2

    const project = (p) => [
      mapLeft + mapWidth / 2 + (p.lng - cLng) * latCorrection * scale,
      mapTop + mapHeight / 2 - (p.lat - cLat) * scale,
    ]

    ctx.strokeStyle = '#00a7e1'
    ctx.lineWidth = 10
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.beginPath()
    points.forEach((p, i) => {
      const [x, y] = project(p)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    const [sx, sy] = project(points[0])
    ctx.fillStyle = '#22c55e'
    ctx.beginPath()
    ctx.arc(sx, sy, 14, 0, Math.PI * 2)
    ctx.fill()

    const [ex, ey] = project(points[points.length - 1])
    ctx.fillStyle = '#e5533d'
    ctx.beginPath()
    ctx.arc(ex, ey, 14, 0, Math.PI * 2)
    ctx.fill()
  }

  // Estadísticas (grilla de 2 columnas)
  const stats = [
    { label: 'DISTANCIA', value: `${(activity.distanceMeters / 1000).toFixed(2)} km` },
    { label: 'TIEMPO', value: activity.durationLabel },
    { label: 'VEL. PROMEDIO', value: `${activity.avgSpeedKmh.toFixed(1)} km/h` },
    { label: 'CALORÍAS', value: activity.calories != null ? `${activity.calories} kcal` : '—' },
  ]
  if (activity.loadKg > 0) {
    stats.push({ label: 'CARGA', value: `${activity.loadKg} kg` })
  }

  const statsTop = mapTop + mapHeight + 90
  const cellHeight = 150
  const cellWidth = (WIDTH - 160) / 2

  stats.forEach((s, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const cx = 80 + cellWidth * col + cellWidth / 2
    const cy = statsTop + row * cellHeight

    ctx.fillStyle = '#ffffff'
    ctx.font = "800 72px 'Big Shoulders Display', sans-serif"
    ctx.textAlign = 'center'
    ctx.fillText(s.value, cx, cy)

    ctx.fillStyle = '#9ca3af'
    ctx.font = "600 28px 'Inter', sans-serif"
    ctx.fillText(s.label, cx, cy + 44)
  })

  // Pie
  ctx.fillStyle = '#9ca3af'
  ctx.font = "500 32px 'Inter', sans-serif"
  ctx.textAlign = 'center'
  ctx.fillText(activity.dateLabel, WIDTH / 2, HEIGHT - 140)
  ctx.fillStyle = '#00a7e1'
  ctx.font = "600 32px 'Inter', sans-serif"
  ctx.fillText('@comandos.ar', WIDTH / 2, HEIGHT - 90)

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.95))
}
