// Aliran semantic event untuk efek 3D (tanpa lewat React state).
const listeners = new Set()

export const eventStream = {
  emit(event) {
    for (const fn of listeners) fn(event)
  },
  on(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}
