import { readFileSync } from 'node:fs'
import { createCtfAdapter, createTelemetryAdapter } from './adapters/index.js'
import { openDatabase } from './db/database.js'
import { createCore } from './core/createCore.js'
import { createServer } from './api/server.js'

// Server Node: core LAB + SQLite + HTTP/WebSocket.
export async function createLab(config) {
  const mapConfig = JSON.parse(readFileSync(config.mapPath, 'utf8'))
  const db = openDatabase(config.dbPath)
  const core = await createCore({
    mapConfig,
    db,
    ctf: createCtfAdapter(config.ctfAdapter, config.ctfOptions),
    telemetry: createTelemetryAdapter(config.telemetryAdapter),
    labMode: config.labMode,
  })

  const server = config.http === false ? null : await createServer({ ...core, config })

  return {
    ...core,
    db,
    server,
    async close() {
      core.lab.demo.stop()
      await core.telemetry.stop()
      await server?.close()
      db.close()
    },
  }
}
