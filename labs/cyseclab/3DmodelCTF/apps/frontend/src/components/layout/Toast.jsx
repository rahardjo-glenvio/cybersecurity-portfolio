import { useEffect } from 'react'
import { useLab } from '../../state/store'

export default function Toast() {
  const notice = useLab((s) => s.notice)
  const clearNotice = useLab((s) => s.clearNotice)

  useEffect(() => {
    if (!notice) return undefined
    const id = setTimeout(clearNotice, 3800)
    return () => clearTimeout(id)
  }, [notice, clearNotice])

  if (!notice) return null
  return (
    <div className={`toast toast--${notice.level ?? 'info'}`} role="status" key={notice.id}>
      {notice.message}
    </div>
  )
}
