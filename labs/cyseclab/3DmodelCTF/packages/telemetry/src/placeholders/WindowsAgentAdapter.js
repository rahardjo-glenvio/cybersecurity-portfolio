import { TelemetryAdapter } from '../TelemetryAdapter.js'

/**
 * PLACEHOLDER. Agent Windows (di dalam VM peserta):
 * - Process start/stop dari ETW atau Sysmon Event ID 1/5, hanya image name.
 * - Idle time dari GetLastInputInfo (durasi saja).
 * - Tanpa keylogging, clipboard, screenshot, atau isi file.
 */
export class WindowsAgentAdapter extends TelemetryAdapter {
  constructor(options = {}) {
    super('windows-agent')
    this.options = options
  }

  async start() {
    throw new Error('WindowsAgentAdapter belum diimplementasikan (LAB memakai MockTelemetryAdapter)')
  }
}
