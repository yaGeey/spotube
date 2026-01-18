import { PlaylistWithItems, TrackWithRelations } from '@/electron/lib/prisma'
import { queryClient } from '../main'
import { create } from 'mutative'

export const queryKey = (playlistId: number) => [['playlists', 'getById'], { input: playlistId, type: 'query' }]

export default function updateTrackInQuery({
   playlistId,
   masterId,
   data,
}: {
   playlistId: number
   masterId: number
   data: TrackWithRelations
}) {
   queryClient.setQueryData(queryKey(playlistId), (p: PlaylistWithItems | undefined) => {
      if (!p) return p
      return create(p, (d) => {
         const item = d?.playlistItems.find((i) => i.track.id === masterId)
         if (item) item.track = data
      })
   })
}
