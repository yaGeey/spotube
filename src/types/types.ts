import { youtube_v3 } from 'googleapis'
import { YtPayload } from '@/electron/ipc/yt'

declare global {
   namespace PrismaJson {
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
   }
}

export type Track = {
   source: 'youtube' | 'spotify'
   id: string
   duration_ms: number
   title: string
   artists: string[]
}

export type TrackCombined = {
   yt?: YtPayload[] | null
   spotify?: PrismaJson.SpotifyPlaylistItem | null
}

export type Prettify<T> = {
   [K in keyof T]: T[K]
} & NonNullable<unknown>
