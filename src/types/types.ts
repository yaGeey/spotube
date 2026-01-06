import { youtube_v3 } from 'googleapis'
import { YtPayload } from '@/electron/ipc/yt'

declare global {
   namespace PrismaJson {
      // YouTube
      export type YtFullResponse =
         | {
              type: 'searchResult'
              snippet: youtube_v3.Schema$SearchResultSnippet
           }
         | {
              type: 'playlistItem'
              snippet: youtube_v3.Schema$PlaylistItemSnippet
           }
      export type YtVideoStatistics = youtube_v3.Schema$VideoStatistics

      // Spotify
      export type SpotifyPlaylistItem = SpotifyApi.PlaylistTrackObject
   }
}

export type TrackCombined = {
   yt?: YtPayload[] | null
   spotify?: PrismaJson.SpotifyPlaylistItem | null
   ai?: PrismaJson.AiMusicData | null
}

export type Prettify<T> = {
   [K in keyof T]: T[K]
} & NonNullable<unknown>
