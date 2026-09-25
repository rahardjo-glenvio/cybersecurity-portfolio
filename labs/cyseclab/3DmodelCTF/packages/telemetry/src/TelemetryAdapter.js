// Jenis raw telemetry yang dikenali. Agent VM hanya boleh mengirim metadata
// kompetisi: nama proses, nama file unduhan dari platform CTF, host tujuan
// koneksi, dan durasi idle. Tidak ada keystroke, clipboard, screenshot,
// isi file, isi command, atau kredensial.
export const RAW_KINDS = Object.freeze({
  PROCESS_STARTED: 'PROCESS_STARTED',
  PROCESS_EXITED: 'PROCESS_EXITED',
  FILE_CREATED: 'FILE_CREATED',
  NET_FLOW: 'NET_FLOW',
  INPUT_ACTIVITY: 'INPUT_ACTIVITY',
  HEARTBEAT: 'HEARTBEAT',
})

/**
 * Kontrak sumber telemetry. Implementasi konkret:
 *   MockTelemetryAdapter   (LAB, disuntik dari Telemetry Simulator)
 *   ProxmoxTelemetryAdapter / LinuxAgentAdapter / WindowsAgentAdapter (placeholder)
 *
 * Raw event:
 * {
 *   source: 'mock' | 'proxmox' | 'linux-agent' | 'windows-agent',
 *   vmId, teamId, playerId,
 *   kind: RAW_KINDS.*,
 *   process?: 'ghidra',
 *   file?: { name, sizeBytes, origin: 'ctf-platform' | ... },
 *   net?: { dstHost, dstPort },
 *   idleSeconds?: number,
 *   timestamp: number
 * }
 */
export class TelemetryAdapter {
  constructor(name) {
    this.name = name
    this.listeners = new Set()
  }

  /** @returns {Promise<void>} */
  async start() {
    throw new Error(`${this.name}.start() belum diimplementasikan`)
  }

  /** @returns {Promise<void>} */
  async stop() {}

  /** @param {(raw: object) => void} callback  @returns {() => void} unsubscribe */
  onEvent(callback) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  emit(raw) {
    const event = { timestamp: Date.now(), ...raw, source: raw.source ?? this.name }
    const results = []
    for (const listener of this.listeners) results.push(listener(event))
    return results
  }
}
