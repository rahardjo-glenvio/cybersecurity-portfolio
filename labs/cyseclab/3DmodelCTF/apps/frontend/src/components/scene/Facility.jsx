import { useLab } from '../../state/store'
import RoomModule from './RoomModule'
import Corridors from './lines/Corridors'
import Lobby from './environment/Lobby'
import InstanceCluster from './environment/InstanceCluster'
import RoomDecor from './decor/RoomDecor'
import CoreDecor from './decor/CoreDecor'

// Seluruh virtual building milik satu tim, dibangun dari snapshot backend
// dan layout (port, jalur, annex, cluster) yang dihitung sekali per map.
export default function Facility({ team, layout }) {
  const selectedRoomId = useLab((s) => s.selectedRoomId)
  const selectRoom = useLab((s) => s.selectRoom)

  return (
    <group>
      <Lobby node={layout.lobby} />
      <Corridors layout={layout} team={team} />
      {team.rooms.map((room) => {
        const node = layout.nodes.get(room.id)
        const annex = layout.annexes.get(room.id)
        return (
          <group key={room.id}>
            <RoomModule room={room} node={node} selected={room.id === selectedRoomId} onSelect={selectRoom} />
            {room.type === 'core' ? <CoreDecor room={room} node={node} /> : annex && <RoomDecor room={room} annex={annex} node={node} />}
          </group>
        )
      })}
      <InstanceCluster layout={layout} team={team} />
    </group>
  )
}
