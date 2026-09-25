import { useEffect, useState } from 'react'
import { useLab } from '../../state/store'
import { api } from '../../api/client'
import { StatusPill } from '../ui/primitives'

// Detail room diambil dari backend per tim. Room LOCKED dijawab 403 dengan
// { id, status } saja, jadi frontend memang tidak punya isi challenge-nya.
export default function RoomDetail({ team }) {
  const roomId = useLab((s) => s.selectedRoomId)
  const snapshotRoom = team.rooms.find((r) => r.id === roomId)
  const [detail, setDetail] = useState(null)
  const statusKey = `${snapshotRoom?.status}-${snapshotRoom?.instanceActive}`

  useEffect(() => {
    if (!roomId) {
      setDetail(null)
      return undefined
    }
    let cancelled = false
    api.room(team.id, roomId).then((res) => !cancelled && setDetail({ httpStatus: res.status, ...res.data }))
    return () => {
      cancelled = true
    }
  }, [team.id, roomId, statusKey])

  if (!roomId) {
    return (
      <section className="panel-section room-detail room-detail--empty">
        <span className="eyebrow">Room detail</span>
        <p>Pilih room di building 3D atau daftar room.</p>
      </section>
    )
  }

  if (!detail) return <section className="panel-section room-detail">Memuat…</section>

  if (detail.status === 'LOCKED') {
    return (
      <section className="panel-section room-detail room-detail--locked">
        <span className="eyebrow">Room detail · HTTP {detail.httpStatus}</span>
        <h3>{snapshotRoom?.name ?? detail.id}</h3>
        <StatusPill status="LOCKED" />
        <p>Prerequisite belum terpenuhi. Backend hanya mengirim:</p>
        <pre>{JSON.stringify({ id: detail.id, status: detail.status }, null, 2)}</pre>
      </section>
    )
  }

  const c = detail.challenge
  return (
    <section className="panel-section room-detail">
      <span className="eyebrow">
        Room detail · stage {detail.stage} · {detail.category}
      </span>
      <div className="room-detail__head">
        <h3>{detail.name}</h3>
        <StatusPill status={detail.status} />
      </div>
      {c && (
        <>
          <p className="room-detail__title">
            {c.title} · <strong>{detail.points} pts</strong>
          </p>
          <p>{c.description}</p>
          <dl className="kv">
            <dt>Files</dt>
            <dd>{c.files.length ? c.files.map((f) => `${f.name} (${f.size})`).join(', ') : '—'}</dd>
            <dt>Hint</dt>
            <dd>{c.hasHint ? 'tersedia di platform CTF' : '—'}</dd>
            <dt>Instance</dt>
            <dd>{c.hasInstance ? (c.instance.running ? `RUNNING · ${c.instance.host}` : 'tersedia, belum jalan') : 'tidak ada'}</dd>
            <dt>Requires</dt>
            <dd>{detail.prerequisites.map((p) => p.name).join(' + ') || 'entry room'}</dd>
            <dt>Unlocks</dt>
            <dd>{detail.unlocks.map((p) => p.name).join(', ') || '—'}</dd>
          </dl>
        </>
      )}
    </section>
  )
}
