import { ACTIVITY_STATE as S, EVENT_TYPES as E } from '@lab/shared'

// Transisi activity state player. Mengembalikan state baru dan (opsional)
// state tujuan setelah jeda, misalnya ERROR -> ANALYZING setelah 1,5 detik.
export function nextActivity(current, eventType, { toolOpen = false } = {}) {
  const working = toolOpen ? S.ANALYZING : S.ACTIVE
  switch (eventType) {
    case E.PLAYER_ENTERED_ROOM:
      return { state: toolOpen ? S.ANALYZING : S.ACTIVE }
    case E.PLAYER_ACTIVE:
      return { state: current === S.IDLE || current === S.ACTIVE ? working : current }
    case E.PLAYER_IDLE:
      return { state: S.IDLE }
    case E.TOOL_OPENED:
      return { state: S.ANALYZING }
    case E.TOOL_CLOSED:
      return { state: S.ACTIVE }
    case E.FILE_DOWNLOADED:
    case E.INSTANCE_STARTED:
      return { state: current === S.IDLE ? S.ACTIVE : current }
    case E.FLAG_ATTEMPT:
      return { state: S.SUBMITTING }
    case E.FLAG_WRONG:
      return { state: S.ERROR, revertTo: working, revertAfterMs: 1500 }
    case E.FLAG_CORRECT:
      return { state: S.SUCCESS, revertTo: S.ACTIVE, revertAfterMs: 2600 }
    default:
      return { state: current }
  }
}
