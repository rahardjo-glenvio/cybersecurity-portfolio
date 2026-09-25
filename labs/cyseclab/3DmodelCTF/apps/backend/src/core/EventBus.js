// Tanpa node:events supaya core juga bisa jalan di browser (mode standalone).
const defer = globalThis.setImmediate ?? ((fn) => setTimeout(fn, 0))

// Event bus internal. 'event' untuk setiap semantic event; 'teams' dikirim
// sekali per tick berisi tim yang berubah (snapshot dibatch, tidak per event).
export class EventBus {
  constructor() {
    this.listeners = new Map()
    this.dirty = new Set()
    this.scheduled = false
  }

  on(name, listener) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set())
    this.listeners.get(name).add(listener)
    return () => this.listeners.get(name).delete(listener)
  }

  emit(name, payload) {
    for (const listener of this.listeners.get(name) ?? []) listener(payload)
  }

  publish(event) {
    this.emit('event', event)
    if (event.teamId) this.touch(event.teamId)
    else this.touchAll()
  }

  touch(teamId) {
    this.dirty.add(teamId)
    this.schedule()
  }

  touchAll() {
    this.dirty.add('*')
    this.schedule()
  }

  schedule() {
    if (this.scheduled) return
    this.scheduled = true
    defer(() => {
      this.scheduled = false
      const teams = new Set(this.dirty)
      this.dirty.clear()
      this.emit('teams', teams)
    })
  }
}
