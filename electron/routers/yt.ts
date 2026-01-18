import { publicProcedure, router } from '../trpc'
import { google, youtube_v3 } from 'googleapis'
import chalk from 'chalk'
import api, { logPrettyError } from '../lib/axios'
import { getFullLastFMInfo } from '../lib/lastfm'
import { parseRelative } from '@/src/utils/time'
import prisma, { playlistWithDeepRelations, PlaylistWithItems, TrackWithRelations, trackWithRelations } from '../lib/prisma'
import { LastFM, MasterTrack, Prisma } from '@/generated/prisma/client'
import { Client, MusicClient } from 'youtubei'
import z from 'zod'
import pLimit from 'p-limit'
import pRetry from 'p-retry'
import { extractTrackInfo, extractTrackInfoStrict } from '@/utils/videoTitle'
import { extractArtistsAndTitle } from '../lib/ai'
import Innertube, { UniversalCache, ClientType, Platform, Types } from 'youtubei.js'
const limit = pLimit(2)

const googleYoutube = google.youtube({ version: 'v3', auth: import.meta.env.VITE_YT_API_KEY })
const youtube = new Client({})

Platform.shim.eval = async (data: Types.BuildScriptResult, env: Record<string, Types.VMPrimative>) => {
   const properties = []

   if (env.n) {
      properties.push(`n: exportedVars.nFunction("${env.n}")`)
   }

   if (env.sig) {
      properties.push(`sig: exportedVars.sigFunction("${env.sig}")`)
   }

   const code = `${data.output}\nreturn { ${properties.join(', ')} }`

   return new Function(code)()
}

