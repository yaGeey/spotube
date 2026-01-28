import type { VideoCompact } from 'youtubei'
import type Genius from 'genius-lyrics'
import type { youtube_v3 } from 'googleapis'

declare global {
   namespace PrismaJson {
      // YouTube
      export type YtFullResponse = VideoCompact
      export type YtPlaylistMetadata = youtube_v3.Schema$Playlist

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
