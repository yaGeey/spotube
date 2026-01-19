import { LastFM } from '@/generated/prisma/client'
import api, { logPrettyError } from './axios'
import prisma from './prisma'

export async function getLastFMTrack(artist: string, track: string): Promise<PrismaJson.LastFMTrack | null> {
   const { data } = await api.get<{ track: PrismaJson.LastFMTrack }>('http://ws.audioscrobbler.com/2.0/', {
      params: {
         method: 'track.getInfo',
         api_key: import.meta.env.VITE_LASTFM_API_KEY,
         artist,
         track,
         format: 'json',
      },
   })
   if (data.track.wiki?.content) {
      data.track.wiki.content = data.track.wiki.content.split('<a')[0]
   }
   return data.track || null
}

export async function getLastFMAlbum(artist: string, album: string): Promise<PrismaJson.LastFMAlbum | null> {
   const { data } = await api.get<{ album: PrismaJson.LastFMAlbum }>('http://ws.audioscrobbler.com/2.0/', {
      params: {
         method: 'album.getInfo',
         api_key: import.meta.env.VITE_LASTFM_API_KEY,
         artist,
         album,
         format: 'json',
      },
   })
   if (data.album.wiki?.content) {
      data.album.wiki.content = data.album.wiki.content.split('<a')[0]
   }
   return data.album || null
}

export async function getLastFMArtist(artist: string): Promise<PrismaJson.LastFMArtist | null> {
   const { data } = await api.get<{artist: PrismaJson.LastFMArtist}>('http://ws.audioscrobbler.com/2.0/', {
      params: {
         method: 'artist.getInfo',
         api_key: import.meta.env.VITE_LASTFM_API_KEY,
         artist,
         format: 'json',
      },
   })
   if (data.artist.bio?.content) {
      data.artist.bio.content = data.artist.bio.content.split('<a')[0]
   }
   return data.artist || null
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
   // check if already exists
   const existing = await prisma.lastFM.findUnique({
      where: { masterTrackId: masterId },
   })
   if (existing) return existing

   // fetch
   const trackData = await getLastFMTrack(artist, title)
   const artistData = await getLastFMArtist(artist)
   const albumData = trackData?.album?.title ? await getLastFMAlbum(artist, trackData.album.title) : null

   // create entry
   let lastFm: null | LastFM = null
   if (trackData || artistData || albumData) {
      lastFm = await prisma.lastFM.create({
         data: {
            track: trackData ?? undefined,
            artist: artistData ?? undefined,
            album: albumData ?? undefined,
            masterTrack: { connect: { id: masterId } },
         },
      })

      // TODO update Artist object
   }

   return lastFm
}
