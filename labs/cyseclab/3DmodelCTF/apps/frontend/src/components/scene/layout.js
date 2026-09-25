import { Vector3 } from 'three'

// Satu sumber layout scene: dimensi modul, port corridor di tepi room,
// geometri jalur, bounds map, dan posisi instance cluster. Dihitung dari
// posisi di snapshot (bukan status), jadi cukup sekali per map.

export const FLOOR_H = 0.2 // tebal slab room
export const WALL_H = 0.9
export const WALL_T = 0.08
export const PILLAR = 0.16
export const OPENING_W = 0.8
export const CORRIDOR_W = 0.62
export const DECK_T = 0.07 // tebal deck corridor
export const HOVER = 0.55 // tinggi tracking point di atas lantai
export const LOBBY_R = 1.8 // circumradius oktagon lobby
export const LOBBY_H = 0.14
export const APOTHEM = Math.cos(Math.PI / 8) // oktagon: jarak ke tengah sisi / circumradius

const ROOM_SIZE = [3.2, 2.6]
const CORE_SIZE = [4.6, 4.6]
const STUB = 0.45 // potongan lurus keluar dari pintu sebelum jalur berbelok
const MAX_SLOPE = Math.tan((30 * Math.PI) / 180)
const PORT_GAP = OPENING_W + 0.22
const CLUSTER_OFFSET = 2.8
const DECK_PAD = 1.5
export const SIDES = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] }

// Kunci memo: hanya field yang memengaruhi geometri.
export function layoutKey(team) {
  return JSON.stringify([
    team.rooms.map((r) => [r.id, r.type, r.position3D, r.size]),
    team.corridors.map((c) => [c.from, c.to, c.kind]),
    team.lobby.position3D,
  ])
}

export function computeLayout(team) {
  const nodes = new Map()
  for (const r of team.rooms) {
    const [x, y, z] = r.position3D
    const core = r.type === 'core'
    const [w, d] = r.size ?? (core ? CORE_SIZE : ROOM_SIZE)
    nodes.set(r.id, { id: r.id, shape: core ? 'octagon' : 'rect', core, x, y, z, w, d, radius: w / 2, floorY: y + FLOOR_H, ports: [] })
  }
  const [lx, , lz] = team.lobby.position3D
  const lobby = { id: 'lobby', shape: 'octagon', lobby: true, x: lx, y: 0, z: lz, w: LOBBY_R * 2, d: LOBBY_R * 2, radius: LOBBY_R, floorY: LOBBY_H, ports: [] }
  nodes.set(lobby.id, lobby)

  const corridors = team.corridors.map((c) => {
    const a = nodes.get(c.from)
    const b = nodes.get(c.to)
    return { key: `${c.from}->${c.to}`, from: c.from, to: c.to, kind: c.kind, pa: requestPort(a, b), pb: requestPort(b, a) }
  })
  for (const node of nodes.values()) placePorts(node)

  const links = new Map()
  for (const c of corridors) {
    c.points = corridorPoints(c.pa, c.pb)
    c.tangents = [c.pa.tangent, c.pb.tangent]
    c.length = pathLength(c.points)
    c.pylons = pylonsFor(c.points, nodes)
    links.set(`${c.from}|${c.to}`, c.points)
    links.set(`${c.to}|${c.from}`, [...c.points].reverse())
  }

  const rooms = [...nodes.values()].filter((n) => !n.lobby)
  const cluster = {
    x: Math.max(...rooms.map((n) => n.x + extent(n)[0])) + CLUSTER_OFFSET,
    z: rooms.reduce((sum, n) => sum + n.z, 0) / rooms.length,
    footprint: [1.4, 1.3], // pad + marking lantai di depannya
  }

  return { nodes, lobby, corridors, links, cluster, bounds: boundsOf([...nodes.values()], cluster) }
}

// ---------- Port ----------

// Sisi keluar = sisi yang ditembus garis dari pusat room ke pusat tujuan.
function requestPort(node, other) {
  const dx = other.x - node.x
  const dz = other.z - node.z
  const port = { node: node.id, to: other.id }
  if (node.shape === 'octagon') {
    port.angle = Math.atan2(dz, dx)
  } else if (Math.abs(dx) / (node.w / 2) > Math.abs(dz) / (node.d / 2)) {
    port.side = dx > 0 ? 'E' : 'W'
    port.t = (dz * (node.w / 2)) / Math.abs(dx)
  } else {
    port.side = dz > 0 ? 'S' : 'N'
    port.t = (dx * (node.d / 2)) / Math.abs(dz)
  }
  node.ports.push(port)
  return port
}

function placePorts(node) {
  if (node.shape === 'octagon') return placeOctagonPorts(node)
  for (const side of Object.keys(SIDES)) {
    const list = node.ports.filter((p) => p.side === side).sort((a, b) => a.t - b.t)
    const half = (side === 'N' || side === 'S' ? node.w : node.d) / 2
    const limit = half - PILLAR - OPENING_W / 2 - 0.04
    spread(list, -limit, limit)
    const [nx, nz] = SIDES[side]
    for (const p of list) {
      const lx = nx ? nx * (node.w / 2) : p.t
      const lz = nz ? nz * (node.d / 2) : p.t
      Object.assign(p, {
        world: new Vector3(node.x + lx, node.floorY, node.z + lz),
        normal: new Vector3(nx, 0, nz),
        tangent: new Vector3(-nz, 0, nx),
      })
    }
  }
}

