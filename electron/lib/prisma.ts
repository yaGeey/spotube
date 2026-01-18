import 'dotenv/config'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { Prisma, PrismaClient } from '@/generated/prisma/client'

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
