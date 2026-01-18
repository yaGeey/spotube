import { LastFM } from '@/generated/prisma/client'
import api, { logPrettyError } from './axios'
import prisma from './prisma'

async function getLastFMTrack(artist: string, track: string): Promise<PrismaJson.LastFMTrack | null> {
   const { data } = await api.get('http://ws.audioscrobbler.com/2.0/', {
      params: {
         method: 'track.getInfo',
         api_key: import.meta.env.VITE_LASTFM_API_KEY,
         artist,
         track,
         format: 'json',
      },
   })
   return data.track || null
}

async function getLastFMAlbum(artist: string, album: string): Promise<PrismaJson.LastFMAlbum | null> {
   const { data } = await api.get('http://ws.audioscrobbler.com/2.0/', {
      params: {
         method: 'album.getInfo',
         api_key: import.meta.env.VITE_LASTFM_API_KEY,
         artist,
         album,
         format: 'json',
      },
   })
   return data.album || null
}

async function getLastFMArtist(artist: string): Promise<PrismaJson.LastFMArtist | null> {
   const { data } = await api.get('http://ws.audioscrobbler.com/2.0/', {
      params: {
         method: 'artist.getInfo',
         api_key: import.meta.env.VITE_LASTFM_API_KEY,
         artist,
         format: 'json',
      },
   })
   return data.artist || null
}

export async function getFullLastFMInfo(artist: string, track: string): Promise<Omit<LastFM, 'id'>> {
   try {
      const trackData = await getLastFMTrack(artist, track)
      const artistData = await getLastFMArtist(artist)
      const albumData = trackData?.album?.title ? await getLastFMAlbum(artist, trackData.album.title) : null
      return { track: trackData, artist: artistData, album: albumData }
   } catch (error) {
      logPrettyError(error)
      return { track: null, artist: null, album: null }
   }
}

export async function upsertLastFMEntry({
   artist,
   title,
   masterId,
}: {
   artist: string
   title: string
   masterId: number
}): Promise<LastFM | null> {
   const trackData = await getLastFMTrack(artist, title)
   const artistData = await getLastFMArtist(artist)
   const albumData = trackData?.album?.title ? await getLastFMAlbum(artist, trackData.album.title) : null

   let lastFm: null | LastFM = null
   if (trackData || artistData || albumData)
      lastFm = await prisma.lastFM.upsert({
         where: { masterTrackId: masterId },
         update: {},
         create: {
            track: trackData ?? undefined,
            artist: artistData ?? undefined,
            album: albumData ?? undefined,
            masterTrack: { connect: { id: masterId } },
         },
      })
   return lastFm
}
