import { ACTIVITY_COLOR, ROOM_STATUS_COLOR } from '../../config/theme'

// Komponen UI kecil yang reusable.

export function Pill({ label, color }) {
  return (
    <span className="pill" style={{ '--tone': color }}>
      {label}
    </span>
  )
}

export const StatusPill = ({ status }) => <Pill label={status} color={ROOM_STATUS_COLOR[status]} />

export const ActivityPill = ({ state }) => <Pill label={state} color={ACTIVITY_COLOR[state]} />

export function Toggle({ label, checked, onChange, id }) {
  return (
    <label className="toggle" htmlFor={id}>
      <span>{label}</span>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle__track" aria-hidden="true">
        <span className="toggle__thumb" />
      </span>
    </label>
  )
}

export function Meta({ label, value, mono }) {
  return (
    <div className="meta">
      <span className="meta__label">{label}</span>
      <span className={`meta__value${mono ? ' is-mono' : ''}`}>{value}</span>
    </div>
  )
}
