import { readFileSync } from 'node:fs'
import {
  LinuxAgentAdapter,
  MockTelemetryAdapter,
  ProxmoxTelemetryAdapter,
  WindowsAgentAdapter,
} from '@lab/telemetry'
import { MockCTFEngineAdapter } from './ctf/MockCTFEngineAdapter.js'
import { CTFdAdapter } from './ctf/CTFdAdapter.js'

const MOCK_DATA_URL = new URL('./ctf/mock/ctf-data.json', import.meta.url)

// Satu-satunya tempat pemilihan implementasi. Ganti lewat env tanpa
// mengubah progression engine atau visualisasi.
export function createCtfAdapter(name, options = {}) {
  switch (name) {
    case 'mock': {
      const { dataUrl = MOCK_DATA_URL, ...rest } = options
      return new MockCTFEngineAdapter({ ...rest, data: JSON.parse(readFileSync(dataUrl, 'utf8')) })
    }
    case 'ctfd':
      return new CTFdAdapter({ baseUrl: process.env.CTFD_URL, apiToken: process.env.CTFD_TOKEN })
    default:
      throw new Error(`CTF adapter tidak dikenal: ${name}`)
  }
}

export function createTelemetryAdapter(name) {
  switch (name) {
    case 'mock':
      return new MockTelemetryAdapter()
    case 'proxmox':
      return new ProxmoxTelemetryAdapter({ apiUrl: process.env.PROXMOX_URL })
    case 'linux-agent':
      return new LinuxAgentAdapter()
    case 'windows-agent':
      return new WindowsAgentAdapter()
    default:
      throw new Error(`Telemetry adapter tidak dikenal: ${name}`)
  }
}
