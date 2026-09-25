import { useEffect, useState } from 'react'

export const clock = (ms) => new Date(ms).toTimeString().slice(0, 5)

export function duration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((n) => String(n).padStart(2, '0')).join(':')
}

export function ago(ms, now = Date.now()) {
  if (!ms) return '—'
  const s = Math.max(0, Math.floor((now - ms) / 1000))
  if (s < 5) return 'baru saja'
  if (s < 60) return `${s} dtk lalu`
  return `${Math.floor(s / 60)} mnt lalu`
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export const titleCase = (s) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : '')
