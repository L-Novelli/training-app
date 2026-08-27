// Acepta cualquier link de Spotify (el normal para compartir, o el que da
// la opción "Embed" del menú Compartir) y devuelve la URL lista para meter
// en un <iframe>. Soporta playlists, álbumes, canciones sueltas y artistas.
export function toSpotifyEmbedUrl(input) {
  if (!input) return null
  const match = input.match(
    /open\.spotify\.com\/(?:embed\/)?(playlist|album|track|artist|show|episode)\/([a-zA-Z0-9]+)/
  )
  if (!match) return null
  const [, type, id] = match
  return `https://open.spotify.com/embed/${type}/${id}`
}
