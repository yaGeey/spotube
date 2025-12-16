import { youtube_v3 } from 'googleapis'
import { LastFMAlbum, LastFMArtist, LastFMTrack } from './lastfm'
import { Playlist, PlaylistItem } from './spotify'

export type Track = {
   source: 'youtube' | 'spotify'
   id: string
   duration_ms: number
   title: string
   artists: string[]
}

export type MasterTrack = {
   ids: {
      isrc: string | null
      mbid: string | null
      uuid: string
      spotify: string | null
      youtube: string | null
   }
   yt: DBInput['youtube'][]
   spotify: {
      added_at: string
      playlist: {
         id: string
         name: string
         href: string
         uri: string
      }
      track: Track
   } | null
   lastfm: {
      track: LastFMTrack | null
      album: LastFMAlbum | null
      artist: LastFMArtist | null
   }
}

export type TrackCombined = {
   yt?: DBYtResponse[] | null
   spotify?: PlaylistItem | null
}

export type YtResponse =
   | {
        type: 'searchResult'
        snippet: youtube_v3.Schema$SearchResult['snippet']
     }
   | {
        type: 'playlistItem'
        snippet: youtube_v3.Schema$PlaylistItem['snippet']
     }

export type DBInput = {
   youtube: {
      id: string
      spotify_id: string | null
      lastfm_id: number | null
      title: string
      artist: string
      duration_ms: number
      full_response: YtResponse
   }
   spotify: {
      id: string
      title: string
      artist: string
      full_response: Record<string, any>
   }
   lastfm: {
      id: number
      track: LastFMTrack | null
      album: LastFMAlbum | null
      artist: LastFMArtist | null
   }
}

export type Prettify<T> = {
   [K in keyof T]: T[K]
} & {}

// Тип для результату з БД (full_response як string + lastfm поля)
export type DBYtResponse = Omit<DBInput['youtube'], 'lastfm_id'> & {
   lastfm_track: LastFMTrack | null
   lastfm_album: LastFMAlbum | null
   lastfm_artist: LastFMArtist | null
}
export type NotParsed<T> = {
   [K in keyof T]: T[K] extends Record<string, any> ? string : NonNullable<T[K]> extends Record<string, any> ? string | null : T[K]
}

export type DB = {
   [K in keyof DBInput]: {
      [P in keyof DBInput[K]]: DBInput[K][P] extends Record<string, any> ? string : DBInput[K][P]
   }
}
