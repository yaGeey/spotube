import { youtube_v3 } from 'googleapis'
import { YtPayload } from '@/electron/ipc/yt'
import type { VideoCompact } from 'youtubei'
import { SpotifyPlaylistResponse } from '@/electron/ipc/spotify'
import { SpotifyTrack } from '@/generated/prisma/client'

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

export type TrackCombined = {
   yt?: YtPayload[] | null
   spotify?: SpotifyTrack | null
   ai?: PrismaJson.AiMusicData | null
}

export type Prettify<T> = {
   [K in keyof T]: T[K]
} & NonNullable<unknown>
