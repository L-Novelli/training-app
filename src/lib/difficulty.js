// Opciones de dificultad de ejecución que puede calificar el usuario
// para cada ejercicio, una vez que lo marca como hecho.
export const DIFFICULTY_OPTIONS = [
  { value: 'muy_facil', label: 'Muy fácil' },
  { value: 'facil', label: 'Fácil' },
  { value: 'moderado', label: 'Moderado' },
  { value: 'pesado', label: 'Pesado' },
  { value: 'muy_pesado', label: 'Muy pesado' },
]

export function difficultyLabel(value) {
  return DIFFICULTY_OPTIONS.find((o) => o.value === value)?.label || ''
}