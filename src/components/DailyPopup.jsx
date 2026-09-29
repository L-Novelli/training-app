import { useEffect, useState } from 'react'

import p01 from '../assets/popups/popup-01.jpg'
import p02 from '../assets/popups/popup-02.jpg'
import p03 from '../assets/popups/popup-03.jpg'
import p04 from '../assets/popups/popup-04.jpg'
import p05 from '../assets/popups/popup-05.jpg'
import p06 from '../assets/popups/popup-06.jpg'
import p07 from '../assets/popups/popup-07.jpg'
import p08 from '../assets/popups/popup-08.jpg'
import p09 from '../assets/popups/popup-09.jpg'
import p10 from '../assets/popups/popup-10.jpg'
import p11 from '../assets/popups/popup-11.jpg'
import p12 from '../assets/popups/popup-12.jpg'
import p13 from '../assets/popups/popup-13.jpg'
import p14 from '../assets/popups/popup-14.jpg'
import p15 from '../assets/popups/popup-15.jpg'
import p16 from '../assets/popups/popup-16.jpg'
import p17 from '../assets/popups/popup-17.jpg'
import p18 from '../assets/popups/popup-18.jpg'
import p19 from '../assets/popups/popup-19.jpg'
import p20 from '../assets/popups/popup-20.jpg'
import p21 from '../assets/popups/popup-21.jpg'
import p22 from '../assets/popups/popup-22.jpg'
import p23 from '../assets/popups/popup-23.jpg'
import p24 from '../assets/popups/popup-24.jpg'
import p25 from '../assets/popups/popup-25.jpg'

const POPUP_IMAGES = [
  p01, p02, p03, p04, p05, p06, p07, p08, p09, p10,
  p11, p12, p13, p14, p15, p16, p17, p18, p19, p20,
  p21, p22, p23, p24, p25,
]

const STORAGE_KEY = 'dailyPopupLastShown'

function todayString() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

// Muestra una imagen motivacional al azar, una vez por día, la primera vez
// que se monta este componente (pensado para el homepage / rutina del día).
export function DailyPopup() {
  const [image, setImage] = useState(null)

  useEffect(() => {
    try {
      const last = localStorage.getItem(STORAGE_KEY)
      if (last !== todayString()) {
        const pick = POPUP_IMAGES[Math.floor(Math.random() * POPUP_IMAGES.length)]
        setImage(pick)
      }
    } catch {
      // Si localStorage no está disponible, directamente no mostramos nada.
    }
  }, [])

  function close() {
    setImage(null)
    try {
      localStorage.setItem(STORAGE_KEY, todayString())
    } catch {
      // sin problema si no se puede guardar; en el peor caso vuelve a
      // aparecer la próxima vez que abra la app.
    }
  }

  if (!image) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
      onClick={close}
    >
      <div className="relative max-h-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={close}
          aria-label="Cerrar"
          className="absolute -top-3 -right-3 flex h-9 w-9 items-center justify-center rounded-full bg-panel text-lg font-bold text-chalk shadow-lg hover:bg-panel-raised"
        >
          ✕
        </button>
        <img
          src={image}
          alt=""
          className="max-h-[85vh] w-full rounded-lg object-contain shadow-2xl"
        />
      </div>
    </div>
  )
}
