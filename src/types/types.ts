import type { VideoCompact } from 'youtubei'
import type Genius from 'genius-lyrics'

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
      // export type SpotifyPlaylistItem = SpotifyApi.PlaylistTrackObject
      export type SpotifyPlaylistItem = SpotifyApi.TrackObjectFull
      export type SpotifyPlaylist = SpotifyApi.SinglePlaylistResponse

      export type GeniusSong = Genius.Song
   }
}

// export type Prettify<T> = {
//    [K in keyof T]: T[K]
// } & NonNullable<unknown>
