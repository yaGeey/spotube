export {}
declare global {
   namespace PrismaJson {
      export type SpotifyPlaylistItem = SpotifyApi.PlaylistTrackObject
      // export interface SpotifyPlaylistItemFull extends SpotifyPlaylistItem {
      //    track: Track | null
      // }

      // export type SpotifyPlaylistPage = {
      //    href: string
      //    limit: number
      //    next: string | null
      //    offset: number
      //    previous: string | null
      //    total: number
      //    items: SpotifyPlaylistItemFull[]
      // }

      // export type SpotifyPlaylistResponse = {
      //    collaborative: boolean
      //    description: string
      //    external_urls: ExternalUrls
      //    href: string
      //    id: string
      //    images: Image[]
      //    name: string
      //    owner: {
      //       external_urls: ExternalUrls
      //       href: string
      //       id: string
      //       type: string
      //       uri: string
      //       display_name: string
      //    }
      //    public: boolean
      //    snapshot_id: string
      //    tracks: SpotifyPlaylistPage
      //    type: string
      //    uri: string
      // }
   }
}
