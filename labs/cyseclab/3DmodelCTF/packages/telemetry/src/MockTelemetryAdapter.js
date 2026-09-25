import { RAW_KINDS, TelemetryAdapter } from './TelemetryAdapter.js'

// Adapter LAB: raw telemetry disuntik dari Telemetry Simulator (debug panel)
// atau Auto Demo, bukan dari VM sungguhan.
export class MockTelemetryAdapter extends TelemetryAdapter {
  constructor() {
    super('mock')
    this.running = false
  }

  async start() {
    this.running = true
  }

  async stop() {
    this.running = false
  }

  // Mengembalikan hasil listener (semantic event) supaya API LAB bisa
  // menampilkan transformasi raw -> semantic.
  inject(raw) {
    if (!this.running) throw new Error('MockTelemetryAdapter belum dijalankan')
    if (!Object.values(RAW_KINDS).includes(raw.kind)) throw new Error(`Raw kind tidak dikenal: ${raw.kind}`)
    if (!raw.teamId || !raw.playerId) throw new Error('Raw telemetry wajib punya teamId dan playerId')
    return this.emit({ vmId: `vm-${raw.playerId}`, ...raw, source: 'mock' }).flat()
  }
}
