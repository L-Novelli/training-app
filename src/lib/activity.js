export const ACTIVITY_TYPES = [
  { value: 'caminar', label: 'Caminar', emoji: '🚶' },
  { value: 'correr', label: 'Correr', emoji: '🏃' },
  { value: 'rucking', label: 'Rucking', emoji: '🎒' },
  { value: 'bicicleta', label: 'Bicicleta', emoji: '🚴' },
]

export function activityLabel(value) {
  return ACTIVITY_TYPES.find((a) => a.value === value)?.label || 'Caminar'
}
