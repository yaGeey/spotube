import { PlaylistWithItems } from '@/electron/lib/prisma'
import { vanillaTrpc } from '../utils/trpc'

export const addFromSpotifyToPlaylistMenuItem = ({
   currentPlId,
   trackId,
   plQueryData,
}: {
   currentPlId: number | string
   trackId: string
   plQueryData: PlaylistWithItems[]
}) => ({
   name: 'Add to playlist',
   items: plQueryData
      .filter((pl) => currentPlId !== pl.id && pl.origin === 'SPOTIFY')
      .map((pl) => ({
         name: pl.title,
         function: () =>
            vanillaTrpc.spotifyUser.addTracksToPlaylist.mutate({
               playlistId: pl.spotifyMetadataId!,
               trackUris: [`spotify:track:${trackId}`],
            }),
      })),
})
