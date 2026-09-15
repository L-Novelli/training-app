// Acepta cualquier link de YouTube (video normal, youtu.be corto, shorts,
// o ya en formato embed) y devuelve el ID del video de 11 caracteres.
export function extractYouTubeId(input) {
  if (!input) return null
  const match = input.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  )
  return match ? match[1] : null
}

// Devuelve la URL lista para meter en un <iframe> y reproducir el video
// embebido dentro de la app, o null si el link no es de YouTube.
export function toYouTubeEmbedUrl(input) {
  const id = extractYouTubeId(input)
  return id ? `https://www.youtube.com/embed/${id}` : null
}
