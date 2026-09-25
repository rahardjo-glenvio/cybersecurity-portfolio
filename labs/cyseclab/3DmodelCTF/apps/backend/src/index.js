import { config } from './config.js'
import { createLab } from './app.js'

const lab = await createLab(config)
await lab.server.listen({ port: config.port, host: config.host })

console.log(`[backend] http://${config.host}:${config.port}  ws: /ws  map: ${lab.state.graph.name}`)
console.log(`[backend] CTF adapter: ${config.ctfAdapter} · telemetry: ${config.telemetryAdapter} · ${config.labMode ? 'LAB MODE' : 'production mode'}`)

const shutdown = async () => {
  await lab.close()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
