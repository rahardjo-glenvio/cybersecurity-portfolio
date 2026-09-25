import { readFileSync } from 'node:fs'
import { createMapGraph } from '@lab/game-engine'
import { TelemetryProcessor } from '@lab/telemetry'
import { createCtfAdapter, createTelemetryAdapter } from './adapters/index.js'
import { openDatabase } from './db/database.js'
import { EventBus } from './core/EventBus.js'
import { GameState } from './core/GameState.js'
import { LabController } from './core/LabController.js'
import { DemoRunner } from './core/DemoRunner.js'
import { createServer } from './api/server.js'

// Merakit seluruh layer:
// CTF adapter -> GameState (progression) <- TelemetryProcessor <- telemetry adapter
//            -> SQLite -> EventBus -> WebSocket -> viewer 3D
export async function createLab(config) {
  const mapConfig = JSON.parse(readFileSync(config.mapPath, 'utf8'))
  const graph = createMapGraph(mapConfig)
  const db = openDatabase(config.dbPath)
  const bus = new EventBus()

  const ctf = createCtfAdapter(config.ctfAdapter, config.ctfOptions)
  await ctf.init()

  const state = new GameState({ graph, mapConfig, db, ctf, bus, labMode: config.labMode })
  await state.init()

  const challenges = await ctf.getChallenges()
  const processor = new TelemetryProcessor({
    challengeHosts: challenges.map((c) => c.instance?.host).filter(Boolean),
  })
  const telemetry = createTelemetryAdapter(config.telemetryAdapter)
  telemetry.onEvent((raw) => processor.process(raw).map((event) => state.applyTelemetry(event)))
  await telemetry.start()

  const lab = new LabController({ state, telemetry, ctf })
  lab.demo = new DemoRunner({ lab, state, script: mapConfig.demo ?? [] })

  const server = config.http === false ? null : await createServer({ state, lab, bus, config })

  return {
    state,
    lab,
    bus,
    db,
    server,
    async close() {
      lab.demo.stop()
      await telemetry.stop()
      await server?.close()
      db.close()
    },
  }
}