let yt: Innertube | null = null
async function getYtInstance() {
   if (yt) return yt
   yt = await Innertube.create({
      cache: new UniversalCache(false),
      generate_session_locally: true,
      client_type: ClientType.WEB,
      // cookie:
      // 'GPS=1; YSC=XOfSgV-o1Vw; VISITOR_INFO1_LIVE=ci3IyeBuoyc; VISITOR_PRIVACY_METADATA=CgJVQRIEGgAgWQ%3D%3D; PREF=f4=4000000&f6=40000000&tz=Europe.Kiev; __Secure-YNID=15.YT=UlEAdprS-KHKxsdyA4t2-I9rUl0mGjEy2-CHTk5lDc90h27wEDpTy5OB5r-e2YhKNFd47b03YV6TQrSnkW-7B63g5NfnXOpWCHkASa_I-Cq_IGce6BCHmUgZY1Ni_f88VzYCfonUtMyYxFYm-AcUNl_owQUZYmiKPKaV8IaDUCiQuSWUlmcMMGZLNIOajjDp6J7mhKbp2a14xfJBtfYZzG_x8ykObGrZDdpyLD2H1nW_XKz4pINQMTZQSLF5W_q8NeznfSQam6uuH_ppK_TeA0H_r0A_ckSDnIZocsmiLeQihnL8W4Uvp40PK9_9WbArSu6jRz47y86ldUUlo5opiw; __Secure-ROLLOUT_TOKEN=CIS30vnF_cavLxCdjbuevYySAxiLtfuevYySAw%3D%3D; __Secure-1PSIDTS=sidts-CjUB7I_69LLHVd6opA7qhCn9qcdsnQC-hkl14-omSKTTYmnjq3wMIBBjkrCd-jKkpSBe75otPxAA; __Secure-3PSIDTS=sidts-CjUB7I_69LLHVd6opA7qhCn9qcdsnQC-hkl14-omSKTTYmnjq3wMIBBjkrCd-jKkpSBe75otPxAA; HSID=AdhGHc4UdvbZt2xW2; SSID=A28Vg5boJyEZQJyeF; APISID=ZplZXlMQOljzN2mH/AvblgYbbRQxAPhlvq; SAPISID=UPm4cqSR0g1DeZmW/Ad2YuPPu24ndhd9m_; __Secure-1PAPISID=UPm4cqSR0g1DeZmW/Ad2YuPPu24ndhd9m_; __Secure-3PAPISID=UPm4cqSR0g1DeZmW/Ad2YuPPu24ndhd9m_; SID=g.a0005wgBE61-6vgXQQpe-DHdYsNE8HHxiajuvJgJE7EvrL3w-_nVDxAXdgPXgZag75jlBaFk_wACgYKAbUSARQSFQHGX2MiukEvjDKA9fz-ULLDo4a49xoVAUF8yKqpvBK7yWSbvPXCTK_okN0j0076; __Secure-1PSID=g.a0005wgBE61-6vgXQQpe-DHdYsNE8HHxiajuvJgJE7EvrL3w-_nV-pN8ST06-lXA_GAabMBT7QACgYKAT4SARQSFQHGX2MiOGn_KIE6Oe2VopLkFxwPvhoVAUF8yKoZ_CzGXMzJpWX87BoBurwn0076; __Secure-3PSID=g.a0005wgBE61-6vgXQQpe-DHdYsNE8HHxiajuvJgJE7EvrL3w-_nVCRb0QsaLy0l8iubNEdj7hwACgYKAcISARQSFQHGX2MigzsCEd9PzB0QtPdNLaCiqRoVAUF8yKpTO-aSPttirGLjFF604PNN0076; LOGIN_INFO=AFmmF2swRQIgVvKRHeKMu59AlfzyPl_SDvNrF21PtCoWNfX5qNFMGhoCIQCHGeEC1yaool2X2wfyZsq8O8um5wEM3RbiktQQwrGjQg:QUQ3MjNmeWtKREFWRk9tVVdsU2IzTkpiYWsxWUtDWmJTYUhud21mQmcxSnUwUDhwY3lUY1hzZG5LSi1SY0pQM250STVyTEtCcDVhN0NzdFVTRVRkTEEzaGNra29leUFvZ1hORUdaamFhNkVmbi1tS2dNMEJZdTE1LXQ4WUJ5bTFvVHhHSDdXMXphNlpTS19uVmQxLXhNZDZaTEdYMmlIOHJB; ST-l3hjtt=session_logininfo=AFmmF2swRQIgVvKRHeKMu59AlfzyPl_SDvNrF21PtCoWNfX5qNFMGhoCIQCHGeEC1yaool2X2wfyZsq8O8um5wEM3RbiktQQwrGjQg%3AQUQ3MjNmeWtKREFWRk9tVVdsU2IzTkpiYWsxWUtDWmJTYUhud21mQmcxSnUwUDhwY3lUY1hzZG5LSi1SY0pQM250STVyTEtCcDVhN0NzdFVTRVRkTEEzaGNra29leUFvZ1hORUdaamFhNkVmbi1tS2dNMEJZdTE1LXQ4WUJ5bTFvVHhHSDdXMXphNlpTS19uVmQxLXhNZDZaTEdYMmlIOHJB; ST-tladcw=session_logininfo=AFmmF2swRQIgVvKRHeKMu59AlfzyPl_SDvNrF21PtCoWNfX5qNFMGhoCIQCHGeEC1yaool2X2wfyZsq8O8um5wEM3RbiktQQwrGjQg%3AQUQ3MjNmeWtKREFWRk9tVVdsU2IzTkpiYWsxWUtDWmJTYUhud21mQmcxSnUwUDhwY3lUY1hzZG5LSi1SY0pQM250STVyTEtCcDVhN0NzdFVTRVRkTEEzaGNra29leUFvZ1hORUdaamFhNkVmbi1tS2dNMEJZdTE1LXQ4WUJ5bTFvVHhHSDdXMXphNlpTS19uVmQxLXhNZDZaTEdYMmlIOHJB; ST-3opvp5=session_logininfo=AFmmF2swRQIgVvKRHeKMu59AlfzyPl_SDvNrF21PtCoWNfX5qNFMGhoCIQCHGeEC1yaool2X2wfyZsq8O8um5wEM3RbiktQQwrGjQg%3AQUQ3MjNmeWtKREFWRk9tVVdsU2IzTkpiYWsxWUtDWmJTYUhud21mQmcxSnUwUDhwY3lUY1hzZG5LSi1SY0pQM250STVyTEtCcDVhN0NzdFVTRVRkTEEzaGNra29leUFvZ1hORUdaamFhNkVmbi1tS2dNMEJZdTE1LXQ4WUJ5bTFvVHhHSDdXMXphNlpTS19uVmQxLXhNZDZaTEdYMmlIOHJB; SIDCC=AKEyXzUNAOEnRM4N56fki7Kd7cYyrfKyUrGxbHmI2qndCv7iKS-oXxribJztC5MUvQG3lftaZA; __Secure-1PSIDCC=AKEyXzV3n01qoR7UJLEZOC1xA-MPZulcZ1xFlQmq7g99KEjO3l1KRFEPrl8mivqVtyEc0dyzlg; __Secure-3PSIDCC=AKEyXzU373YQCVjAn3xVUHlb5uERMVit5bNrpL_c3xP3lM-682dvk_qre-RF-faIxWjLsxC3-g; ST-xuwub9=session_logininfo=AFmmF2swRQIgVvKRHeKMu59AlfzyPl_SDvNrF21PtCoWNfX5qNFMGhoCIQCHGeEC1yaool2X2wfyZsq8O8um5wEM3RbiktQQwrGjQg%3AQUQ3MjNmeWtKREFWRk9tVVdsU2IzTkpiYWsxWUtDWmJTYUhud21mQmcxSnUwUDhwY3lUY1hzZG5LSi1SY0pQM250STVyTEtCcDVhN0NzdFVTRVRkTEEzaGNra29leUFvZ1hORUdaamFhNkVmbi1tS2dNMEJZdTE1LXQ4WUJ5bTFvVHhHSDdXMXphNlpTS19uVmQxLXhNZDZaTEdYMmlIOHJB',
   })
   return yt
}

