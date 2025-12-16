import { google, youtube_v3 } from 'googleapis'
import chalk from 'chalk'
import api, { logPrettyError } from '../lib/axios'
import { DB, DBInput, DBYtResponse, NotParsed } from '@/src/types/types'
import { getLastfmInfoBatch } from '../lib/lastfm'
import { dbInsertLastfmInfo } from '../lib/db/db-lastfm'
import { dbInsertYtVideo, getYtPlaylistVideosByIDQuery, getYtVideoBySpotifyIDQuery } from '../lib/db/db-yt'
import { parseISODurationToMs } from '@/src/utils/time'
import { prisma } from '@/src/lib/prisma'
const youtube = google.youtube({ version: 'v3', auth: import.meta.env.VITE_YT_API_KEY })

export default function youtubeIpc(ipcMain: Electron.IpcMain, store: any) {
   ipcMain.handle('get-yt-playlist', async (event, playlistId: string, update: boolean = false, maxResults: number = 5) => {
      // check cache
      const cached: DB['youtube'][] = getYtPlaylistVideosByIDQuery.all(playlistId)
      if (cached.length > 0) {
         console.log(chalk.green('Cache hit for YouTube playlist', playlistId, cached.length, 'items'))
         return cached.map((item) => ({
            ...item,
            full_response: JSON.parse(item.full_response),
         }))
      }

      try {
         const response = await youtube.playlistItems.list({
            part: ['snippet'], // TODO statistics (youtube.videos.list)
            playlistId,
            maxResults,
         })

         const data = response.data.items || []
         const result = []

         for (const item of data) {
            if (!item.snippet?.resourceId?.videoId || !item.snippet) continue
            const resObj: DBInput['youtube'] = {
               id: item.snippet.resourceId?.videoId,
               spotify_id: null,
               lastfm_id: null,
               title: item.snippet.title ?? 'err',
               artist: item.snippet.videoOwnerChannelTitle ?? 'err',
               duration_ms: 0,
               full_response: {
                  type: 'playlistItem',
                  snippet: item.snippet,
               },
            }
            dbInsertYtVideo(resObj, playlistId)
            result.push(resObj)
         }
         return result
      } catch (err: any) {
         logPrettyError(err)
      }
   })

   ipcMain.handle('yt-test', async (event, videoId: string) => {
      const contentDetails = await youtube.videos.list({
         part: ['contentDetails', 'statistics'],
         id: [videoId],
      })
      return contentDetails.data.items
   })

   ipcMain.handle(
      'yt-from-spotify',
      async (event, query: { artist: string; track: string }, spotifyId: string): Promise<DBYtResponse[] | undefined> => {
         const cached: NotParsed<DBYtResponse>[] = getYtVideoBySpotifyIDQuery.all(spotifyId)
         if (cached.length > 0) {
            console.log('Cache hit for track', spotifyId)
            return cached.map((item) => ({
               ...item,
               full_response: JSON.parse(item.full_response),
               lastfm_track: item.lastfm_track ? JSON.parse(item.lastfm_track) : null,
               lastfm_album: item.lastfm_album ? JSON.parse(item.lastfm_album) : null,
               lastfm_artist: item.lastfm_artist ? JSON.parse(item.lastfm_artist) : null,
            })) as DBYtResponse[]
         }

         try {
            // fetch youtube
            const response = await youtube.search.list({
               part: ['snippet'],
               q: query.artist + ' ' + query.track,
               maxResults: 5,
               type: ['video'],
            })
            const data = (response.data.items || []).filter((item) => item.id && item.id.videoId)

            // TODO
            const contentDetailsRes = await youtube.videos.list({
               part: ['contentDetails', 'statistics'],
               id: data.map((item) => item.id!.videoId!),
            })
            const contentData = contentDetailsRes.data.items || []

            const result: DBYtResponse[] = []

            // lastfm - отримуємо дані
            const lastFmData = (await getLastfmInfoBatch([{ artist: query.artist, track: query.track }]))[0]

            // Перевіряємо чи є дані з LastFM, якщо ні - пропускаємо вставку
            let lastFmId: number | null = null
            if (lastFmData.track || lastFmData.album || lastFmData.artist) {
               lastFmId = dbInsertLastfmInfo({
                  track: lastFmData.track,
                  album: lastFmData.album,
                  artist: lastFmData.artist,
               })
            }

            // return
            for (const item of data) {
               if (!item.id || !item.id.videoId || !item.snippet) continue
               const content = contentData.find((vid) => vid.id === item.id?.videoId)
               const resObj: DBInput['youtube'] = {
                  id: item.id.videoId,
                  spotify_id: spotifyId,
                  lastfm_id: lastFmId,
                  title: item.snippet.title ?? 'err',
                  artist: item.snippet.channelTitle ?? 'err',
                  duration_ms: parseISODurationToMs(content?.contentDetails?.duration || 'PT0S'),
                  // statistics: content?.statistics,
                  full_response: {
                     type: 'searchResult',
                     snippet: item.snippet,
                  },
               }
               // const res = await prisma.youtube_videos.create({
               //    data: {
               //       id: resObj.id,
               //       spotify_id: resObj.spotify_id,
               //       lastfm_id: resObj.lastfm_id,
               //       title: resObj.title,
               //       artist: resObj.artist,
               //       duration_ms: resObj.duration_ms,
               //       full_response: resObj.full_response,
               //    },
               //    skipDuplicates: true,
               // })

               dbInsertYtVideo(resObj)
               result.push({
                  ...resObj,
                  lastfm_track: lastFmData.track,
                  lastfm_album: lastFmData.album,
                  lastfm_artist: lastFmData.artist,
               })
            }

            return result
         } catch (err: any) {
            logPrettyError(err)
         }
      }
   )

   //! Not used
   // ipcMain.handle('yt-from-spotify-batch', async (event, queries: string[]) => {
   //    try {
   //       const data = await Promise.all(
   //          queries.map(async (query) => {
   //             const res = await youtube.search.list({
   //                part: ['snippet'],
   //                q: query,
   //                maxResults: 5,
   //                type: ['video'],
   //             })
   //             return res.data.items || null
   //          })
   //       )
   //       return data
   //    } catch (err: any) {
   //       logPrettyError(err)
   //    }
   // })
}
