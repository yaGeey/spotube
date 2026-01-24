import z from 'zod'
import { publicProcedure, router } from '../trpc'
import prisma, { playlistWithDeepRelations, PlaylistWithItems } from '../lib/prisma'

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
})
