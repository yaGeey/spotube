import { PlaylistItemWithRelations } from '@/electron/lib/prisma'
import { YoutubeVideo, LastFM } from '@/generated/prisma/client'
import { SimplifiedTrack, Track } from '@spotify/web-api-ts-sdk'

type ExternalIds = {
   yt?: string
   spotify?: string
   genius?: string
   lastFM?: string
}
type Translation = {
   original: string
   script: string
   translated: string
} & {
   original: string
   script: never
}
// TODO
export type CurrentTrackTODO = {
   title: Translation
   externalIds: ExternalIds
   artists: {
      name: Translation
      externalIds: ExternalIds
   }[]
   yt: YoutubeVideo[]
   album?: {
      name: Translation
      externalIds: Omit<ExternalIds, 'yt'>
   }
   genius?: never
   lastFM?: LastFM
   playingFromLink: string // https:// spotify/album/xxx, playlists/xxx
}

export type CurrentTrack = {
   title: string
   artists: {
      name: string
      href: string
   }[]
   thumbnailUrl: string | null
   playingFromPage: string // https:// spotify/album/xxx, playlists/xxx

   lastFM?: LastFM
   yt: YoutubeVideo[]
}

export function fromDBToCurrent(item: PlaylistItemWithRelations, playingFrom?: string): CurrentTrack {
   const t = item.track
   return {
      title: t.title,
      artists: t.artists.map((a) => ({
         name: a.name,
         href: a.spotifyId
            ? `https://open.spotify.com/artist/${a.spotifyId}`
            : `https://www.youtube.com/channel/${a.ytChannelId}`,
      })),
      thumbnailUrl: t.thumbnailUrl,
      playingFromPage: playingFrom ?? item.playlistId.toString(),
      yt: t.yt,
      lastFM: t.lastFM || undefined,
   }
}
// TODO крч lastFM дані краще не в об'єкті а на сторіні зберігати, тіпа мб та лан пох
// ну тіп фо ріл, через провайдер передавать якщо з бд плейлиста, а так то прост conditional rendering

export function fromSpotifyToCurrent(t: SimplifiedTrack | Track, playingFrom?: string): CurrentTrack {
   return {
      title: t.name,
      artists: t.artists.map((a) => ({
         name: a.name,
         href: `https://open.spotify.com/artist/${a.id}`,
      })),
      thumbnailUrl: 'album' in t && t.album && t.album.images && t.album.images[0]?.url ? t.album.images[0].url : null,
      playingFromPage: playingFrom ?? 'spotify/artist?id=' + t.artists[0].id,
      yt: [],
   }
}
