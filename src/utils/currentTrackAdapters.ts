import { TrackWithRelations } from '@/electron/lib/prisma'
import { YoutubeVideo, LastFM, PlaylistOrigin } from '@/generated/prisma/client'
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

export type ViewTrackModel = {
   title: string
   url: string
   artists: {
      id: string
      source: PlaylistOrigin
      name: string
      url: string
      lastFM: PrismaJson.LastFMArtist | null
   }[]
   thumbnailUrl: string | null
   playingFromPage: string // https:// spotify/album/xxx, playlists/xxx

   album: {
      id: string
      name: string
      url: string
      releaseDate: string
   } | null

   lastFM: Omit<LastFM, 'artist'> | null
   defaultYtVideoId: string | null
   yt: YoutubeVideo[]
} & (
   | {
        source: 'LOCAL'
        id: number
     }
   | {
        source: 'SPOTIFY'
        id: string
     }
)
export type PossiblyConvertibleTypes = SimplifiedTrack | Track | TrackWithRelations

export function fromDBToCurrent(item: TrackWithRelations, playingFrom?: string): ViewTrackModel {
   const t = item
   return {
      source: 'LOCAL',
      id: t.id,
      title: t.title,
      url: t.spotify
         ? `https://open.spotify.com/track/${t.spotify.id}`
         : `https://www.youtube.com/channel/${t.defaultYtVideoId ? t.yt.find((v) => v.id === t.defaultYtVideoId) : t.yt[0]?.id}`,
      artists: t.artists.map((a) => ({
         id: a.spotifyId || a.ytChannelId,
         source: a.spotifyId ? 'SPOTIFY' : 'YOUTUBE',
         name: a.name,
         url: a.spotifyId ? `https://open.spotify.com/artist/${a.spotifyId}` : `https://www.youtube.com/channel/${a.ytChannelId}`,
         lastFM: a.lastFM,
      })),
      thumbnailUrl: t.thumbnailUrl,
      playingFromPage: playingFrom ?? '/',

      album: t.spotify
         ? {
              id: t.spotify.fullResponse.album.id,
              name: t.spotify.fullResponse.album.name,
              url: `https://open.spotify.com/album/${t.spotify.fullResponse.album.id}`,
              releaseDate: t.spotify.fullResponse.album.release_date,
           }
         : null,

      defaultYtVideoId: t.defaultYtVideoId,
      yt: t.yt,
      lastFM: t.lastFM,
   }
}
// TODO крч lastFM дані краще не в об'єкті а на сторіні зберігати, тіпа мб та лан пох
// ну тіп фо ріл, через провайдер передавать якщо з бд плейлиста, а так то прост conditional rendering

export function fromSpotifyToCurrent(t: SimplifiedTrack | Track, playingFrom?: string): ViewTrackModel {
   return {
      id: t.id,
      source: 'SPOTIFY',
      title: t.name,
      url: `https://open.spotify.com/track/${t.id}`,
      artists: t.artists.map((a) => ({
         id: a.id,
         source: 'SPOTIFY',
         name: a.name,
         url: `https://open.spotify.com/artist/${a.id}`,
         lastFM: null,
      })),
      thumbnailUrl: 'album' in t && t.album && t.album.images && t.album.images[0]?.url ? t.album.images[0].url : null,
      playingFromPage: playingFrom ?? 'spotify/artist?id=' + t.artists[0].id,
      album:
         'album' in t && t.album
            ? {
                 id: t.album.id,
                 name: t.album.name,
                 url: `https://open.spotify.com/album/${t.album.id}`,
                 releaseDate: t.album.release_date,
              }
            : null,
      yt: [],
      lastFM: null,
      defaultYtVideoId: null,
   }
}
