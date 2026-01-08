import { google, youtube_v3 } from 'googleapis'
import chalk from 'chalk'
import api, { logPrettyError } from '../lib/axios'
import { getFullLastFMInfo } from '../lib/lastfm'
import { parseRelative } from '@/src/utils/time'
import prisma from '../lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import { Client, MusicClient } from 'youtubei'
const googleYoutube = google.youtube({ version: 'v3', auth: import.meta.env.VITE_YT_API_KEY })
const youtube = new Client()
// TODO for playlist handle video privacy status

export type YtPayload = Prisma.YoutubeVideoGetPayload<{
   include: { lastFm: true }
}>
export type YtPayloadWithPlaylist = Prisma.YoutubePlaylistGetPayload<{
   include: { content: { include: { lastFm: true } } }
}>

export default function youtubeScrapIpc(ipcMain: Electron.IpcMain) {
   ipcMain.handle('get-yt-playlist-scrap', async (event, playlistId: string): Promise<YtPayloadWithPlaylist | undefined> => {
      try {
         // check cache
         const cached = await prisma.youtubePlaylist.findUnique({
            where: { id: playlistId },
            include: { content: { include: { lastFm: true } } },
         })
         if (cached) return cached
         console.log(chalk.blue(`Fetching YT playlist ${playlistId}`))

         // scrap playlist videos
         const playlistData = await youtube.getPlaylist(playlistId)
         if (!playlistData) throw new Error('Playlist not found on YouTube')

         // fetch playlist metadata
         const playlistRes = await googleYoutube.playlists.list({
            part: ['snippet'],
            id: [playlistId],
         })
         const playlist = playlistRes.data.items?.[0]
         if (!playlist) throw new Error('Playlist not found on YouTube')

         // create playlist entry
         const playlistPrisma = await prisma.youtubePlaylist.create({
            data: {
               id: playlistId,
               title: playlist.snippet?.title || 'Unknown Title',
               owner: playlist.snippet?.channelTitle || 'Unknown Owner',
               full_response: playlist,
            },
         })

         if (Array.isArray(playlistData.videos)) throw new Error('Wrong playlist format')
         const data = [...playlistData.videos.items]
         // eslint-disable-next-line no-constant-condition
         while (true) {
            const newData = await playlistData.videos.next()
            if (newData.length === 0) break
            data.push(...newData)
         }

         // insert youtube videos
         const operations = data
            .map((v) => {
               console.log(v.channel?.id)
               return prisma.youtubeVideo.upsert({
                  where: { id: v.id },
                  update: {
                     views: v.viewCount ?? 0,
                     youtubePlaylists: { connect: { id: playlistPrisma.id } },
                  },
                  create: {
                     id: v.id,
                     title: v.title,
                     author: v.channel?.name ?? 'err',
                     author_id: v.channel?.id ?? 'err',
                     duration_ms: v.duration ? v.duration * 1000 : 0,
                     published_at: v.uploadDate ? parseRelative(v.uploadDate) : new Date(),
                     views: v.viewCount ?? 0,
                     thumbnail_url: v.thumbnails[0].url || '',

                     youtubePlaylists: { connect: { id: playlistPrisma.id } },
                  },
               })
            })
            .filter((op) => op !== null)
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
   })

   ipcMain.handle(
      'yt-from-spotify-scrap',
      async (event, query: { artist: string; track: string }, spotifyId: string): Promise<YtPayload[] | undefined> => {
         try {
            // cache
            const cachedVideos = await prisma.youtubeVideo.findMany({
               where: { spotify_id: spotifyId },
               include: { lastFm: true },
            })
            if (cachedVideos.length > 0) return cachedVideos satisfies YtPayload[]
            console.log(chalk.blue(`Searching for ${query.artist} - ${query.track}`))

            // fetch youtube
            const res = await youtube.search(`${query.artist} - ${query.track}`, {
               type: 'video',
            }) // 20 items
            const data = res.items

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
            const operations = data
               .map((v) => {
                  console.log(v.uploadDate)
                  return prisma.youtubeVideo.upsert({
                     where: { id: v.id },
                     update: {
                        views: v.viewCount ?? 0,
                        spotifyTrack: { connect: { id: spotifyId } },
                        lastFm: { connect: { id: lastFm.id } },
                     },
                     create: {
                        id: v.id,
                        title: v.title,
                        author: v.channel?.name ?? 'err',
                        author_id: v.channel?.id ?? 'err',
                        duration_ms: v.duration ? v.duration * 1000 : 0,
                        published_at: v.uploadDate ? parseRelative(v.uploadDate) : new Date(),
                        views: v.viewCount ?? 0,
                        thumbnail_url: v.thumbnails[0].url || '',

                        spotifyTrack: { connect: { id: spotifyId } },
                        lastFm: { connect: { id: lastFm.id } },
                     },
                     include: { lastFm: true },
                  })
               })
               .filter((op) => op !== null)
            const videos = await prisma.$transaction(operations)

            // update spotify track with default yt video
            if (videos[0]) {
               await prisma.spotifyTrack.update({
                  where: { id: spotifyId },
                  data: { default_yt_video_id: videos[0].id },
               })
            }
            return videos satisfies YtPayload[]
         } catch (err: any) {
            logPrettyError(err)
         }
      }
   )
}
