import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Mapa reutilizable para mostrar un recorrido: se usa tanto en vivo mientras
// se está grabando (live=true, sigue la posición actual) como para mostrar
// un recorrido ya guardado (live=false, encuadra todo el trazado).
export function RouteMap({ points, live = false, height = 260 }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const polylineRef = useRef(null)
  const startMarkerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)
    map.setView([-34.6037, -58.3816], 13) // Buenos Aires, hasta tener puntos reales
    polylineRef.current = L.polyline([], { color: '#00a7e1', weight: 4 }).addTo(map)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const polyline = polylineRef.current
    if (!map || !polyline) return

    const latlngs = points.map((p) => [p.lat, p.lng])
    polyline.setLatLngs(latlngs)

    if (latlngs.length === 0) return

    if (!startMarkerRef.current) {
      startMarkerRef.current = L.circleMarker(latlngs[0], {
        radius: 6, color: '#22c55e', fillColor: '#22c55e', fillOpacity: 1, weight: 2,
      }).addTo(map)
    } else {
      startMarkerRef.current.setLatLng(latlngs[0])
    }

    if (live) {
      const lastZoom = map.getZoom() < 15 ? 16 : map.getZoom()
      map.setView(latlngs[latlngs.length - 1], lastZoom)
    } else if (latlngs.length > 1) {
      map.fitBounds(polyline.getBounds(), { padding: [24, 24] })
    } else {
      map.setView(latlngs[0], 16)
    }
  }, [points, live])

  return <div ref={containerRef} style={{ height, width: '100%', borderRadius: '12px' }} />
}
