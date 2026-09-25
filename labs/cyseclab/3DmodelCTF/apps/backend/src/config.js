import { fileURLToPath } from 'node:url'

const env = process.env

export const config = {
  port: Number(env.PORT ?? 8787),
  host: env.HOST ?? '127.0.0.1',
  // LAB_MODE membuka endpoint debug (mock event). Matikan di produksi.
  labMode: (env.LAB_MODE ?? 'true') !== 'false',
  dbPath: env.DB_PATH ?? fileURLToPath(new URL('../data/lab.db', import.meta.url)),
  mapPath: env.MAP_PATH ?? fileURLToPath(new URL('../maps/old-town.json', import.meta.url)),
  ctfAdapter: env.CTF_ADAPTER ?? 'mock',
  telemetryAdapter: env.TELEMETRY_ADAPTER ?? 'mock',
  logLevel: env.LOG_LEVEL ?? 'warn',
}
