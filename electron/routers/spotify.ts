import z from 'zod'
import { publicProcedure, router } from '../trpc'
import { getSpotifyToken } from '../lib/spotify'
import api from '../lib/axios'
import prisma, { playlistWithDeepRelations, PlaylistWithItems } from '../lib/prisma'
import chalk from 'chalk'
import { PlaylistItem, Prisma } from '@/generated/prisma/client'
import { chunkArray } from '@/utils/arrays'

export const spotifyRouter = router({
   upsertPlaylistWithTracks: publicProcedure
      .input(z.string())
      .mutation(async ({ input: playlistId }): Promise<PlaylistWithItems> => {
         const accessToken = await getSpotifyToken().then((res) => res?.access_token)
         if (!accessToken) throw new Error('No Spotify access token available')

         // fetch playlist with metadata
         const { data: playlistRes } = await api.get<SpotifyApi.SinglePlaylistResponse>(
            `https://api.spotify.com/v1/playlists/${playlistId}`,
            {
               headers: { Authorization: `Bearer ${accessToken}` },
            },
         )

         // check for existing playlist and snapshot
         const existingPlaylist = await prisma.playlist.findFirst({
            where: {
               spotifyMetadataId: playlistRes.id,
            },
            include: playlistWithDeepRelations,
         })
         if (existingPlaylist?.spotifyMetadata?.snapshotId === playlistRes.snapshot_id) {
            return existingPlaylist
         }

         // upsert playlist
         const prismaPlaylist = await prisma.playlist.upsert({
            where: {
               spotifyMetadataId: playlistRes.id,
            },
            update: {
               title: playlistRes.name,
               description: playlistRes.description,
               thumbnailUrl: playlistRes.images[0]?.url,
               spotifyMetadata: {
                  update: {
                     snapshotId: playlistRes.snapshot_id,
                     fullResponse: playlistRes,
                  },
               },
            },
            create: {
               title: playlistRes.name,
               description: playlistRes.description,
               thumbnailUrl: playlistRes.images[0]?.url,
               origin: 'SPOTIFY',
               url: playlistRes.external_urls.spotify,
               spotifyMetadata: {
                  create: {
                     id: playlistRes.id,
                     fullResponse: playlistRes,
                     snapshotId: playlistRes.snapshot_id,
                  },
               },
            },
         })
         console.log(chalk.blue(`Upserted Spotify playlist ${playlistRes.name} (${playlistRes.id})`))

         // fetch tracks with pagination
         const tracks = [...playlistRes.tracks.items]
         let pagingObject = playlistRes.tracks
         while (pagingObject.next) {
            const res = await api.get(pagingObject.next, {
               headers: { Authorization: `Bearer ${accessToken}` },
            })
            pagingObject = res.data
            tracks.push(...pagingObject.items)
         }
         console.log(chalk.blue(`Fetched ${tracks.length} tracks. ${tracks.filter((t) => t.track?.id).length} available.`))

         // check for existing master tracks to avoid duplicates
         const uniqueSpotifyIds = new Set(
            tracks.map((t) => t.track?.id).filter((id): id is string => typeof id === 'string' && id.length > 0),
         )

         // batching to avoid too many parameters error
         const chunked = chunkArray(Array.from(uniqueSpotifyIds), 500)
         const existingMasterTracks: { id: number; spotify: { id: string } | null }[] = []
         for (const chunk of chunked) {
            const result = await prisma.masterTrack.findMany({
               where: {
                  spotify: {
                     id: { in: chunk },
                  },
               },
               select: { id: true, spotify: { select: { id: true } } },
            })
            existingMasterTracks.push(...result)
         }
         // spotify track id -> master track
         const tracksMap = new Map(existingMasterTracks.map((t) => [t.spotify!.id, t.id]))

         // create other master track
         for (const item of tracks) {
            const id = item.track?.id
            if (id && item.track && !tracksMap.has(id)) {
               const newTrack = await prisma.masterTrack.create({
                  data: {
                     title: item.track.name,
                     artists: item.track.artists.map((a) => a.name).join(', '),
                     thumbnailUrl: item.track.album.images[0]?.url,
                     spotify: {
                        //TODO connect because spotifyTrack can already exist as orphaned record (fix this)
                        connectOrCreate: {
                           where: { id },
                           create: {
                              id,
                              title: item.track.name,
                              fullResponse: item.track,
                           },
                        },
                     },
                  },
               })
               tracksMap.set(id, newTrack.id)
            }
         }

         await prisma.$transaction([
            // clear existing playlist items (spotify playlist containt addet_at, it's not ours)
            prisma.playlistItem.deleteMany({
               where: { playlistId: prismaPlaylist.id },
            }),

            // create playlist items
            prisma.playlistItem.createMany({
               data: tracks
                  .map((item, index) => {
                     const mTrackId = tracksMap.get(item.track?.id || '')
                     if (!mTrackId) return null
                     return {
                        playlistId: prismaPlaylist.id,
                        addedAt: item.added_at ? new Date(item.added_at) : new Date(),
                        trackId: mTrackId,
                        position: index,
                     } satisfies Prisma.PlaylistItemCreateManyInput
                  })
                  .filter((t) => t !== null),
            }),
         ])

         // fetch and return the complete playlist with all relations
         const completePlaylist = await prisma.playlist.findUniqueOrThrow({
            where: { id: prismaPlaylist.id },
            include: playlistWithDeepRelations,
         })

         return completePlaylist
      }),

   getPlaylists: publicProcedure.query(async () => {
      const playlists = await prisma.playlist.findMany({
         where: {
            origin: 'SPOTIFY',
         },
         include: playlistWithDeepRelations,
         orderBy: { createdAt: 'desc' },
      })
      return playlists
   }),

   deletePlaylist: publicProcedure.input(z.string()).mutation(async ({ input: spotifyId }) => {
      return await prisma.$transaction(async (tx) => {
         const playlist = await tx.playlist.findUniqueOrThrow({
            where: { spotifyMetadataId: spotifyId },
         })
         console.log(chalk.blue(`Deleting Spotify playlist ${playlist.title} (${spotifyId})`))

         const tracksToDelete = await tx.masterTrack.findMany({
            where: {
               playlistItems: {
                  every: { playlistId: playlist.id },
                  some: { playlistId: playlist.id },
               },
            },
         })
         console.log(
            chalk.blue(`Found ${tracksToDelete.length} tracks to delete (${tracksToDelete.map((t) => t.id).join(', ')})`),
         )

         // delete SpotifyPlaylist -> Playlist -> PlaylistItem
         await tx.spotifyPlaylist.deleteMany({
            where: { id: spotifyId },
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
})
