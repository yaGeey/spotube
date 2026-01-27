import z from 'zod'
import { publicProcedure, router } from '../trpc'
import prisma, { playlistWithDeepRelations, PlaylistWithItems } from '../lib/prisma'
import chalk from 'chalk'
import { YoutubeVideo } from '@/generated/prisma/client'

export const playlistsRouter = router({
   getById: publicProcedure.input(z.number()).query(async ({ input: playlistId }): Promise<PlaylistWithItems | null> => {
      return await prisma.playlist.findUnique({
         where: { id: playlistId },
         include: playlistWithDeepRelations,
      })
   }),

   getAll: publicProcedure.query(async () => {
      return await prisma.playlist.findMany({
         include: playlistWithDeepRelations,
      })
   }),

   createLocal: publicProcedure
      .input(z.object({ title: z.string().optional(), description: z.string().optional() }))
      .mutation(async ({ input }) => {
         const newPlaylist = await prisma.playlist.create({
            data: {
               title: input.title || 'New Playlist',
               description: input.description || '',
               origin: 'LOCAL',
            },
         })
         return newPlaylist
      }),

   covertToLocalAsNew: publicProcedure.input(z.number()).mutation(async ({ input: playlistId }) => {
      // get current pl data
      const existingPlaylist = await prisma.playlist.findUnique({
         where: { id: playlistId },
         include: playlistWithDeepRelations,
      })
      if (!existingPlaylist) throw new Error('Playlist not found')

      // create new local playlist
      const newLocal = await prisma.playlist.create({
         data: {
            title: existingPlaylist.title,
            description: existingPlaylist.description,
            thumbnailUrl: existingPlaylist.thumbnailUrl,
            origin: 'LOCAL',
         },
      })

      // copy items
      const newItemsData = existingPlaylist.playlistItems.map((item) => ({
         trackId: item.trackId,
         playlistId: newLocal.id,
         addedAt: item.addedAt,
         position: item.position,
      }))
      await prisma.playlistItem.createMany({
         data: newItemsData,
      })

      const finalPlaylist = await prisma.playlist.findUnique({
         where: { id: newLocal.id },
         include: playlistWithDeepRelations,
      })
      return finalPlaylist
   }),

   covertToLocalInPlace: publicProcedure.input(z.number()).mutation(async ({ input: playlistId }) => {
      const updated = await prisma.playlist.update({
         where: { id: playlistId },
         data: {
            origin: 'LOCAL',
            spotifyMetadataId: null,
            youtubeMetadataId: null,
         },
      })
      return updated
   }),

   // TODO delete oprhans? func exists
   deleteTracks: publicProcedure
      .input(z.object({ playlistId: z.number(), tracksIds: z.array(z.number()) }))
      .mutation(async ({ input }) => {
         await originPlCheck(input.playlistId)

         await prisma.playlistItem.deleteMany({
            where: {
               playlistId: input.playlistId,
               trackId: { in: input.tracksIds },
            },
         })
         console.log(chalk.green(`Deleted ${input.tracksIds.length} tracks from playlist ${input.playlistId}`))
      }),

   // TODO position handling
   // TODO "Track already exists in playlist. Add anyway?"
   // -> [tId, null, tId, tId]: null - exists in playlist
   addTracks: publicProcedure
      .input(
         z.object({
            playlistId: z.number(),
            tracksId: z.array(z.number()),
            addAnyway: z.boolean().optional().default(false),
         }),
      )
      .mutation(async ({ input }) => {
         await originPlCheck(input.playlistId)
         if (input.tracksId.length === 0) return []
         if (input.addAnyway) console.log(chalk.blue('ignoring duplicates check'))

         // check existing tracks in playlist
         const existingItems = await prisma.playlistItem.findMany({
            where: {
               playlistId: input.playlistId,
               trackId: { in: input.tracksId },
            },
            select: { trackId: true },
         })
         const existingTrackIds = new Set(existingItems.map((item) => item.trackId))

         // add tracks
         const result = []
         for (const [index, trackId] of input.tracksId.entries()) {
            if (existingTrackIds.has(trackId) && !input.addAnyway) {
               console.log(chalk.yellow(`Track ${trackId} already exists in playlist ${input.playlistId}, skipping.`))
               result.push(null)
               continue
            }
            const newItem = await prisma.playlistItem.create({
               data: {
                  playlistId: input.playlistId,
                  trackId: trackId,
                  position: index + existingTrackIds.size,
               },
            })
            result.push(newItem.id)
         }
         return result
      }),

   //
   addYtVideo: publicProcedure
      .input(
         z.object({ playlistId: z.number(), data: z.custom<YoutubeVideo>(), addAnyway: z.boolean().optional().default(false) }),
      )
      .mutation(async ({ input }) => {
         await originPlCheck(input.playlistId)
         const v = input.data

         // check if exists in playlist
         const existingItem = await prisma.playlistItem.findFirst({
            where: {
               playlistId: input.playlistId,
               track: { yt: { some: { id: v.id }, every: { id: v.id } } },
            },
         })
         if (existingItem && !input.addAnyway) {
            console.log('Yt video already exists in playlist, skipping addition', v.id)
            return null
         }

         // check for existing track
         let masterTrack = await prisma.masterTrack.findFirst({
            where: { yt: { some: { id: v.id }, every: { id: v.id } } },
         })
         if (!masterTrack) {
            console.log('Creating new masterTrack for yt video', v.id)
            masterTrack = await prisma.masterTrack.create({
               data: {
                  title: v.title,
                  thumbnailUrl: v.thumbnailUrl,
                  artists: {
                     connectOrCreate: {
                        where: { name_spotifyId_ytChannelId: { name: v.author, spotifyId: '', ytChannelId: v.authorId ?? '' } },
                        create: { name: v.author, ytChannelId: v.authorId ?? '' },
                     },
                  },
                  yt: {
                     connectOrCreate: {
                        where: { id: v.id },
                        create: { ...v },
                     },
                  },
               },
            })
         }

         // count items in playlist
         const itemCount = await prisma.playlistItem.count({
            where: { playlistId: input.playlistId },
         })
         console.log('Current playlist item count:', itemCount)

         // create playlistitem and add to playlist
         await prisma.playlist.update({
            where: { id: input.playlistId },
            data: {
               playlistItems: {
                  create: {
                     track: { connect: { id: masterTrack.id } },
                     addedAt: new Date(),
                     position: itemCount + 1,
                  },
               },
            },
         })
      }),

   deleteLocal: publicProcedure.input(z.number()).mutation(async ({ input: playlistId }) => {
      const deleted = await prisma.playlist.deleteMany({
         where: {
            id: playlistId,
            origin: 'LOCAL',
         },
      })
      if (deleted.count === 0) throw new Error('Can only delete local playlists')
   }),
})

async function originPlCheck(id: number) {
   const curPl = await prisma.playlist.findUnique({
      where: { id },
   })
   if (curPl?.origin !== 'LOCAL') throw new Error('Can only add tracks to local playlists')
}
