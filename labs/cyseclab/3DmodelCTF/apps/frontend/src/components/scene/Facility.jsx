import { useLab } from '../../state/store'
import RoomModule from './RoomModule'
import Corridors from './lines/Corridors'
import Lobby from './environment/Lobby'
import InstanceCluster from './environment/InstanceCluster'

// Seluruh virtual building milik satu tim, dibangun dari snapshot backend
// dan layout (port, jalur, cluster) yang dihitung sekali per map.
export default function Facility({ team, layout }) {
  const selectedRoomId = useLab((s) => s.selectedRoomId)
  const selectRoom = useLab((s) => s.selectRoom)

  return (
    <group>
      <Lobby node={layout.lobby} />
      <Corridors layout={layout} team={team} />
      {team.rooms.map((room) => (
        <RoomModule key={room.id} room={room} node={layout.nodes.get(room.id)} selected={room.id === selectedRoomId} onSelect={selectRoom} />
      ))}
      <InstanceCluster layout={layout} team={team} />
    </group>
  )
}
