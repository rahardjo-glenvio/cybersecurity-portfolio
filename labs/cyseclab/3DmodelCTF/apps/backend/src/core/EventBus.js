import { EventEmitter } from 'node:events'

// Event bus internal. 'event' untuk setiap semantic event; 'teams' dikirim
// sekali per tick berisi tim yang berubah (snapshot dibatch, tidak per event).
export class EventBus extends EventEmitter {
  constructor() {
    super()
    this.dirty = new Set()
    this.scheduled = false
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
    setImmediate(() => {
      this.scheduled = false
      const teams = new Set(this.dirty)
      this.dirty.clear()
      this.emit('teams', teams)
    })
  }
}
