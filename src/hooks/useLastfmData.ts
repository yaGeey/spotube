import { useQueries, useQuery } from '@tanstack/react-query'
import { LastFMAlbum, LastFMArtist, LastFMTrack } from '../types/lastfm'

export default function useLastfmData({
   playlistId,
   data,
   enabled,
}: {
   playlistId: string
   data: {
      artist: string
      track: string
   }[]
   enabled: boolean
}) {
   const [lastfmTrack, lastfmArtist] = useQueries({
      queries: [
         {
            queryKey: ['lastfm-track', playlistId],
            queryFn: async (): Promise<(LastFMTrack | null)[]> => await window.ipcRenderer.invoke('get-lastfm-track', data),
            enabled,
         },
         {
            queryKey: ['lastfm-artist', playlistId],
            queryFn: async (): Promise<(LastFMArtist | null)[]> => await window.ipcRenderer.invoke('get-lastfm-artist', data),
            enabled,
         },
      ],
   })

   const lastfmAlbum = useQuery({
      queryKey: ['lastfm-album', playlistId],
      queryFn: async (): Promise<(LastFMAlbum | null)[]> => {
         const data = lastfmTrack.data || []
         return await window.ipcRenderer.invoke(
            'get-lastfm-album',
            data.map((item) => (item ? { artist: item.album.artist, album: item.album.title } : { artist: '', album: '' }))
         )
      },
      enabled: lastfmTrack.data !== undefined,
   })

   return [lastfmTrack.data || [], lastfmAlbum.data || [], lastfmArtist.data || []] as const
}
