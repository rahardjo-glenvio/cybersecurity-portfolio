import { createMapGraph } from '@lab/game-engine'
import { TelemetryProcessor } from '@lab/telemetry'
import { EventBus } from './EventBus.js'
import { GameState } from './GameState.js'
import { LabController } from './LabController.js'
import { DemoRunner } from './DemoRunner.js'

// Merakit layer inti tanpa IO sendiri: adapter dan database disuntik pemanggil.
// Dipakai server Node (app.js) dan mode standalone di browser.
// CTF adapter -> GameState (progression) <- TelemetryProcessor <- telemetry adapter
//            -> database -> EventBus -> client
export async function createCore({ mapConfig, db, ctf, telemetry, labMode }) {
  const graph = createMapGraph(mapConfig)
  const bus = new EventBus()

  await ctf.init()
  const state = new GameState({ graph, mapConfig, db, ctf, bus, labMode })
  await state.init()

  const challenges = await ctf.getChallenges()
  const processor = new TelemetryProcessor({
    challengeHosts: challenges.map((c) => c.instance?.host).filter(Boolean),
  })
  telemetry.onEvent((raw) => processor.process(raw).map((event) => state.applyTelemetry(event)))
  await telemetry.start()

  const lab = new LabController({ state, telemetry, ctf })
  lab.demo = new DemoRunner({ lab, state, script: mapConfig.demo ?? [] })

  return { state, lab, bus, telemetry }
}