// Port oktagon selalu di tengah sisi datar (kelipatan 45°), jadi tidak
// pernah bertemu pilar core yang berdiri di vertex.
function placeOctagonPorts(node) {
  const used = new Set()
  const step = Math.PI / 4
  const byFit = [...node.ports].sort((a, b) => offSlot(a.angle) - offSlot(b.angle))
  for (const p of byFit) {
    const base = Math.round(p.angle / step)
    const slot = [0, 1, -1, 2, -2, 3, -3, 4].map((k) => (((base + k) % 8) + 8) % 8).find((s) => !used.has(s))
    used.add(slot)
    const angle = slot * step
    const normal = new Vector3(Math.cos(angle), 0, Math.sin(angle))
    Object.assign(p, {
      angle,
      world: new Vector3(node.x, node.floorY, node.z).addScaledVector(normal, node.radius * APOTHEM),
      normal,
      tangent: new Vector3(-normal.z, 0, normal.x),
    })
  }
}

const offSlot = (angle) => Math.abs(angle / (Math.PI / 4) - Math.round(angle / (Math.PI / 4)))

// Jaga jarak antar opening di satu sisi dan tetap di antara pilar sudut.
function spread(list, min, max) {
  if (!list.length) return
  for (const p of list) p.t = Math.min(max, Math.max(min, p.t))
  for (let i = 1; i < list.length; i++) list[i].t = Math.max(list[i].t, list[i - 1].t + PORT_GAP)
  const over = list.at(-1).t - max
  if (over > 0) for (const p of list) p.t -= over
  if (list[0].t < min) list.forEach((p, i) => (p.t = list.length === 1 ? 0 : min + ((max - min) * i) / (list.length - 1)))
}

// ---------- Jalur ----------

// Keluar tegak lurus dari pintu (stub), lalu lurus ke stub tujuan. Stub
// dilewati kalau membuat ramp lebih curam dari ~30° atau celahnya terlalu pendek.
function corridorPoints(pa, pb) {
  const a = pa.world
  const b = pb.world
  const sa = a.clone().addScaledVector(pa.normal, STUB)
  const sb = b.clone().addScaledVector(pb.normal, STUB)
  const run = Math.hypot(sb.x - sa.x, sb.z - sa.z)
  const steep = Math.abs(b.y - a.y) > run * MAX_SLOPE
  if (steep || run < 0.3) return [a.clone(), b.clone()]
  return [a.clone(), sa, sb, b.clone()]
}

function pathLength(points) {
  let len = 0
  for (let i = 1; i < points.length; i++) len += points[i].distanceTo(points[i - 1])
  return len
}

// Tiang penyangga untuk bentang yang tinggi, kecuali jatuh di footprint node.
function pylonsFor(points, nodes) {
  const a = points[points.length > 2 ? 1 : 0]
  const b = points[points.length > 2 ? points.length - 2 : 1]
  const span = Math.hypot(b.x - a.x, b.z - a.z)
  if (span < 3) return [] // bentang pendek tidak butuh penyangga (dan terlihat janggal)
  const drop =(Math.abs(b.y - a.y) / span) * 0.14 + 0.01 // pelat atas 0,24 m di bawah deck miring
  const ts = span > 7 ? [1 / 3, 2 / 3] : [0.5]
  const pylons = []
  for (const t of ts) {
    const x = a.x + (b.x - a.x) * t
    const z = a.z + (b.z - a.z) * t
    const h = a.y + (b.y - a.y) * t - DECK_T - drop
    if (h < 0.5) continue
    const blocked = [...nodes.values()].some((n) => {
      const [ex, ez] = extent(n)
      return Math.abs(x - n.x) < ex + 0.3 && Math.abs(z - n.z) < ez + 0.3
    })
    if (!blocked) pylons.push({ x, z, h })
  }
  return pylons
}

// ---------- Bounds ----------

const extent = (n) => (n.shape === 'rect' ? [n.w / 2, n.d / 2] : [n.radius, n.radius])

function boundsOf(nodes, cluster) {
  const boxes = nodes.map((n) => [n.x, n.z, ...extent(n)])
  boxes.push([cluster.x, cluster.z, ...cluster.footprint])
  const minX = Math.min(...boxes.map(([x, , ex]) => x - ex)) - DECK_PAD
  const maxX = Math.max(...boxes.map(([x, , ex]) => x + ex)) + DECK_PAD
  const minZ = Math.min(...boxes.map(([, z, , ez]) => z - ez)) - DECK_PAD
  const maxZ = Math.max(...boxes.map(([, z, , ez]) => z + ez)) + DECK_PAD
  const maxY = Math.max(...nodes.map((n) => n.floorY + (n.core ? 3.2 : WALL_H)))
  const focus = boxes.slice(0, -1)
  const fx = (Math.min(...focus.map(([x, , ex]) => x - ex)) + Math.max(...focus.map(([x, , ex]) => x + ex))) / 2
  const fz = (Math.min(...focus.map(([, z, , ez]) => z - ez)) + Math.max(...focus.map(([, z, , ez]) => z + ez))) / 2
  return { minX, maxX, minZ, maxZ, maxY, cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2, fx, fz, width: maxX - minX, depth: maxZ - minZ }
}
