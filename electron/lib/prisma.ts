import 'dotenv/config'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { Prisma, PrismaClient } from '@/generated/prisma/client'
import chalk from 'chalk'

const connectionString = `${process.env.DATABASE_URL}`

const adapter = new PrismaBetterSqlite3({ url: connectionString })
const prisma = new PrismaClient({ adapter })

export default prisma

export const trackWithRelations = {
   spotify: true,
   yt: {
      orderBy: { index: 'asc' },
   },
   genius: true,
   lastFM: true,
   artists: true
} satisfies Prisma.MasterTrackInclude

export const playlistWithDeepRelations = {
   spotifyMetadata: true,
   youtubeMetadata: true,
   playlistItems: {
      include: {
         track: {
            include: trackWithRelations,
         },
      },
   },
} satisfies Prisma.PlaylistInclude

export type PlaylistWithItems = Prisma.PlaylistGetPayload<{
   include: typeof playlistWithDeepRelations
}>
export type TrackWithRelations = Prisma.MasterTrackGetPayload<{
   include: typeof trackWithRelations
}>
export type PlaylistItemWithRelations = Prisma.PlaylistItemGetPayload<{
   include: {
      track: {
         include: typeof trackWithRelations
      }
   }
}>

export const cleanOrpanedMasterTracks = async (tracksIds: number[]) => {
   const orphanedTracks = await prisma.masterTrack.findMany({
      where: {
         id: { in: tracksIds },
         playlistItems: { none: {} }, // Жодного запису в playlistItems
      },
      select: { id: true },
   })

   if (orphanedTracks.length > 0) {
      await prisma.masterTrack.deleteMany({
         where: {
            id: { in: orphanedTracks.map((t) => t.id) },
         },
      })
      console.log(chalk.gray(`Cleaned up ${orphanedTracks.length} orphaned MasterTracks`))
   }

}