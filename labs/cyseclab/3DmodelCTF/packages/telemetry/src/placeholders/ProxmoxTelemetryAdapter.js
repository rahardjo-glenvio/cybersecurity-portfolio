import { TelemetryAdapter } from '../TelemetryAdapter.js'

/**
 * PLACEHOLDER. Rencana integrasi Proxmox VE:
 * - Mapping vmId -> teamId/playerId dari tag VM atau tabel assignment.
 * - Sumber data: QEMU guest agent / agent di dalam VM yang mengirim ke
 *   collector, bukan scraping layar atau konsol.
 * - Status VM (start/stop) dari Proxmox API (/nodes/{node}/qemu/{vmid}/status)
 *   dapat dipetakan ke HEARTBEAT.
 * Emit hanya RAW_KINDS yang sudah disepakati; privasi tetap diterapkan lagi
 * oleh TelemetryProcessor.
 */
export class ProxmoxTelemetryAdapter extends TelemetryAdapter {
  constructor(options = {}) {
    super('proxmox')
    this.options = options // { apiUrl, tokenId, tokenSecret, node }
  }

  async start() {
    throw new Error('ProxmoxTelemetryAdapter belum diimplementasikan (LAB memakai MockTelemetryAdapter)')
  }
}
