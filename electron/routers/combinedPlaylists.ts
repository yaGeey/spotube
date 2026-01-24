import z from 'zod'
import { publicProcedure, router } from '../trpc'
import prisma, { playlistWithDeepRelations } from '../lib/prisma'
import { inferRouterOutputs } from '@trpc/server'

export const combinedPlaylistsRouter = router({
   create: publicProcedure
      .input(
         z.object({
            title: z.string(),
            description: z.string().optional(),
            thumbnailUrl: z.string().optional(),
            playlistIds: z.array(z.number()),
         }),
      )
      .mutation(async ({ input }) => {
         return await prisma.combinedPlaylist.create({
            data: {
               title: input.title,
               description: input.description,
               playlists: { connect: input.playlistIds.map((id) => ({ id })) },
            },
         })
      }),

   getById: publicProcedure.input(z.number()).query(async ({ input: combinedPlaylistId }) => {
      return await prisma.combinedPlaylist.findUnique({
         where: { id: combinedPlaylistId },
         include: { playlists: { include: playlistWithDeepRelations } },
      })
   }),

   getAll: publicProcedure.query(async () => {
      return await prisma.combinedPlaylist.findMany({
         include: { playlists: { include: playlistWithDeepRelations } },
      })
   }),

   addPlaylistToCombined: publicProcedure
      .input(z.object({ combinedPlaylistId: z.number(), playlistId: z.number() }))
      .mutation(async ({ input }) => {
         return await prisma.combinedPlaylist.update({
            where: { id: input.combinedPlaylistId },
            data: {
               playlists: { connect: { id: input.playlistId } },
            },
         })
      }),

   delete: publicProcedure.input(z.number()).mutation(async ({ input: combinedPlaylistId }) => {
      // TODO onCacade?
      return await prisma.combinedPlaylist.delete({
         where: { id: combinedPlaylistId },
      })
   }),
})

type CombinedPlaylistsRouterOutputs = inferRouterOutputs<typeof combinedPlaylistsRouter>
export type CombinedPlaylistWithRelations = CombinedPlaylistsRouterOutputs['getById']