export const youtubeRouter = router({
   test: publicProcedure.mutation(async () => {
      const playlistId = 'PLnYVx6d3vk609QDKMgBE52tDqP7fRi1pE'

      // scrap playlist videos
      const playlistData = await youtube.getPlaylist(playlistId)
      if (!playlistData) throw new Error('Playlist not found on YouTube')
      if (Array.isArray(playlistData.videos)) throw new Error('Wrong playlist format')

      // fetch playlist metadata
      const playlistRes = await googleYoutube.playlists.list({
         part: ['snippet'],
         id: [playlistId],
      })
      const playlist = playlistRes.data.items?.[0]
      if (!playlist) throw new Error('Playlist not found on YouTube')
      console.log(chalk.green(`Fetched metadata for playlist ${playlistId}`))

      // get all videos
      const videos = [...playlistData.videos.items]
      // eslint-disable-next-line no-constant-condition
      while (true) {
         const newData = await playlistData.videos.next()
         if (newData.length === 0) break
         videos.push(...newData)
      }
      console.log(chalk.green(`Fetched ${videos.length} videos from playlist ${playlistId}`))

      const videoDataParsed = await extractArtistsAndTitle({
         data: videos.map((v) => ({ author: v.channel?.name || 'Unknown Author', title: v.title })),
      })
      if (videoDataParsed.length !== videos.length) throw new Error('AI returned different number of items than input videos')
      return videoDataParsed
   }),

   upsertPlaylistWithTracks: publicProcedure
      .input(z.string())
      .mutation(async ({ input: playlistId }): Promise<PlaylistWithItems> => {
         // check cache
         const cached = await prisma.playlist.findUnique({
            where: { youtubeMetadataId: playlistId },
            include: playlistWithDeepRelations,
         })
         if (cached) return cached
         console.log(chalk.blue(`Fetching YT playlist ${playlistId}`))

         // scrap playlist videos
         const playlistData = await youtube.getPlaylist(playlistId)
         if (!playlistData) throw new Error('Playlist not found on YouTube')
         if (Array.isArray(playlistData.videos)) throw new Error('Wrong playlist format')

         // fetch playlist metadata
         const playlistRes = await googleYoutube.playlists.list({
            part: ['snippet'],
            id: [playlistId],
         })
         const playlist = playlistRes.data.items?.[0]
         if (!playlist) throw new Error('Playlist not found on YouTube')
         console.log(chalk.green(`Fetched metadata for playlist ${playlistId}`))

         // create playlist in db
         const playlistPrisma = await prisma.playlist.create({
            data: {
               title: playlist.snippet?.title || 'Unknown Title',
               description: playlist.snippet?.description,
               origin: 'YOUTUBE',
               thumbnailUrl: playlist.snippet?.thumbnails?.high?.url,
               url: 'https://www.youtube.com/playlist?list=' + playlistId,
               youtubeMetadata: {
                  create: {
                     id: playlistId,
                     fullResponse: playlist,
                  },
               },
            },
         })

         // get all videos
         const videos = [...playlistData.videos.items]
         // eslint-disable-next-line no-constant-condition
         while (true) {
            const newData = await playlistData.videos.next()
            if (newData.length === 0) break
            videos.push(...newData)
         }
         console.log(chalk.green(`Fetched ${videos.length} videos from playlist ${playlistId}`))

         // check for existing master tracks to avoid duplicates
         const existingMasterTracks = await prisma.masterTrack.findMany({
            where: {
               yt: {
                  // 1. Усі відео в масиві повинні мати цей ID.
                  // Оскільки ID унікальні, це можливо тільки якщо відео там одне.
                  every: {
                     id: { in: videos.map((v) => v.id) },
                  },
                  // 2. Гарантуємо, що масив не порожній (бо 'every' повертає true для порожніх масивів)
                  some: {
                     id: { in: videos.map((v) => v.id) },
                  },
               },
            },
            include: { yt: true },
         })
         // yt video id -> master track
         const existingMasterTrackMap = new Map(existingMasterTracks.map((t) => [t.yt[0].id, t.id]))

         // use AI to extract titles and artists
         let videoDataParsed = await extractArtistsAndTitle({
            data: videos.map((v) => ({ author: v.channel?.name || 'Unknown Author', title: v.title })),
         })
         if (videoDataParsed.length !== videos.length) {
            console.error(chalk.red('AI returned different number of items than input videos. Skipping AI metadata.'))
            videoDataParsed = videos.map((v) => ({
               artists: [{ latinName: v.channel?.name || 'Unknown Artist', originalName: null }],
               title: { latin: v.title, original: null },
               script: null,
            }))
         } else console.log(chalk.green(`AI metadata extraction for ${videoDataParsed.length} completed`))

         // add videos to db
         const operations = videos
            .map((v, index) => {
               const existingMasterTrackId = existingMasterTrackMap.get(v.id)
               if (existingMasterTrackId) {
                  // if master track exists, just create playlist item and connect
                  return prisma.playlistItem.create({
                     data: {
                        playlist: { connect: { id: playlistPrisma.id } },
                        track: { connect: { id: existingMasterTrackId } },
                        position: index,
                     },
                  })
               }

               // else create full master track with relations
               const { title, artists, script } = videoDataParsed[index]
               return prisma.masterTrack.create({
                  data: {
                     title: title.original || title.latin,
                     artists:
                        artists?.map((a) => a.originalName || a.latinName).join(', ') || v.channel?.name || 'Unknown Artist',

                     titleLatin: title.latin,
                     artistsLatin: artists?.map((a) => a.latinName).join(', ') || v.channel?.name || 'Unknown Artist',
                     script,

                     thumbnailUrl: v.thumbnails[0]?.url,
                     playlistItems: {
                        create: {
                           playlistId: playlistPrisma.id,
                           position: index, // TODO: set correct position
                        },
                     },
                     yt: {
                        connectOrCreate: {
                           where: { id: v.id },
                           create: {
                              id: v.id,
                              title: v.title,
                              author: v.channel?.name ?? 'Unknown Author',
                              duration: v.duration || 0,
                              views: v.viewCount || 0,
                              publishedAt: v.uploadDate ? parseRelative(v.uploadDate) : new Date(),
                              thumbnailUrl: v.thumbnails[0]?.url || '',
                           },
                        },
                     },
                  },
               })
            })
            .filter((op) => op !== null)
         await prisma.$transaction(operations)

         // return filled playlist
         const filledPlaylist = await prisma.playlist.findUnique({
            where: { id: playlistPrisma.id },
            include: playlistWithDeepRelations,
         })
         if (!filledPlaylist) throw new Error('Failed to fetch filled playlist from DB')

         return filledPlaylist
      }),

   //
   addVideosToMasterFromSpotifyBatch: publicProcedure
      .input(z.array(z.object({ query: z.object({ artist: z.string(), title: z.string() }), masterId: z.number() })))
      .mutation(async ({ input }): Promise<TrackWithRelations[]> => {
         console.log(chalk.blue(`Adding videos to ${input.length} master tracks from YouTube based on Spotify data`))
         const results = await Promise.all(
            input.map(async (item) =>
               limit(async () =>
                  pRetry(
                     async () => {
                        const qString = `${item.query.artist} - ${item.query.title}`
                        const masterTrack = await searchAndAddVideoToMaster({ qString, masterTrackId: item.masterId })

                        await new Promise((res) => setTimeout(res, 500 + Math.random() * 500)) // slight delay to avoid rate limits
                        return masterTrack
                     },
                     {
                        retries: 3,
                        onFailedAttempt: (error) => {
                           console.log(
                              chalk.red(`Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`)
                           )
                        },
                     }
                  )
               )
            )
         )
         return results.filter((r) => r !== null)
      }),

   //
   upsertVideosToMasterFromSpotify: publicProcedure
      .input(
         z.object({
            artist: z.string(),
            title: z.string(),
            masterId: z.number(),
            refetch: z.boolean().optional().default(false),
         })
      )
      .mutation(async ({ input: item }) => {
         // check for cache
         const existing = await prisma.masterTrack.findUnique({
            where: { id: item.masterId },
            include: trackWithRelations,
         })
         if (existing && existing.yt.length > 0 && !item.refetch) return existing
         console.log(chalk.blue(`Adding videos to master track ${item.masterId} from YouTube based on Spotify data`))

         const qString = `${item.artist} - ${item.title}`
         return await searchAndAddVideoToMaster({ qString, masterTrackId: item.masterId })
      }),

   //
   deletePlaylist: publicProcedure.input(z.string()).mutation(async ({ input: youtubeMetadataId }) => {
      return await prisma.$transaction(async (tx) => {
         const playlist = await tx.playlist.findUniqueOrThrow({
            where: { youtubeMetadataId },
         })

         const tracksToDelete = await tx.masterTrack.findMany({
            where: {
               playlistItems: {
                  every: { playlistId: playlist.id },
                  some: { playlistId: playlist.id },
               },
            },
         })

         // delete YoutubePlaylist -> Playlist -> PlaylistItem
         await tx.youtubePlaylist.deleteMany({
            where: { id: youtubeMetadataId },
         })

         // delete MasterTracks
         if (!tracksToDelete.length) return
         await tx.masterTrack.deleteMany({
            where: {
               id: { in: tracksToDelete.map((t) => t.id) },
            },
         })
      })
   }),

   getAudioStream: publicProcedure.input(z.string()).mutation(async ({ input: videoId }) => {
      const yt = await getYtInstance()
      const info = await yt.getInfo(videoId)

      const format = info.chooseFormat({
         type: 'video+audio',
         quality: 'best',
      })

      if (!format) {
         throw new Error('Формат не знайдено')
      }

      console.dir(format, { depth: null })
      let streamUrl = format.url

      if (!streamUrl) {
         streamUrl = await format.decipher(yt.session.player)
      }

      console.log('Direct Stream URL:', streamUrl)

      return {
         url: streamUrl,
         title: info.basic_info.title,
         duration: info.basic_info.duration, // Може бути 0 для стрімів
         thumbnail: info.basic_info.thumbnail?.[0]?.url,
      }
   }),
})

async function searchAndAddVideoToMaster({ qString, masterTrackId }: { qString: string; masterTrackId: number }) {
   // fetch youtube
   const res = await youtube.search(qString, {
      type: 'video',
   }) // 20 items
   const videos = res.items
   if (videos.length === 0) return null

   // upsert master track with youtube video relation
   const masterTrack = await prisma.masterTrack.update({
      where: { id: masterTrackId },
      data: {
         yt: {
            connectOrCreate: videos.map((v, index) => ({
               where: { id: v.id },
               create: {
                  id: v.id,
                  title: v.title,
                  author: v.channel?.name ?? 'Unknown Author',
                  duration: v.duration || 0,
                  views: v.viewCount || 0,
                  publishedAt: v.uploadDate ? parseRelative(v.uploadDate) : new Date(),
                  thumbnailUrl: v.thumbnails[0]?.url || '',
                  index,
               },
            })),
         },
      },
      include: trackWithRelations,
   })
   return masterTrack
}
