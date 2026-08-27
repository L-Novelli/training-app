import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { toSpotifyEmbedUrl } from '../lib/spotify'

export function Playlists() {
  const { user, isAdmin } = useAuth()
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setPlaylists(data || [])
    } catch (err) {
      console.error('Load playlists error:', err)
      setError(err.message || 'No se pudieron cargar las playlists.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleAdd(e) {
    e.preventDefault()
    setError('')

    if (!title.trim() || !url.trim()) {
      setError('Completá el nombre y el link de Spotify.')
      return
    }

    const embedUrl = toSpotifyEmbedUrl(url.trim())
    if (!embedUrl) {
      setError('Ese link no parece ser de Spotify. Pegá el link normal de "Compartir" o el de "Embed" de una playlist, álbum o canción.')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('playlists')
        .insert({ title: title.trim(), spotify_url: embedUrl, created_by: user.id })
      if (error) throw error
      setTitle('')
      setUrl('')
      await load()
    } catch (err) {
      console.error('Add playlist error:', err)
      setError(err.message || 'No se pudo agregar la playlist.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta playlist de la lista?')) return
    setError('')
    try {
      const { error } = await supabase.from('playlists').delete().eq('id', id)
      if (error) throw error
      setPlaylists((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      console.error('Delete playlist error:', err)
      setError(err.message || 'No se pudo eliminar la playlist.')
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 font-display text-3xl font-bold tracking-wide text-chalk">Playlists</h1>

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      {isAdmin && (
        <form onSubmit={handleAdd} className="mb-8 space-y-3 rounded-lg border border-line bg-panel-raised p-6">
          <h2 className="text-lg font-semibold text-chalk">Agregar una playlist</h2>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Nombre</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Rock para entrenar"
              className="w-full rounded border border-line bg-panel px-3 py-2 text-chalk outline-none focus:border-cobalt"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Link de Spotify</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Pegá acá el link para compartir o el de Embed"
              className="w-full rounded border border-line bg-panel px-3 py-2 text-chalk outline-none focus:border-cobalt"
            />
            <p className="mt-1 text-xs text-muted">
              En Spotify: abrí la playlist → botón "..." → Compartir → Copiar link de la playlist (o "Insertar/Embed" si querés ese formato). Cualquiera de los dos funciona acá.
            </p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-cobalt px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Agregando...' : 'Agregar playlist'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="font-mono text-sm text-muted">Cargando…</p>
      ) : playlists.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-8 text-center text-muted">
          {isAdmin
            ? 'Todavía no agregaste ninguna playlist. Usá el formulario de arriba para sumar la primera.'
            : 'Todavía no hay playlists recomendadas.'}
        </div>
      ) : (
        <div className="space-y-6">
          {playlists.map((p) => (
            <div key={p.id} className="rounded-lg border border-line bg-panel-raised p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-chalk">{p.title}</h3>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-xs text-muted hover:text-danger"
                  >
                    Eliminar
                  </button>
                )}
              </div>
              <iframe
                src={p.spotify_url}
                title={p.title}
                width="100%"
                height="152"
                style={{ borderRadius: '12px' }}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
