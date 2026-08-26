// Un día está "completo" para un usuario cuando todos sus ejercicios están
// marcados como hechos. Un día sin ejercicios cuenta como completo
// automáticamente (ej. un día de descanso sin ejercicios cargados).
export function isDayComplete(workout, completedIds) {
  return workout.exercises.every((ex) => completedIds.has(ex.id))
}

// Devuelve el índice del primer día no completado (el "día actual"),
// o -1 si no hay días o todos están completos.
export function findCurrentDayIndex(workouts, completedIds) {
  if (workouts.length === 0) return -1
  return workouts.findIndex((w) => !isDayComplete(w, completedIds))
}
