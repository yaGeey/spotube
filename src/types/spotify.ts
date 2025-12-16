type ExternalUrls = {
   spotify: string
}

type Image = {
   height: number
   width: number
   url: string
}

export type Artist = {
   external_urls: ExternalUrls
   href: string
   id: string
   name: string
   type: 'artist'
   uri: string
}

export type Album = {
   album_type: 'single' | 'album' | 'compilation'
   artists: Artist[]
   available_markets: string[]
   external_urls: ExternalUrls
   href: string
   id: string
   images: Image[]
   is_playable: boolean
   name: string
   release_date: string
   release_date_precision: 'year' | 'month' | 'day'
   total_tracks: number
   type: 'album'
   uri: string
}

export type Track = {
   album: Album
   artists: Artist[]
   available_markets: string[]
   disc_number: number
   duration_ms: number
   explicit: boolean
   external_ids: {
      isrc: string // TODO важливо
   }
   external_urls: ExternalUrls
   href: string
   id: string
   is_local: boolean
   is_playable: boolean
   name: string
   popularity: number
   preview_url: string | null
   track_number: number
   type: 'track'
   uri: string
   images: Image[]
}
export type AlbumOmitted = Omit<Album, 'available_markets' | 'artists' | 'href' | 'id' | 'total_tracks' | 'uri' | 'is_playable'>
export type ArtistOmitted = Omit<Artist, 'id' | 'type' | 'uri'>
export type TrackOmitted = {
   album: AlbumOmitted
   artists: ArtistOmitted[]
   duration_ms: number
   external_urls: ExternalUrls
   name: string
   popularity: number
   uri: string
}

export type Playlist = {
   collaborative: boolean
   description: string
   external_urls: {
      spotify: string
   }
   followers: {
      href: string | null
      total: number
   }
   href: string
   id: string
   images: any[]
   name: string
   owner: {
      href: string
      id: string
   }
   primary_color: string | null
   public: boolean
   snapshot_id: string
   tracks: {
      href: string
      items: Track[]
      limit: number
      next: string | null
      offset: number
      previous: string | null
      total: number
   }
   type: string
   uri: string
}

export type PlaylistItem = {
   added_at: string
   added_by: {
      external_urls: ExternalUrls
      href: string
      id: string
      type: string
      uri: string
   }
   is_local: boolean
   primary_color: string | null
   track: Track
   video_thumbnail: {
      url: string
   }
}

export type PlaylistPage = {
   href: string
   items: PlaylistItem[]
   limit: number
   next: string | null
   offset: number
   previous: string | null
   total: number
}

export type SpotifyError = {
   error: {
      status: number
      message: string
   }
}

export type SpotifyAuthResponse = {
   access_token: string
   expires_in: number
   token_type: string
   refresh_token?: string
}

export type MasterTrack = {
   id: {
      // id: { type: 'isrc'; isrc: string } | { type: 'uuid'; uuid: string }
      isrc: string | null
      mbid: string | null
      uuid: string | null
      spotify: string | null
      youtube: string | null
   }
   // spotify
   added_at: string
   album: Album
   artists: Artist[]

   // lastfm
   tags: {
      name: string
      url: string
   }
}
