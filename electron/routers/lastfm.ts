import z from 'zod'
import { upsertLastFMEntry } from '../lib/lastfm'
import { publicProcedure, router } from '../trpc'
import pLimit from 'p-limit'
import chalk from 'chalk'
const limit = pLimit(10)

export const lastFMRouter = router({
   upsertBatch: publicProcedure
      .input(z.array(z.object({ masterId: z.number(), artist: z.string(), title: z.string() })))
      .mutation(async ({ input }) => {
         const results = await Promise.allSettled(
            input.map((item) =>
               limit(async () => {
                  return await upsertLastFMEntry(item)
               }),
            ),
         )
         console.log(
            chalk.blue(
               `Upserted LastFM data for ${results.filter((r) => r.status === 'fulfilled').length}/${results.length} tracks`,
            ),
         )
         return results
      }),
})
