import { youtube_v3 } from 'googleapis'
import type { VideoCompact } from 'youtubei'
import { SpotifyPlaylistResponse } from '@/electron/ipc/spotify'
import { SpotifyTrack } from '@/generated/prisma/client'
import { YtPayload } from '@/electron/routers/yt'

declare global {
   namespace PrismaJson {
      // YouTube
      // export type YtFullResponse =
      //    | {
      //         type: 'searchResult'
      //         snippet: youtube_v3.Schema$SearchResultSnippet
      //      }
      //    | {
      //         type: 'playlistItem'
      //         snippet: youtube_v3.Schema$PlaylistItemSnippet
      //      }
      // export type YtVideoStatistics = youtube_v3.Schema$VideoStatistics
      export type YtFullResponse = VideoCompact

      // Spotify
      export type SpotifyPlaylistItem = SpotifyApi.PlaylistTrackObject
   }
}

export type TrackCombined = (
   | {
        spotify: SpotifyTrack
        yt: YtPayload[] | null
     }
   | {
        yt: [YtPayload]
        spotify: null
     }
) & {
   ai?: PrismaJson.AiMusicData | null
}

// export type Prettify<T> = {
//    [K in keyof T]: T[K]
// } & NonNullable<unknown>
