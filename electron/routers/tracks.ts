import prisma from '../lib/prisma'
import { publicProcedure, router } from '../trpc'
import { z } from 'zod'

export const tracksRouter = router({
   updateDefaultVideo: publicProcedure
      .input(
         z.object({
            trackId: z.number(),
            youtubeVideoId: z.string(),
         })
      )
      .mutation(async ({ input: { trackId, youtubeVideoId } }) => {
         return await prisma.masterTrack.update({
            where: { id: trackId },
            data: { defaultYtVideoId: youtubeVideoId },
         })
      }),
})
