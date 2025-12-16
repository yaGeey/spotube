import { LastFMAlbum, LastFMArtist, LastFMTrack } from '@/src/types/lastfm'
import api from './axios'
// TODO Promise.allSettled

export async function getLastfmInfoBatch(params: { artist: string; track: string }[]) {
   const [trackAndAlbumData, artistData] = await Promise.all([
      getTrackAndAlbumBatch(params),
      getArtistBatch(params.map((p) => ({ artist: p.artist }))),
   ])
   return params.map((_, i) => ({
      track: trackAndAlbumData.track[i],
      album: trackAndAlbumData.album[i],
      artist: artistData[i],
   }))
}

async function getTrackAndAlbumBatch(params: { artist: string; track: string }[]) {
   const trackData = (await Promise.all(
      params.map(async (query) => {
         const { data } = await api.get('http://ws.audioscrobbler.com/2.0/', {
            params: {
               method: 'track.getInfo',
               api_key: import.meta.env.VITE_LASTFM_API_KEY,
               artist: query.artist,
               track: query.track,
               format: 'json',
            },
         })
         return data.track || null
      })
   )) as (LastFMTrack | null)[]

   const albumData = (await Promise.all(
      trackData.map(async (track) => {
         if (!track || !track.album) return null
         const { data } = await api.get('http://ws.audioscrobbler.com/2.0/', {
            params: {
               method: 'album.getInfo',
               api_key: import.meta.env.VITE_LASTFM_API_KEY,
               artist: track.album.artist,
               album: track.album.title,
               format: 'json',
            },
         })
         return data.album || null
      })
   )) as (LastFMAlbum | null)[]

   return {
      track: trackData,
      album: albumData,
   }
}

async function getArtistBatch(params: { artist: string }[]) {
   return (await Promise.all(
      params.map(async (query) => {
         const { data } = await api.get('http://ws.audioscrobbler.com/2.0/', {
            params: {
               method: 'artist.getInfo',
               api_key: import.meta.env.VITE_LASTFM_API_KEY,
               artist: query.artist,
               format: 'json',
            },
         })
         return data.artist || null
      })
   )) as (LastFMArtist | null)[]
}
