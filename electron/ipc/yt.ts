import { google, youtube_v3 } from 'googleapis'
import chalk from 'chalk'
import api, { logPrettyError } from '../lib/axios'
import { getFullLastFMInfo } from '../lib/lastfm'
import { parseISODurationToMs } from '@/src/utils/time'
import prisma from '../lib/prisma'
import { Prisma } from '@/generated/prisma/client'
const youtube = google.youtube({ version: 'v3', auth: import.meta.env.VITE_YT_API_KEY })

// TODO add pagination, maxResults is 50??
// TODO for playlist handle video privacy status

export type YtPayload = Prisma.YoutubeVideoGetPayload<{
   include: { lastFm: true }
}>
export type YtPayloadWithPlaylist = Prisma.YoutubePlaylistGetPayload<{
   include: { content: { include: { lastFm: true } } }
}>

export default function youtubeIpc(ipcMain: Electron.IpcMain, store: any) {
   ipcMain.handle(
      'get-yt-playlist',
      async (event, playlistId: string, maxResults: number = 5): Promise<YtPayloadWithPlaylist | undefined> => {
         try {
            // check cache
            const cached = await prisma.youtubePlaylist.findUnique({
               where: { id: playlistId },
               include: { content: { include: { lastFm: true } } },
            })
            if (cached) {
               console.log(chalk.green(`Cache hit for YT playlist ${playlistId}`))
               return cached
            }

            // fetch playlist metadata
            const playlistRes = await youtube.playlists.list({
               part: ['snippet'],
               id: [playlistId],
            })
            const playlist = playlistRes.data.items?.[0]
            if (!playlist) throw new Error('Playlist not found on YouTube')

            // create playlist entry if not exists
            const playlistPrisma = await prisma.youtubePlaylist.create({
               data: {
                  id: playlistId,
                  title: playlist.snippet?.title || 'Unknown Title',
                  owner: playlist.snippet?.channelTitle || 'Unknown Owner',
                  full_response: playlist,
               },
            })

            // fetch playlist content
            const res = await youtube.playlistItems.list({
               part: ['snippet'],
               playlistId,
               maxResults,
            })
            const data = (res.data.items || []).filter((item) => item.snippet?.resourceId?.videoId)

            // fetch video details
            const contentDetailsRes = await youtube.videos.list({
               part: ['contentDetails', 'statistics', 'snippet'],
               id: data.map((item) => item.snippet!.resourceId!.videoId!),
            })
            const content = (contentDetailsRes.data.items || []).filter((item) => item.id)
            const contentMap = new Map<string, youtube_v3.Schema$Video>(content.map((item) => [item.id!, item]))

            // TODO fetch and insert lastfm
            // const lastFMData = await getFullLastFMInfo(item.artist, query.track)
            // const lastFm = await prisma.lastFM.create({
            //    data: {
            //       artist: lastFMData.artist ?? undefined,
            //       track: lastFMData.track ?? undefined,
            //       album: lastFMData.album ?? undefined,
            //    },
            // })

            // insert youtube videos
            const operations = data.map((item) => {
               const videoId = item.snippet?.resourceId?.videoId
               if (!videoId || !item.snippet) return null

               const contentItem = contentMap.get(videoId)
               if (!contentItem) return null

               return prisma.youtubeVideo.upsert({
                  where: { id: videoId },
                  update: {
                     views: contentItem.statistics?.viewCount ? parseInt(contentItem.statistics.viewCount, 10) : 0,
                     statistics: contentItem.statistics,
                     youtubePlaylists: { connect: { id: playlistPrisma.id } },
                  },
                  create: {
                     id: videoId,
                     title: item.snippet.title ?? 'err',
                     artist: item.snippet.channelTitle ?? 'err',
                     duration_ms: parseISODurationToMs(contentItem.contentDetails?.duration || 'PT0S'),
                     published_at: contentItem.snippet?.publishedAt ? new Date(contentItem.snippet.publishedAt) : new Date(),
                     views: contentItem.statistics?.viewCount ? parseInt(contentItem.statistics.viewCount, 10) : 0,
                     thumbnail_url: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || '',
                     statistics: contentItem.statistics,
                     full_response: {
                        type: 'playlistItem',
                        snippet: item.snippet,
                     },

                     youtubePlaylists: { connect: { id: playlistPrisma.id } },
                  },
               })
            }).filter((op) => op !== null)
            await prisma.$transaction(operations)

            // return filled playlist
            const filledPlaylist = await prisma.youtubePlaylist.findUnique({
               where: { id: playlistId },
               include: { content: { include: { lastFm: true } } },
            })
            return filledPlaylist ?? undefined
         } catch (err: any) {
            logPrettyError(err)
         }
      }
   )

   ipcMain.handle(
      'yt-from-spotify',
      async (event, query: { artist: string; track: string }, spotifyId: string): Promise<YtPayload[] | undefined> => {
         try {
            // cache
            const cachedVideos = await prisma.youtubeVideo.findMany({
               where: { spotify_id: spotifyId },
               include: { lastFm: true },
            })
            if (cachedVideos.length > 0) {
               console.log(chalk.green(`Cache hit for ${query.artist} - ${query.track}`))
               return cachedVideos satisfies YtPayload[]
            }

            // fetch youtube
            const response = await youtube.search.list({
               part: ['snippet'],
               q: query.artist + ' ' + query.track,
               maxResults: 5,
               type: ['video'],
            })
            const data = (response.data.items || []).filter((item) => item.id?.videoId)

            const contentDetailsRes = await youtube.videos.list({
               part: ['contentDetails', 'statistics', 'snippet'],
               id: data.map((item) => item.id!.videoId!),
            })
            const content = contentDetailsRes.data.items || []
            const contentMap = new Map<string, youtube_v3.Schema$Video>(content.map((item) => [item.id!, item]))

            // fetch and insert lastfm
            const lastFMData = await getFullLastFMInfo(query.artist, query.track)
            const lastFm = await prisma.lastFM.create({
               data: {
                  artist: lastFMData.artist ?? undefined,
                  track: lastFMData.track ?? undefined,
                  album: lastFMData.album ?? undefined,
               },
            })

            // insert youtube videos
            const operations = data.map((item) => {
               const videoId = item.id?.videoId
               if (!videoId || !item.snippet) return null
               const content = contentMap.get(videoId)
               if (!content) return null

               return prisma.youtubeVideo.upsert({
                  where: { id: videoId },
                  update: {
                     views: content.statistics?.viewCount ? parseInt(content.statistics.viewCount, 10) : 0,
                     statistics: content.statistics,
                     spotifyTrack: { connect: { id: spotifyId } },
                     lastFm: { connect: { id: lastFm.id } },
                  },
                  create: {
                     id: videoId,
                     title: item.snippet.title ?? 'err',
                     artist: item.snippet.channelTitle ?? 'err',
                     duration_ms: parseISODurationToMs(content.contentDetails?.duration || 'PT0S'),
                     published_at: content.snippet?.publishedAt ? new Date(content.snippet.publishedAt) : new Date(),
                     views: content.statistics?.viewCount ? parseInt(content.statistics.viewCount, 10) : 0,
                     thumbnail_url: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || '',
                     statistics: content.statistics,
                     full_response: {
                        type: 'searchResult',
                        snippet: item.snippet,
                     },

                     spotifyTrack: { connect: { id: spotifyId } },
                     lastFm: { connect: { id: lastFm.id } },
                  },
                  include: { lastFm: true },
               })
            }).filter((op) => op !== null)

            const videos = await prisma.$transaction(operations)
            return videos satisfies YtPayload[]
         } catch (err: any) {
            logPrettyError(err)
         }
      }
   )
}