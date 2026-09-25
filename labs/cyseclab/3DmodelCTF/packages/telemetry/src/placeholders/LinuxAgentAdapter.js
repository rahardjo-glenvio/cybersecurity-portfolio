import { TelemetryAdapter } from '../TelemetryAdapter.js'

/**
 * PLACEHOLDER. Agent Linux (di dalam VM peserta):
 * - PROCESS_STARTED/EXITED dari exec event (auditd execve atau eBPF), hanya
 *   basename proses. Argumen command TIDAK dikirim.
 * - FILE_CREATED hanya untuk folder unduhan yang berasal dari host CTF.
 * - NET_FLOW hanya host:port tujuan yang cocok dengan daftar challenge host.
 * - INPUT_ACTIVITY hanya durasi idle (detik), tanpa keystroke.
 */
export class LinuxAgentAdapter extends TelemetryAdapter {
  constructor(options = {}) {
    super('linux-agent')
    this.options = options // { listenPort, sharedSecret }
  }

  async start() {
    throw new Error('LinuxAgentAdapter belum diimplementasikan (LAB memakai MockTelemetryAdapter)')
  }
}
