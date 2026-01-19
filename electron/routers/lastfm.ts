import z from 'zod'
import { getLastFMAlbum, getLastFMArtist, getLastFMTrack, upsertLastFMEntry } from '../lib/lastfm'
import { publicProcedure, router } from '../trpc'
import pLimit from 'p-limit'
import chalk from 'chalk'
import prisma, { TrackWithRelations } from '../lib/prisma'
import { LastFM, Prisma } from '@/generated/prisma/client'
const limit = pLimit(10)

export const lastFMRouter = router({
   upsertBatchFromMasterTracks: publicProcedure.input(z.array(z.custom<TrackWithRelations>())).mutation(async ({ input }) => {
      const results = await Promise.allSettled(
         input.map((t, i) =>
            limit(async () => {
               // artists
               for (const artist of t.artists) {
                  const artistKey = {
                     name: artist.name,
                     spotifyId: artist.spotifyId,
                     ytChannelId: artist.ytChannelId,
                  } satisfies Prisma.ArtistNameSpotifyIdYtChannelIdCompoundUniqueInput

                  // created
                  const cachedArtist = await prisma.artist.findUnique({
                     where: { name_spotifyId_ytChannelId: artistKey },
                  })
                  if (!cachedArtist || cachedArtist.lastFM) continue

                  // fetch api
                  const artistData = await getLastFMArtist(artist.name)
                  if (!artistData) continue

                  // update item
                  await prisma.artist.update({
                     where: { name_spotifyId_ytChannelId: artistKey },
                     data: { lastFM: artistData },
                  })
               }

               // track
               const existing = await prisma.lastFM.findUnique({
                  where: { masterTrackId: t.id },
               })
               if (!existing) {
                  // several artists, try each
                  for (const artist of t.artists) {
                     const trackData = await getLastFMTrack(artist.name, t.title)
                     if (!trackData) continue
                     const albumData = trackData?.album?.title ? await getLastFMAlbum(artist.name, trackData.album.title) : null

                     if (trackData || albumData) {
                        await prisma.lastFM.create({
                           data: {
                              track: trackData ?? undefined,
                              album: albumData ?? undefined,
                              masterTrack: { connect: { id: t.id } },
                           },
                        })
                        break // stop after first successful fetch
                     }
                  }
               }

               if ((i + 1) % 50 === 0) console.log(chalk.gray(`${i + 1}/${input.length}`))
            }),
         ),
      )
      console.log(
         chalk.blue(
            `Upserted LastFM data for ${results.filter((r) => r.status === 'fulfilled').length}/${results.length} entries`,
         ),
      )
      return true
   }),

   upsertArtists: publicProcedure
      .input(z.array(z.object({ name: z.string(), spotifyId: z.string(), ytChannelId: z.string() })))
      .mutation(async ({ input }) => {
         const results = await Promise.allSettled(
            input.map((item) =>
               limit(async () => {
                  const artistData = await getLastFMArtist(item.name)
                  if (!artistData) return null
                  // upsert to db
                  const upserted = await prisma.artist.update({
                     where: {
                        name_spotifyId_ytChannelId: {
                           name: item.name,
                           spotifyId: item.spotifyId,
                           ytChannelId: item.ytChannelId,
                        },
                     },
                     data: {
                        lastFM: artistData,
                     },
                  })
                  return upserted
               }),
            ),
         )
         console.log(
            chalk.blue(`Upserted LastFM for ${results.filter((r) => r.status === 'fulfilled').length}/${results.length} artists`),
         )
         return results
      }),
})
